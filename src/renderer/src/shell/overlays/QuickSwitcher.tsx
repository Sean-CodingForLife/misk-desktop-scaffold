import { useLocalize } from '@renderer/core/i18n'
import { openView } from '@renderer/core/navigation'
import { useUiStore } from '@renderer/core/ui/store'
import { viewRegistry } from '@renderer/core/views/registry'
import { useWorkspaceStore } from '@renderer/core/workspace/store'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { FileText, LayoutTemplate } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/Modal'

export function QuickSwitcher() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const open = useUiStore((state) => state.quickSwitcherOpen)
  const close = useUiStore((state) => state.closeQuickSwitcher)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const trimmed = query.trim()
  const filesQuery = useQuery({
    queryKey: ['workspace', workspace?.id, 'find', trimmed],
    queryFn: () => window.misk.workspace.findFiles(workspace!.id, trimmed, 50),
    enabled: open && Boolean(workspace) && trimmed.length > 0,
    staleTime: 5_000
  })

  const views = useMemo(() => {
    const needle = trimmed.toLowerCase()
    return viewRegistry.list().filter((definition) => {
      const title = localize(definition.title)
      return !needle || title.toLowerCase().includes(needle) || definition.id.includes(needle)
    })
  }, [localize, trimmed])

  const files = filesQuery.data ?? []

  const chooseFile = (path: string): void => {
    if (!workspace) {
      return
    }
    close()
    openView('workspace.preview', { source: 'workspace', workspaceId: workspace.id, path })
  }

  const chooseView = (viewId: string): void => {
    close()
    openView(viewId)
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => (value ? undefined : close())}
      title={t('menu.quickSwitcher')}
      hideTitle
      hideClose
      className="palette-modal"
    >
      <Command className="palette" label={t('menu.quickSwitcher')}>
        <Command.Input
          className="palette-input"
          placeholder={t('quick.placeholder')}
          value={query}
          onValueChange={setQuery}
          autoFocus
        />
        <Command.List className="palette-list">
          <Command.Empty className="palette-empty">{t('quick.empty')}</Command.Empty>
          {files.length > 0 ? (
            <Command.Group heading={t('quick.files')} className="palette-group">
              {files.map((path) => (
                <Command.Item
                  key={path}
                  value={`file:${path}`}
                  keywords={[path]}
                  className="palette-item"
                  onSelect={() => chooseFile(path)}
                >
                  <FileText size={14} className="palette-item-icon" />
                  <span className="palette-item-title">{path}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {views.length > 0 ? (
            <Command.Group heading={t('quick.views')} className="palette-group">
              {views.map((definition) => {
                const Icon = definition.icon ?? LayoutTemplate
                return (
                  <Command.Item
                    key={definition.id}
                    value={`view:${definition.id}`}
                    keywords={[localize(definition.title), definition.id]}
                    className="palette-item"
                    onSelect={() => chooseView(definition.id)}
                  >
                    <Icon size={14} className="palette-item-icon" />
                    <span className="palette-item-title">{localize(definition.title)}</span>
                    <span className="palette-item-shortcut">{definition.id}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>
          ) : null}
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
