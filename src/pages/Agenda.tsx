import calendarData from '../../data/calendar.json'
import tasksData from '../../data/tasks.json'
import type { CalendarData, CalendarEvent } from '../types/calendar'
import type { TaskData, Task } from '../types/tasks'
import { formatHour, upcomingHours, weatherIcon } from '../weather'

export function Agenda() {
  const data = calendarData as CalendarData
  const taskData = tasksData as TaskData

  if (data.error && taskData.error) {
    return (
      <div className="space-y-2 mt-4">
        <div className="text-sm text-gray-600">
          Calendar Error: {data.error}
        </div>
        <div className="text-sm text-gray-600">
          Tasks Error: {taskData.error}
        </div>
      </div>
    )
  }

  // Get today and tomorrow dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

  // Filter events for today and tomorrow; today's finished events go to
  // the bottom of the page
  const now = new Date()
  const todayEvents: CalendarEvent[] = []
  const pastTodayEvents: CalendarEvent[] = []
  const tomorrowEvents: CalendarEvent[] = []

  data.events.forEach(event => {
    const eventDate = new Date(event.startDate)
    eventDate.setHours(0, 0, 0, 0)

    if (eventDate.getTime() === today.getTime()) {
      if (!event.isAllDay && new Date(event.endDate) <= now) {
        pastTodayEvents.push(event)
      } else {
        todayEvents.push(event)
      }
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      tomorrowEvents.push(event)
    }
  })

  // Filter tasks for overdue, today, and tomorrow
  const overdueTasks: Task[] = []
  const todayTasks: Task[] = []
  const tomorrowTasks: Task[] = []
  const noDueDateTasks: Task[] = []

  taskData.tasks.forEach(task => {
    if (task.isOverdue) {
      overdueTasks.push(task)
    } else if (task.dueDate) {
      const taskDate = new Date(task.dueDate)
      taskDate.setHours(0, 0, 0, 0)

      if (taskDate.getTime() === today.getTime()) {
        todayTasks.push(task)
      } else if (taskDate.getTime() === tomorrow.getTime()) {
        tomorrowTasks.push(task)
      }
    } else {
      noDueDateTasks.push(task)
    }
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // End time, with the date when the event ends on another day
  const formatEnd = (event: CalendarEvent) => {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    if (start.toDateString() === end.toDateString()) return formatTime(event.endDate)
    return end.toLocaleString('de-DE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderEvent = (event: CalendarEvent) => (
    <div
      key={event.id}
      className="text-sm border-b border-gray-300 last:border-0 flex gap-2 pb-1"
    >
      <div className="flex-1">
        <div className="flex flex-row font-semibold gap-2 text-2xl">
          {!event.isAllDay && (
            <div className="tabular-nums text-gray-700 font-normal">
              {formatTime(event.startDate)}
            </div>
          )}
          <div className="font-semibold">{event.title}</div>
        </div>
        {!event.isAllDay && (
          <div className="text-gray-700 text-sm">
            until {formatEnd(event)}
          </div>
        )}
        {event.location && (
          <div className="text-gray-600 text-xs">{event.location}</div>
        )}
      </div>
    </div>
  )

  const renderPastEvent = (event: CalendarEvent) => (
    <div key={event.id} className="flex gap-2 text-gray-500 text-sm">
      <span className="tabular-nums">
        {formatTime(event.startDate)}–{formatEnd(event)}
      </span>
      <span>{event.title}</span>
    </div>
  )

  // Next hours as a narrow column beside the agenda, so it costs no height
  const renderHours = () => (
    <div className="shrink-0 pt-3 space-y-1 text-sm">
      {upcomingHours(12).map(hour => {
        const Icon = weatherIcon(hour.weatherCode)
        return (
          <div key={hour.time} className="flex items-center gap-2 tabular-nums">
            <span className="text-gray-600">{formatHour(hour.time)}</span>
            <Icon className="w-4 h-4" />
            <span className="w-7 text-right font-semibold">{Math.round(hour.temperature)}°</span>
          </div>
        )
      })}
    </div>
  )

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className="text-sm border-b border-gray-300 last:border-0 flex gap-2 pb-1"
    >
      <div className="text-2xl">☐</div>
      <div className="flex-1">
        <div className={`text-2xl ${task.isOverdue ? 'text-red-700 font-semibold' : ''}`}>
          {task.title}
          {task.isOverdue && ' ⚠️'}
        </div>
        {task.notes && (
          <div className="text-gray-600 mt-1 text-sm">{task.notes}</div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full flex gap-4 pl-4">
    <div className="flex-1 min-w-0 flex flex-col pt-2">
      <div className="flex-1 min-h-0 overflow-hidden space-y-3">
      {/* Overdue tasks section */}
      {overdueTasks.length > 0 && (
        <div>
          <h2 className="font-bold text-red-700 text-xl mb-1">Overdue</h2>
          <div className="space-y-2">{overdueTasks.map(renderTask)}</div>
        </div>
      )}

      {/* Always show Today section */}
      <div>
        <h2 className="font-bold text-gray-900 text-xl mb-1">Today</h2>
        {todayEvents.length > 0 || todayTasks.length > 0 ? (
          <div className="space-y-2">
            {todayEvents.length > 0 && (
              <div className="space-y-2">{todayEvents.map(renderEvent)}</div>
            )}
            {todayTasks.length > 0 && (
              <div>
                {todayEvents.length > 0 && (
                  <h3 className="font-semibold mb-2 text-gray-700 text-lg mt-2">Tasks</h3>
                )}
                <div className="space-y-2">{todayTasks.map(renderTask)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 font-normal text-3xl">
            {pastTodayEvents.length > 0 ? 'Nothing else today' : 'Nothing scheduled for today'} ☺️
          </div>
        )}
      </div>

      {/* Only show Tomorrow if there are events or tasks */}
      {(tomorrowEvents.length > 0 || tomorrowTasks.length > 0) && (
        <div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">Tomorrow</h2>
          <div className="space-y-2">
            {tomorrowEvents.length > 0 && (
              <div className="space-y-2">{tomorrowEvents.map(renderEvent)}</div>
            )}
            {tomorrowTasks.length > 0 && (
              <div>
                {tomorrowEvents.length > 0 && (
                  <h3 className="font-semibold mb-2 text-gray-700 text-lg mt-2">Tasks</h3>
                )}
                <div className="space-y-2">{tomorrowTasks.map(renderTask)}</div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {pastTodayEvents.length > 0 && (
        <div className="shrink-0 pt-2 pb-2">
          <h2 className="font-semibold text-gray-500 text-sm">Earlier today</h2>
          {pastTodayEvents.map(renderPastEvent)}
        </div>
      )}
    </div>
    {renderHours()}
    </div>
  );
}
