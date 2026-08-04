import calendarData from '../../data/calendar.json'
import tasksData from '../../data/tasks.json'
import type { CalendarData, CalendarEvent } from '../types/calendar'
import type { TaskData, Task } from '../types/tasks'

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

  // Filter events for today and tomorrow
  const todayEvents: CalendarEvent[] = []
  const tomorrowEvents: CalendarEvent[] = []

  data.events.forEach(event => {
    const eventDate = new Date(event.startDate)
    eventDate.setHours(0, 0, 0, 0)

    if (eventDate.getTime() === today.getTime()) {
      todayEvents.push(event)
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('de-DE', {
      month: 'short',
      day: 'numeric',
    })
  }

  const renderEvent = (event: CalendarEvent) => (
    <div
      key={event.id}
      className="text-sm border-b border-gray-300 pb-2 last:border-0 flex gap-2"
    >
      <div className="flex-1">
        <div className="flex flex-row font-semibold text-4xl gap-2">
          {!event.isAllDay && (
            <div className="tabular-nums text-gray-700 font-normal">
              {formatTime(event.startDate)}
            </div>
          )}
          <div className="font-semibold">{event.title}</div>
        </div>
        {!event.isAllDay && (
          <div className="text-gray-700 text-lg">
            {formatTime(event.startDate)} - {formatDate(event.endDate)}
          </div>
        )}
        {event.location && (
          <div className="text-gray-600 text-xs">{event.location}</div>
        )}
      </div>
    </div>
  )

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className="text-sm border-b border-gray-300 pb-2 last:border-0 flex gap-2"
    >
      <div className="text-3xl">☐</div>
      <div className="flex-1">
        <div className={`text-3xl ${task.isOverdue ? 'text-red-700 font-semibold' : ''}`}>
          {task.title}
          {task.isOverdue && ' ⚠️'}
        </div>
        {task.notes && (
          <div className="text-gray-600 text-lg mt-1">{task.notes}</div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 mt-4">
      {/* Overdue tasks section */}
      {overdueTasks.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-3 text-red-700">Overdue</h2>
          <div className="space-y-2">{overdueTasks.map(renderTask)}</div>
        </div>
      )}

      {/* Always show Today section */}
      <div>
        <h2 className="text-2xl font-bold mb-3 text-gray-900">Today</h2>
        {todayEvents.length > 0 || todayTasks.length > 0 ? (
          <div className="space-y-4">
            {todayEvents.length > 0 && (
              <div className="space-y-2">{todayEvents.map(renderEvent)}</div>
            )}
            {todayTasks.length > 0 && (
              <div>
                {todayEvents.length > 0 && (
                  <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-700">Tasks</h3>
                )}
                <div className="space-y-2">{todayTasks.map(renderTask)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-4xl font-normal">
            Nothing scheduled for today ☺️
          </div>
        )}
      </div>

      {/* Only show Tomorrow if there are events or tasks */}
      {(tomorrowEvents.length > 0 || tomorrowTasks.length > 0) && (
        <div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Tomorrow</h2>
          <div className="space-y-4">
            {tomorrowEvents.length > 0 && (
              <div className="space-y-2">{tomorrowEvents.map(renderEvent)}</div>
            )}
            {tomorrowTasks.length > 0 && (
              <div>
                {tomorrowEvents.length > 0 && (
                  <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-700">Tasks</h3>
                )}
                <div className="space-y-2">{tomorrowTasks.map(renderTask)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
