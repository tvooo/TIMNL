import * as dotenv from 'dotenv';
import * as fs from 'fs';
import ICAL from 'ical.js';
import * as path from 'path';
import { createDAVClient } from 'tsdav';

dotenv.config();

function parseCalendarObject(calendarObject) {
  try {
    const jcal = ICAL.parse(calendarObject.data);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent('vevent');

    if (!vevent) {
      return null;
    }

    const uid = vevent.getFirstPropertyValue('uid');
    const summary = vevent.getFirstPropertyValue('summary');
    const dtstart = vevent.getFirstPropertyValue('dtstart');
    const dtend = vevent.getFirstPropertyValue('dtend');
    const location = vevent.getFirstPropertyValue('location');

    if (!dtstart || !summary) {
      return null;
    }

    const isAllDay = dtstart.isDate;

    let endDate;
    if (dtend) {
      endDate = dtend.toJSDate().toISOString();
    } else {
      endDate = dtstart.toJSDate().toISOString();
    }

    return {
      id: uid || `event-${Date.now()}-${Math.random()}`,
      title: summary || 'Untitled Event',
      startDate: dtstart.toJSDate().toISOString(),
      endDate: endDate,
      isAllDay: isAllDay,
      location: location || undefined,
    };
  } catch (error) {
    console.warn('Failed to parse calendar object:', error.message);
    return null;
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

    let selectedCalendar = calendars[0];
    if (process.env.CALDAV_CALENDAR_NAME) {
      const found = calendars.find(cal =>
        cal.displayName === process.env.CALDAV_CALENDAR_NAME
      );
      if (found) {
        selectedCalendar = found;
        console.log(`Using calendar: ${selectedCalendar.displayName}`);
      } else {
        console.warn(`Calendar "${process.env.CALDAV_CALENDAR_NAME}" not found, using first calendar`);
      }
    } else {
      console.log(`Using first calendar: ${selectedCalendar.displayName}`);
    }

    const now = new Date();
    const oneWeekBeforeNow = new Date();
    oneWeekBeforeNow.setDate(now.getDate() - 7);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(now.getDate() + 14);

    console.log(
      `Fetching events from ${oneWeekBeforeNow.toLocaleDateString()} to ${twoWeeksFromNow.toLocaleDateString()}...`
    );
    const calendarObjects = await client.fetchCalendarObjects({
      calendar: selectedCalendar,
      timeRange: {
        start: oneWeekBeforeNow.toISOString(),
        end: twoWeeksFromNow.toISOString(),
      },
    });

    console.log(`Found ${calendarObjects.length} calendar object(s)`);

    const events = calendarObjects
      .map(obj => parseCalendarObject(obj))
      .filter(event => event !== null)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

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
