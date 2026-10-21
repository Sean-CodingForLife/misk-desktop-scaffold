import { defineModule } from '@renderer/core/modules/types'
import { ListChecks, Plus } from 'lucide-react'
import { BoardView, TasksSettings, TasksStatusItem } from './BoardView'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'
import { tasksDataSchema, useTaskSettingsStore, useTasksStore, useTaskUiStore } from './store'

const TASKS_KEY = 'tasks.v1'
const TASKS_SETTINGS_KEY = 'tasks.settings.v1'

const settingsSchema = {
  safeParse(value: unknown): { success: boolean; data?: { showDone: boolean } } {
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>
      if (typeof record.showDone === 'boolean') {
        return { success: true, data: { showDone: record.showDone } }
      }
    }
    return { success: false }
  }
}

let tasksTimer: number | null = null
let settingsTimer: number | null = null

function scheduleTasksSave(tasks: ReturnType<typeof useTasksStore.getState>['tasks']): void {
  if (typeof window === 'undefined') {
    return
  }
  if (tasksTimer !== null) {
    window.clearTimeout(tasksTimer)
  }
  tasksTimer = window.setTimeout(() => {
    tasksTimer = null
    void window.misk.storage
      .write(TASKS_KEY, { version: 1, tasks })
      .catch((error) => console.error('[tasks] failed to save', error))
  }, 250)
}

function scheduleSettingsSave(showDone: boolean): void {
  if (typeof window === 'undefined') {
    return
  }
  if (settingsTimer !== null) {
    window.clearTimeout(settingsTimer)
  }
  settingsTimer = window.setTimeout(() => {
    settingsTimer = null
    void window.misk.storage
      .write(TASKS_SETTINGS_KEY, { showDone })
      .catch((error) => console.error('[tasks] failed to save settings', error))
  }, 250)
}

async function hydrate(): Promise<void> {
  try {
    const raw = await window.misk.storage.read(TASKS_KEY)
    const parsed = tasksDataSchema.safeParse(raw)
    useTasksStore.getState().hydrate(parsed.success ? parsed.data.tasks : [])
  } catch (error) {
    console.error('[tasks] failed to load', error)
    useTasksStore.getState().hydrate([])
  }
  try {
    const raw = await window.misk.storage.read(TASKS_SETTINGS_KEY)
    const parsed = settingsSchema.safeParse(raw)
    useTaskSettingsStore
      .getState()
      .hydrate(parsed.success && parsed.data ? parsed.data.showDone : true)
  } catch {
    useTaskSettingsStore.getState().hydrate(true)
  }
}

export const tasksModule = defineModule({
  id: 'tasks',
  name: { key: 'module.tasks.name', ns: 'tasks', fallback: 'Tasks' },
  description: {
    key: 'module.tasks.description',
    ns: 'tasks',
    fallback: 'A non-editor example module: a small task board.'
  },
  activate: async (ctx) => {
    ctx.i18n.add('en-US', 'tasks', enUS)
    ctx.i18n.add('zh-CN', 'tasks', zhCN)

    ctx.views.register({
      id: 'tasks.board',
      title: { key: 'tasks.title', ns: 'tasks' },
      icon: ListChecks,
      component: BoardView,
      singleton: true,
      keepAlive: true
    })

    ctx.commands.register({
      id: 'tasks.new',
      title: { key: 'tasks.new', ns: 'tasks' },
      category: { key: 'menu.file' },
      defaultKeybinding: 'Mod+Alt+N',
      icon: Plus,
      run: (runtime) => {
        runtime.openView('tasks.board')
        useTaskUiStore.getState().focusComposer()
      }
    })

    ctx.commands.register({
      id: 'tasks.clearDone',
      title: { key: 'tasks.clearDone', ns: 'tasks' },
      category: { key: 'tasks.settings', ns: 'tasks' },
      when: () => useTasksStore.getState().tasks.some((task) => task.column === 'done'),
      run: () => useTasksStore.getState().clearDone()
    })

    ctx.status.register({
      id: 'tasks.status',
      align: 'right',
      order: 20,
      component: TasksStatusItem
    })

    ctx.settings.register({
      id: 'tasks',
      title: { key: 'tasks.settings', ns: 'tasks' },
      order: 60,
      component: TasksSettings
    })

    ctx.menus.add('file', { command: 'tasks.new', order: 5 })

    await hydrate()
    const unsubscribeTasks = useTasksStore.subscribe((state, previous) => {
      if (state.hydrated && state.tasks !== previous.tasks) {
        scheduleTasksSave(state.tasks)
      }
    })
    const unsubscribeSettings = useTaskSettingsStore.subscribe((state, previous) => {
      if (state.hydrated && state.showDone !== previous.showDone) {
        scheduleSettingsSave(state.showDone)
      }
    })
    ctx.track({ dispose: unsubscribeTasks })
    ctx.track({ dispose: unsubscribeSettings })
  }
})
