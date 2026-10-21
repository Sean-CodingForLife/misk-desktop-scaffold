import { useLocalize } from '@renderer/core/i18n'
import { toggleSidebar } from '@renderer/core/layout'
import { navigateHome, openView } from '@renderer/core/navigation'
import { panelRegistry } from '@renderer/core/panels/registry'
import { useRouteStore } from '@renderer/core/route/store'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useUiStore } from '@renderer/core/ui/store'
import { cn } from '@renderer/core/utils'
import { CircleHelp, Home, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ActivityBar() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const layout = useSettingsStore((state) => state.settings.layout)
  const viewId = useRouteStore((state) => state.viewId)
  const openShortcuts = useUiStore((state) => state.openShortcuts)
  const panels = panelRegistry.list()

  return (
    <aside className="activity-bar" aria-label={t('activity.panels')}>
      <div className="activity-top">
        <button
          type="button"
          className={cn('activity-item', viewId === null && 'active')}
          title={t('activity.home')}
          aria-label={t('activity.home')}
          onClick={navigateHome}
        >
          <Home size={18} strokeWidth={1.8} />
        </button>

        {panels.map((panel) => {
          const Icon = panel.icon
          const active = layout.sidebarOpen && layout.sidebarPanel === panel.id
          const title = localize(panel.title)
          return (
            <button
              type="button"
              key={panel.id}
              className={cn('activity-item', active && 'active')}
              title={title}
              aria-label={title}
              onClick={() => toggleSidebar(panel.id)}
            >
              <Icon size={18} strokeWidth={1.8} />
            </button>
          )
        })}
      </div>

      <div className="activity-bottom">
        <button
          type="button"
          className={cn('activity-item', viewId === 'core.settings' && 'active')}
          title={t('activity.settings')}
          aria-label={t('activity.settings')}
          onClick={() => openView('core.settings')}
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="activity-item"
          title={t('activity.help')}
          aria-label={t('activity.help')}
          onClick={openShortcuts}
        >
          <CircleHelp size={18} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  )
}
