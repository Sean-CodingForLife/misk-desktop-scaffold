import { useSettingsStore } from '../settings/store'
import { commandRegistry } from './registry'
import type { CommandRuntime } from './types'

let runtime: CommandRuntime | null = null

export function setCommandRuntime(value: CommandRuntime): void {
  runtime = value
}

export function getCommandRuntime(): CommandRuntime {
  if (!runtime) {
    throw new Error('Command runtime is not initialized')
  }
  return runtime
}

function addRecentCommand(id: string): void {
  const settings = useSettingsStore.getState().settings
  const recent = [id, ...settings.commands.recent.filter((item) => item !== id)].slice(0, 8)
  if (recent.join('|') === settings.commands.recent.join('|')) {
    return
  }
  void useSettingsStore
    .getState()
    .patch({ commands: { recent } })
    .catch(() => undefined)
}

export async function executeCommand(id: string, args?: unknown): Promise<boolean> {
  if (!runtime) {
    return false
  }
  const ok = await commandRegistry.execute(id, args, runtime)
  if (ok) {
    addRecentCommand(id)
  }
  return ok
}
