import { useLocalize } from '@renderer/core/i18n'
import { setSidebarWidth } from '@renderer/core/layout'
import { panelRegistry } from '@renderer/core/panels/registry'
import { useSettingsStore } from '@renderer/core/settings/store'
import { cn } from '@renderer/core/utils'
import { PanelLeftClose } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function Sidebar() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const layout = useSettingsStore((state) => state.settings.layout)
  const patch = useSettingsStore((state) => state.patch)
  const [width, setWidth] = useState(layout.sidebarWidth)
  const panels = panelRegistry.list()
  const panel = panels.find((item) => item.id === layout.sidebarPanel) ?? panels[0]

  useEffect(() => {
    setWidth(layout.sidebarWidth)
  }, [layout.sidebarWidth])

  if (!panel) {
    return null
  }

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    document.body.classList.add('is-resizing')
    const onMove = (moveEvent: PointerEvent): void => {
      const next = Math.min(480, Math.max(220, startWidth + moveEvent.clientX - startX))
      setWidth(next)
    }
    const onUp = (): void => {
      document.body.classList.remove('is-resizing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setSidebarWidth(width)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const Icon = panel.icon
  const Panel = panel.component

  return (
    <aside className="sidebar" style={{ width }} aria-label={localize(panel.title)}>
      <div className="sidebar-header">
        <div className="sidebar-heading">
          <Icon size={14} strokeWidth={1.9} />
          <span>{localize(panel.title)}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          title={t('sidebar.hide')}
          aria-label={t('sidebar.hide')}
          onClick={() => void patch({ layout: { sidebarOpen: false } })}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className={cn('sidebar-content')}>
        <Panel />
      </div>
      <div
        className="sidebar-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('sidebar.resize')}
        onPointerDown={beginResize}
      />
    </aside>
  )
}
