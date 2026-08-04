import * as dotenv from 'dotenv';
import * as fs from 'fs';
import ICAL from 'ical.js';
import * as path from 'path';
import { createDAVClient } from 'tsdav';

dotenv.config();

function parseTaskObject(taskObject) {
  try {
    const jcal = ICAL.parse(taskObject.data);
    const comp = new ICAL.Component(jcal);
    const vtodo = comp.getFirstSubcomponent('vtodo');

    if (!vtodo) {
      return null;
    }

    const uid = vtodo.getFirstPropertyValue('uid');
    const summary = vtodo.getFirstPropertyValue('summary');
    const due = vtodo.getFirstPropertyValue('due');
    const status = vtodo.getFirstPropertyValue('status');
    const priority = vtodo.getFirstPropertyValue('priority');
    const description = vtodo.getFirstPropertyValue('description');

    if (!summary) {
      return null;
    }

    // Check if task is completed
    const isCompleted = status === 'COMPLETED';

    // Parse due date if present
    let dueDate = undefined;
    if (due) {
      dueDate = due.toJSDate().toISOString();
    }

    return {
      id: uid || `task-${Date.now()}-${Math.random()}`,
      title: summary,
      dueDate: dueDate,
      isCompleted: isCompleted,
      priority: priority || undefined,
      notes: description || undefined,
    };
  } catch (error) {
    console.warn('Failed to parse task object:', error.message);
    return null;
  }
}

async function fetchTasks() {
  try {
    if (!process.env.APPLE_CALDAV_URL || !process.env.APPLE_CALDAV_USERNAME || !process.env.APPLE_CALDAV_PASSWORD) {
      throw new Error('Missing Apple CalDAV credentials in .env file (APPLE_CALDAV_URL, APPLE_CALDAV_USERNAME, APPLE_CALDAV_PASSWORD)');
    }

    console.log('Connecting to Apple CalDAV server...');
    const client = await createDAVClient({
      serverUrl: process.env.APPLE_CALDAV_URL,
      credentials: {
        username: process.env.APPLE_CALDAV_USERNAME,
        password: process.env.APPLE_CALDAV_PASSWORD,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    console.log('Fetching calendars (including task lists)...');
    const allCalendars = await client.fetchCalendars();

    if (allCalendars.length === 0) {
      throw new Error('No calendars/task lists found');
    }

    console.log(`\nFound ${allCalendars.length} total calendar(s)/task list(s):\n`);

    // Debug: Log all properties of each calendar
    allCalendars.forEach((cal, idx) => {
      console.log(`${idx + 1}. ${cal.displayName || 'Unnamed'}`);
      console.log(`   URL: ${cal.url}`);
      console.log(`   Components: ${JSON.stringify(cal.components || [])}`);
      console.log(`   ResourceType: ${JSON.stringify(cal.resourcetype || [])}`);
      console.log(`   CTag: ${cal.ctag || 'none'}`);
      console.log(`   Reports: ${JSON.stringify(cal.reports || [])}`);
      console.log('');
    });

    // Try filtering by URL pattern instead of components
    // Apple Reminders typically have 'tasks' in the URL
    const taskLists = allCalendars.filter(cal => {
      const url = cal.url || '';
      const displayName = cal.displayName || '';

      // Check if URL contains 'tasks' or if it has VTODO component
      const hasTasksInUrl = url.toLowerCase().includes('/tasks/');
      const components = cal.components || [];
      const hasVTodo = components.includes('VTODO');

      return hasTasksInUrl || hasVTodo;
    });

    console.log(`\nFound ${taskLists.length} potential task list(s):`);
    taskLists.forEach((cal, idx) => {
      console.log(`  ${idx + 1}. ${cal.displayName || cal.url}`);
    });

    // If no task lists found, use all calendars (for debugging)
    const calendarsToUse = taskLists.length > 0 ? taskLists : allCalendars;

    if (calendarsToUse.length === 0) {
      throw new Error('No calendars found');
    }

    // Find the task list (by name if specified, otherwise first one)
    let selectedCalendar = calendarsToUse[0];
    if (process.env.APPLE_CALDAV_TASKS_LIST) {
      const found = calendarsToUse.find(cal =>
        cal.displayName === process.env.APPLE_CALDAV_TASKS_LIST
      );
      if (found) {
        selectedCalendar = found;
        console.log(`\nUsing task list: ${selectedCalendar.displayName}`);
      } else {
        console.warn(`\nTask list "${process.env.APPLE_CALDAV_TASKS_LIST}" not found, using first list: ${selectedCalendar.displayName}`);
      }
    } else {
      console.log(`\nUsing first list: ${selectedCalendar.displayName}`);
    }

    // Fetch all calendar objects (this will include both VEVENTs and VTODOs)
    console.log('Fetching tasks...');
    const calendarObjects = await client.fetchCalendarObjects({
      calendar: selectedCalendar,
    });

    console.log(`Found ${calendarObjects.length} calendar object(s)`);

    // Parse all tasks
    const allTasks = calendarObjects
      .map(obj => parseTaskObject(obj))
      .filter(task => task !== null);

    console.log(`Parsed ${allTasks.length} task(s)`);

    // Filter for incomplete tasks due today, tomorrow, or overdue
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const filteredTasks = allTasks
      .filter(task => {
        // Skip completed tasks
        if (task.isCompleted) {
          return false;
        }

        // Include tasks without due dates (they're always relevant)
        if (!task.dueDate) {
          return true;
        }

        const dueDate = new Date(task.dueDate);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        // Include if due date is today, tomorrow, or in the past (overdue)
        return dueDateOnly <= dayAfterTomorrow;
      })
      .map(task => {
        // Mark overdue tasks
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          task.isOverdue = dueDateOnly < today;
        }
        return task;
      })
      .sort((a, b) => {
        // Sort by: overdue first, then by due date, then no due date last
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;

        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;

        return 0;
      });

    const output = {
      fetchedAt: new Date().toISOString(),
      tasks: filteredTasks,
    };

    const outputPath = path.join(process.cwd(), 'data/tasks.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`Successfully fetched ${filteredTasks.length} task(s) (${allTasks.length} total) and saved to ${outputPath}`);

    const overdueTasks = filteredTasks.filter(t => t.isOverdue).length;
    const todayTasks = filteredTasks.filter(t => {
      if (!t.dueDate || t.isOverdue) return false;
      const dueDate = new Date(t.dueDate);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      return dueDateOnly.getTime() === today.getTime();
    }).length;
    const tomorrowTasks = filteredTasks.filter(t => {
      if (!t.dueDate || t.isOverdue) return false;
      const dueDate = new Date(t.dueDate);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      return dueDateOnly.getTime() === tomorrow.getTime();
    }).length;
    const noDueDateTasks = filteredTasks.filter(t => !t.dueDate).length;

    console.log(`  - Overdue: ${overdueTasks}`);
    console.log(`  - Due today: ${todayTasks}`);
    console.log(`  - Due tomorrow: ${tomorrowTasks}`);
    console.log(`  - No due date: ${noDueDateTasks}`);
  } catch (error) {
    console.error('Error fetching tasks:', error.message);

    const errorOutput = {
      fetchedAt: new Date().toISOString(),
      tasks: [],
      error: error.message,
    };

    const outputPath = path.join(process.cwd(), 'data/tasks.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(errorOutput, null, 2));

    process.exit(1);
  }
}

fetchTasks();
