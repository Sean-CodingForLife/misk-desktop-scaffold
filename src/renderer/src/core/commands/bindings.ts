import { normalizeKeybinding } from '@shared/keybindings'

interface BindableCommand {
  id: string
  defaultKeybinding?: string
}

export function bindingFor(
  command: BindableCommand,
  overrides: Record<string, string | null>
): string | null {
  if (Object.hasOwn(overrides, command.id)) {
    return overrides[command.id] ?? null
  }
  return command.defaultKeybinding ?? null
}

export function bindingsFor(
  commands: BindableCommand[],
  overrides: Record<string, string | null>
): Map<string, string> {
  const result = new Map<string, string>()
  for (const command of commands) {
    const binding = bindingFor(command, overrides)
    if (binding) {
      result.set(command.id, binding)
    }
  }
  return result
}

export function conflictsFor(
  commands: BindableCommand[],
  overrides: Record<string, string | null>
): Map<string, string[]> {
  const byBinding = new Map<string, string[]>()
  for (const [id, binding] of bindingsFor(commands, overrides)) {
    const normalized = normalizeKeybinding(binding)
    if (!normalized) {
      continue
    }
    const ids = byBinding.get(normalized) ?? []
    ids.push(id)
    byBinding.set(normalized, ids)
  }
  const conflicts = new Map<string, string[]>()
  for (const ids of byBinding.values()) {
    if (ids.length > 1) {
      for (const id of ids) {
        conflicts.set(
          id,
          ids.filter((other) => other !== id)
        )
      }
    }
  }
  return conflicts
}
