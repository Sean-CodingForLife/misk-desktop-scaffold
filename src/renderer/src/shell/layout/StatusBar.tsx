import { getAppInfo } from '@renderer/core/app-info'
import { useLocalize } from '@renderer/core/i18n'
import { useRouteStore } from '@renderer/core/route/store'
import { statusRegistry } from '@renderer/core/status/registry'
import { viewRegistry } from '@renderer/core/views/registry'
import { useWorkspaceStore } from '@renderer/core/workspace/store'
import { useResolvedTheme } from '@renderer/shell/theme/ThemeProvider'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function StatusBar() {
  const { t } = useTranslation()
  const localize = useLocalize()
  const info = getAppInfo()
  const theme = useResolvedTheme()
  const route = useRouteStore()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const definition = route.viewId ? viewRegistry.get(route.viewId) : undefined
  const Icon = definition?.icon ?? FileText
  const leftItems = statusRegistry.list('left')
  const rightItems = statusRegistry.list('right')

  return (
    <footer className="status-bar">
      <div className="status-left">
        {definition ? (
          <span className="status-item">
            <Icon size={12} strokeWidth={1.9} />
            {localize(definition.title)}
          </span>
        ) : (
          <span className="status-item">{t('status.ready')}</span>
        )}
        {leftItems.map((item) => (
          <item.component key={item.id} />
        ))}
      </div>
      <div className="status-right">
        {rightItems.map((item) => (
          <item.component key={item.id} />
        ))}
        {workspace ? <span className="status-item">{workspace.name}</span> : null}
        <span className="status-item">
          {theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
        </span>
        <span className="status-item">v{info.version}</span>
      </div>
    </footer>
  )
}
