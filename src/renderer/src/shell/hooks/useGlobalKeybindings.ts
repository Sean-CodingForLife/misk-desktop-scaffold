import { keybindingMatches, parseKeybinding } from '@shared/keybindings'
import { useEffect } from 'react'
import { getAppInfo } from '../../core/app-info'
import { bindingFor } from '../../core/commands/bindings'
import { executeCommand } from '../../core/commands/execute'
import { commandRegistry } from '../../core/commands/registry'
import { useDialogStore } from '../../core/dialog/store'
import { useSettingsStore } from '../../core/settings/store'
import { useUiStore } from '../../core/ui/store'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useGlobalKeybindings(): void {
  const keybindings = useSettingsStore((state) => state.settings.keybindings)
  const paletteOpen = useUiStore((state) => state.paletteOpen)
  const quickSwitcherOpen = useUiStore((state) => state.quickSwitcherOpen)
  const shortcutsOpen = useUiStore((state) => state.shortcutsOpen)
  const dialogOpen = useDialogStore((state) => state.request !== null)
  const platform = getAppInfo().platform

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        paletteOpen ||
        quickSwitcherOpen ||
        shortcutsOpen ||
        dialogOpen
      ) {
        return
      }
      const editable = isEditableTarget(event.target)
      for (const command of commandRegistry.list()) {
        const binding = bindingFor(command, keybindings)
        if (!binding || !keybindingMatches(event, binding, platform)) {
          continue
        }
        const parsed = parseKeybinding(binding)
        if (editable && parsed && !parsed.ctrl && !parsed.meta && !parsed.alt && !parsed.usesMod) {
          continue
        }
        event.preventDefault()
        void executeCommand(command.id)
        return
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [dialogOpen, keybindings, paletteOpen, platform, quickSwitcherOpen, shortcutsOpen])
}
