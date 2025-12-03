export interface CalendarEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  isAllDay: boolean
  location?: string
}

export interface CalendarData {
  fetchedAt: string
  events: CalendarEvent[]
  error?: string
}
