import { getAppInfo } from '@renderer/core/app-info'
import { homeRegistry } from '@renderer/core/home/registry'
import { i18n } from '@renderer/core/i18n'
import { relocalizeTabs } from '@renderer/core/navigation'
import { tabKey, useRouteStore } from '@renderer/core/route/store'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useTabsStore } from '@renderer/core/tabs/store'
import { useResolvedTheme } from '@renderer/shell/theme/ThemeProvider'
import { Button, EmptyState } from '@renderer/shell/ui/primitives'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { Component, type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppMenu } from '../hooks/useAppMenu'
import { useCloseGuard } from '../hooks/useCloseGuard'
import { useGlobalKeybindings } from '../hooks/useGlobalKeybindings'
import { useIpcBridge } from '../hooks/useIpcBridge'
import { useRendererReady } from '../hooks/useRendererReady'
import { useSessionPersistence } from '../hooks/useSessionPersistence'
import { CommandPalette } from '../overlays/CommandPalette'
import { ConfirmDialog } from '../overlays/ConfirmDialog'
import { QuickSwitcher } from '../overlays/QuickSwitcher'
import { ShortcutsDialog } from '../overlays/ShortcutsDialog'
import { ToastHost } from '../overlays/ToastHost'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { TabStrip } from './TabStrip'
import { TitleBar } from './TitleBar'
import { ViewStack } from './ViewStack'

interface AppBoundaryState {
  error: Error | null
}

class AppBoundary extends Component<{ children: ReactNode }, AppBoundaryState> {
  state: AppBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('[app] crashed', error)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app-error">
          <AlertTriangle size={28} />
          <h1>{i18n.t('error.appTitle')}</h1>
          <p>{i18n.t('error.appMessage')}</p>
          <code>{this.state.error.message}</code>
          <Button variant="primary" onClick={() => window.location.reload()}>
            {i18n.t('error.reload')}
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

function Shell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { i18n: instance } = useTranslation()
  const layout = useSettingsStore((state) => state.settings.layout)
  const route = useRouteStore()
  const tabs = useTabsStore((state) => state.tabs)
  const activeTab = tabs.find((tab) => tabKey(tab.viewId, tab.params) === route.key)
  const info = getAppInfo()
  const Home = homeRegistry.get()
  const isHome = pathname === '/'

  useAppMenu()
  useGlobalKeybindings()
  useIpcBridge()
  useRendererReady()
  useSessionPersistence()
  useCloseGuard()

  useEffect(() => {
    document.title = activeTab ? `${activeTab.title} — ${info.name}` : info.name
  }, [activeTab, info.name])

  useEffect(() => {
    relocalizeTabs()
  }, [instance.language])

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <ActivityBar />
        {layout.sidebarOpen ? <Sidebar /> : null}
        <main className="workbench">
          <TabStrip />
          <div className="workbench-content">
            {isHome ? (
              Home ? (
                <Home />
              ) : (
                <EmptyState title={info.name} description={i18n.t('home.subtitle')} />
              )
            ) : (
              <ViewStack />
            )}
          </div>
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <QuickSwitcher />
      <ShortcutsDialog />
      <ConfirmDialog />
      <ToastHost />
      <div hidden>
        <Outlet />
      </div>
    </div>
  )
}

export function AppShell() {
  const theme = useResolvedTheme()
  return (
    <div className="shell-root" data-resolved-theme={theme}>
      <AppBoundary>
        <Shell />
      </AppBoundary>
    </div>
  )
}
