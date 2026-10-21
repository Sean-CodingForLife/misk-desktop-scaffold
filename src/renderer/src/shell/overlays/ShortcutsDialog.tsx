import { getAppInfo } from '@renderer/core/app-info'
import { bindingFor } from '@renderer/core/commands/bindings'
import { commandRegistry } from '@renderer/core/commands/registry'
import { useLocalize } from '@renderer/core/i18n'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useUiStore } from '@renderer/core/ui/store'
import { formatKeybinding } from '@shared/keybindings'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/primitives'

export function ShortcutsDialog() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const open = useUiStore((state) => state.shortcutsOpen)
  const close = useUiStore((state) => state.closeShortcuts)
  const settings = useSettingsStore((state) => state.settings)
  const [query, setQuery] = useState('')
  const info = getAppInfo()

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return commandRegistry
      .list()
      .map((command) => {
        const binding = bindingFor(command, settings.keybindings)
        return {
          id: command.id,
          title: localize(command.title),
          category: localize(command.category),
          binding: binding ? formatKeybinding(binding, info.platform) : null
        }
      })
      .filter((row) => {
        if (!needle) {
          return true
        }
        return (
          row.title.toLowerCase().includes(needle) ||
          row.category.toLowerCase().includes(needle) ||
          row.id.includes(needle)
        )
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [info.platform, localize, query, settings.keybindings])

  return (
    <Modal
      open={open}
      onOpenChange={(value) => (value ? undefined : close())}
      title={t('shortcuts.title')}
      className="shortcuts-modal"
    >
      <div className="shortcuts-search">
        <Search size={14} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('shortcuts.search')}
          aria-label={t('shortcuts.search')}
        />
      </div>
      <div className="shortcuts-list">
        {rows.length === 0 ? (
          <p className="panel-empty">{t('shortcuts.empty')}</p>
        ) : (
          rows.map((row) => (
            <div className="shortcut-row" key={row.id}>
              <div className="shortcut-text">
                <span>{row.title}</span>
                {row.category ? <small>{row.category}</small> : null}
              </div>
              {row.binding ? (
                <kbd className="kbd">{row.binding}</kbd>
              ) : (
                <span className="shortcut-none">—</span>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
