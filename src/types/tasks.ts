export interface Task {
  id: string
  title: string
  dueDate?: string // ISO 8601 format
  isCompleted: boolean
  priority?: number // 0-9, where 1 is highest priority
  notes?: string
  isOverdue?: boolean
}

export interface TaskData {
  fetchedAt: string
  tasks: Task[]
  error?: string
}
