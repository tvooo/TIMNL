import calendarData from '../../data/calendar.json'
import type { CalendarData, CalendarEvent } from '../types/calendar'

export function Week() {
  const data = calendarData as CalendarData

  if (data.error) {
    return (
      <div className="space-y-2 mt-4">
        <div className="text-sm text-gray-600">Error: {data.error}</div>
      </div>
    )
  }

  // Get start of current week (Monday)
  const today = new Date()
  const currentDay = today.getDay()
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  // Generate array of 7 days starting from Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })

  // Get next week's events (Monday to Sunday of next week)
  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  const nextSunday = new Date(nextMonday)
  nextSunday.setDate(nextMonday.getDate() + 6)
  nextSunday.setHours(23, 59, 59, 999)

  // Group events by day
  const eventsByDay = new Map<string, CalendarEvent[]>()
  const nextWeekEvents: CalendarEvent[] = []

  data.events.forEach(event => {
    const eventDate = new Date(event.startDate)
    eventDate.setHours(0, 0, 0, 0)

    // Check if event is next week
    if (eventDate >= nextMonday && eventDate <= nextSunday) {
      nextWeekEvents.push(event)
      return
    }

    // Group by day for current week
    weekDays.forEach(day => {
      const dayKey = day.toISOString().split('T')[0]
      const eventKey = eventDate.toISOString().split('T')[0]
      if (dayKey === eventKey) {
        if (!eventsByDay.has(dayKey)) {
          eventsByDay.set(dayKey, [])
        }
        eventsByDay.get(dayKey)!.push(event)
      }
    })
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isToday = (day: Date) => {
    return day.toDateString() === today.toDateString()
  }

  const renderDayCell = (day: Date, index: number) => {
    const dayKey = day.toISOString().split('T')[0]
    const events = eventsByDay.get(dayKey) || []

    return (
      <div key={index} className="p-2 compact:p-1.5">
        <div className="font-bold text-lg mb-2 compact:mb-1">
          {day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
        </div>
        <div className="space-y-1 compact:space-y-0">
          {events.length === 0 ? (
            <div className="text-gray-400 text-md" />
          ) : (
            events.map(event => (
              <div key={event.id} className="text-md compact:text-sm">
                {!event.isAllDay && (
                  <span className="text-gray-600 text-xs mr-1 tabular-nums">
                    {formatTime(event.startDate)}
                  </span>
                )}
                <span className="font-medium">{event.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderNextWeekCell = () => {
    return (
      <div className="p-4 compact:px-2 compact:py-1.5">
        <div className="font-bold text-lg mb-2 compact:mb-1">Next Week</div>
        {nextWeekEvents.length === 0 ? (
          <div className="text-gray-400 text-sm">—</div>
        ) : (
          <div className="columns-2 gap-x-4">
            {nextWeekEvents.map(event => (
              <div key={event.id} className="text-sm font-medium mb-1 break-inside-avoid">
                <span className="text-gray-600 text-xs mr-1">
                  {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                {event.title}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    // Weekdays on top; Saturday, Sunday and next week below
    <div className="h-full w-full grid grid-cols-5 grid-rows-2 compact:grid-rows-[auto_auto] gap-px bg-grayx-400 py-2 pl-1">
      {weekDays.map((day, index) => (
        // Light grey rounds to white on 4-grey panels, so compact outlines today instead
        <div
          key={index}
          className={isToday(day) ? 'bg-gray-200 rounded-2xl compact:bg-white compact:border-2 compact:border-black' : 'bg-white'}
        >
          {renderDayCell(day, index)}
        </div>
      ))}
      <div className="bg-white col-span-3">
        {renderNextWeekCell()}
      </div>
    </div>
  )
}
