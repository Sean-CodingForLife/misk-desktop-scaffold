import { getAppInfo } from '@renderer/core/app-info'
import { bindingFor } from '@renderer/core/commands/bindings'
import { executeCommand, getCommandRuntime } from '@renderer/core/commands/execute'
import { commandRegistry } from '@renderer/core/commands/registry'
import { useLocalize } from '@renderer/core/i18n'
import { useSettingsStore } from '@renderer/core/settings/store'
import type { WhenContext } from '@renderer/core/types'
import { useUiStore } from '@renderer/core/ui/store'
import { cn } from '@renderer/core/utils'
import { formatKeybinding } from '@shared/keybindings'
import { Command } from 'cmdk'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'

interface PaletteCommand {
  id: string
  title: string
  category: string
  shortcut: string | null
}

export function CommandPalette() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const open = useUiStore((state) => state.paletteOpen)
  const close = useUiStore((state) => state.closePalette)
  const settings = useSettingsStore((state) => state.settings)
  const info = getAppInfo()

  const commands = useMemo<PaletteCommand[]>(() => {
    let context: WhenContext | undefined
    try {
      context = getCommandRuntime().getWhenContext()
    } catch {
      context = undefined
    }
    return commandRegistry
      .list()
      .filter((command) => !command.hidden)
      .filter((command) => !command.when || (context ? command.when(context) : true))
      .map((command) => {
        const binding = bindingFor(command, settings.keybindings)
        return {
          id: command.id,
          title: localize(command.title),
          category: localize(command.category) || t('palette.commands'),
          shortcut: binding ? formatKeybinding(binding, info.platform) : null
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [info.platform, localize, settings.keybindings, t])

  const recent = settings.commands.recent
    .map((id) => commands.find((command) => command.id === id))
    .filter((command): command is PaletteCommand => Boolean(command))

  const groups = useMemo(() => {
    const recentIds = new Set(recent.map((command) => command.id))
    const map = new Map<string, PaletteCommand[]>()
    for (const command of commands) {
      if (recentIds.has(command.id)) {
        continue
      }
      const list = map.get(command.category) ?? []
      list.push(command)
      map.set(command.category, list)
    }
    return [...map.entries()]
  }, [commands, recent])

  const run = (id: string): void => {
    close()
    void executeCommand(id)
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => (value ? null : close())}
      title={t('menu.commandPalette')}
      hideTitle
      hideClose
      className="palette-modal"
    >
      <Command className="palette" label={t('menu.commandPalette')}>
        <Command.Input className="palette-input" placeholder={t('palette.placeholder')} autoFocus />
        <Command.List className="palette-list">
          <Command.Empty className="palette-empty">{t('palette.empty')}</Command.Empty>
          {recent.length > 0 ? (
            <Command.Group heading={t('palette.recent')} className="palette-group">
              {recent.map((command) => (
                <Command.Item
                  key={`recent-${command.id}`}
                  value={command.id}
                  keywords={[command.title, command.category]}
                  className={cn('palette-item')}
                  onSelect={() => run(command.id)}
                >
                  <span className="palette-item-title">{command.title}</span>
                  {command.shortcut ? (
                    <span className="palette-item-shortcut">{command.shortcut}</span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {groups.map(([category, items]) => (
            <Command.Group key={category} heading={category} className="palette-group">
              {items.map((command) => (
                <Command.Item
                  key={command.id}
                  value={command.id}
                  keywords={[command.title, command.category]}
                  className={cn('palette-item')}
                  onSelect={() => run(command.id)}
                >
                  <span className="palette-item-title">{command.title}</span>
                  {command.shortcut ? (
                    <span className="palette-item-shortcut">{command.shortcut}</span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="palette-footer">
          <span>↑↓ {t('palette.navigate')}</span>
          <span>↵ {t('palette.run')}</span>
          <span>esc {t('palette.close')}</span>
        </div>
      </Command>
    </Modal>
  )
}
