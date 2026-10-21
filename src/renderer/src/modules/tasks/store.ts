import { z } from 'zod'
import { create } from 'zustand'

export type TaskColumn = 'todo' | 'doing' | 'done'

export interface Task {
  id: string
  title: string
  notes?: string
  column: TaskColumn
  order: number
  createdAt: number
  updatedAt: number
}

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().optional(),
  column: z.enum(['todo', 'doing', 'done']),
  order: z.number(),
  createdAt: z.number(),
  updatedAt: z.number()
})

export const tasksDataSchema = z.object({
  version: z.literal(1),
  tasks: z.array(taskSchema)
})

export type TasksData = z.infer<typeof tasksDataSchema>

interface TasksState {
  tasks: Task[]
  hydrated: boolean
  hydrate: (tasks: Task[]) => void
  add: (title: string) => void
  update: (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'column'>>) => void
  remove: (id: string) => void
  move: (id: string, column: TaskColumn) => void
  clearDone: () => void
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  hydrated: false,
  hydrate: (tasks) => set({ tasks, hydrated: true }),
  add: (title) =>
    set((state) => {
      const now = Date.now()
      return {
        tasks: [
          ...state.tasks,
          {
            id: crypto.randomUUID(),
            title: title.trim(),
            column: 'todo',
            order: state.tasks.length,
            createdAt: now,
            updatedAt: now
          }
        ]
      }
    }),
  update: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: Date.now() } : task
      )
    })),
  remove: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
  move: (id, column) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, column, updatedAt: Date.now() } : task
      )
    })),
  clearDone: () =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.column !== 'done')
    }))
}))

interface TaskSettingsState {
  showDone: boolean
  hydrated: boolean
  hydrate: (showDone: boolean) => void
  setShowDone: (value: boolean) => void
}

export const useTaskSettingsStore = create<TaskSettingsState>((set) => ({
  showDone: true,
  hydrated: false,
  hydrate: (showDone) => set({ showDone, hydrated: true }),
  setShowDone: (showDone) => set({ showDone })
}))

interface TaskUiState {
  focusTick: number
  focusComposer: () => void
}

export const useTaskUiStore = create<TaskUiState>((set) => ({
  focusTick: 0,
  focusComposer: () => set((state) => ({ focusTick: state.focusTick + 1 }))
}))
