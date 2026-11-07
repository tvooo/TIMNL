import * as dotenv from 'dotenv';
import * as fs from 'fs';
import ICAL from 'ical.js';
import * as path from 'path';
import { createDAVClient } from 'tsdav';

dotenv.config();

// One calendar object holds an event, or a recurring event's master plus
// its modified occurrences (RECURRENCE-ID). Returns the occurrences that
// overlap the range.
function parseCalendarObject(calendarObject, rangeStart: Date, rangeEnd: Date) {
  try {
    const comp = new ICAL.Component(ICAL.parse(calendarObject.data));
    for (const vtimezone of comp.getAllSubcomponents('vtimezone')) {
      ICAL.TimezoneService.register(vtimezone);
    }

    const vevents = comp.getAllSubcomponents('vevent');
    const master = vevents.find((vevent) => !vevent.hasProperty('recurrence-id')) ?? vevents[0];
    if (!master) {
      return [];
    }

    const event = new ICAL.Event(master);
    for (const exception of vevents) {
      if (exception !== master) event.relateException(exception);
    }
    if (!event.startDate || !event.summary) {
      return [];
    }

    const occurrences = [];
    const add = (item, start, end) => {
      const startDate = start.toJSDate();
      const endDate = (end ?? start).toJSDate();
      if (startDate >= rangeEnd || endDate <= rangeStart) return;
      occurrences.push({
        id: `${event.uid}-${start.toString()}`,
        title: item.summary || 'Untitled Event',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isAllDay: start.isDate,
        location: item.location || undefined,
      });
    };

    if (!event.isRecurring()) {
      add(event, event.startDate, event.endDate);
      return occurrences;
    }

    const iterator = event.iterator();
    for (let next = iterator.next(); next && next.toJSDate() < rangeEnd; next = iterator.next()) {
      const details = event.getOccurrenceDetails(next);
      add(details.item, details.startDate, details.endDate);
    }
    return occurrences;
  } catch (error) {
    console.warn('Failed to parse calendar object:', error.message);
    return [];
  }
}

async function fetchCalendarEvents() {
  try {
    if (!process.env.CALDAV_URL || !process.env.CALDAV_USERNAME || !process.env.CALDAV_PASSWORD) {
      throw new Error('Missing CalDAV credentials in .env file (CALDAV_URL, CALDAV_USERNAME, CALDAV_PASSWORD)');
    }

    console.log('Connecting to CalDAV server...');
    const client = await createDAVClient({
      serverUrl: process.env.CALDAV_URL,
      credentials: {
        username: process.env.CALDAV_USERNAME,
        password: process.env.CALDAV_PASSWORD,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    console.log('Fetching calendars...');
    const calendars = await client.fetchCalendars();

    if (calendars.length === 0) {
      throw new Error('No calendars found');
    }

    console.log(`Found ${calendars.length} calendar(s)`);
    calendars.forEach((cal, idx) => {
      console.log(`  ${idx + 1}. ${cal.displayName || cal.url}`);
    });

    // Comma-separated list of calendar names; the first calendar if unset
    const names = (process.env.CALDAV_CALENDAR_NAME || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const selectedCalendars = names.length
      ? calendars.filter((cal) => names.includes(cal.displayName))
      : [calendars[0]];
    for (const name of names) {
      if (!calendars.some((cal) => cal.displayName === name)) {
        console.warn(`Calendar "${name}" not found`);
      }
    }
    if (selectedCalendars.length === 0) {
      throw new Error(`None of the calendars "${names.join('", "')}" found`);
    }
    console.log(`Using calendars: ${selectedCalendars.map((cal) => cal.displayName).join(', ')}`);

    const now = new Date();
    const oneWeekBeforeNow = new Date();
    oneWeekBeforeNow.setDate(now.getDate() - 7);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(now.getDate() + 14);

    console.log(
      `Fetching events from ${oneWeekBeforeNow.toLocaleDateString()} to ${twoWeeksFromNow.toLocaleDateString()}...`
    );
    const events = [];
    for (const calendar of selectedCalendars) {
      const calendarObjects = await client.fetchCalendarObjects({
        calendar,
        timeRange: {
          start: oneWeekBeforeNow.toISOString(),
          end: twoWeeksFromNow.toISOString(),
        },
      });
      console.log(`${calendar.displayName}: ${calendarObjects.length} calendar object(s)`);
      for (const obj of calendarObjects) {
        events.push(...parseCalendarObject(obj, oneWeekBeforeNow, twoWeeksFromNow));
      }
    }
    events.sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));

    const output = {
      fetchedAt: new Date().toISOString(),
      events: events,
    };

    const outputPath = path.join(process.cwd(), 'data/calendar.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`Successfully fetched ${events.length} event(s) and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error fetching calendar:', error.message);

    const errorOutput = {
      fetchedAt: new Date().toISOString(),
      events: [],
      error: error.message,
    };

    const outputPath = path.join(process.cwd(), 'data/calendar.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(errorOutput, null, 2));

    process.exit(1);
  }
}

fetchCalendarEvents();
