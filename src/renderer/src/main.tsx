import { setAppInfo } from '@renderer/core/app-info'
import { setCommandRuntime } from '@renderer/core/commands/execute'
import { i18n, initI18n } from '@renderer/core/i18n'
import { activateModules } from '@renderer/core/modules/activate'
import { restoreSessionTabs, tabPath } from '@renderer/core/navigation'
import { queryClient } from '@renderer/core/query/client'
import { createAppRouter } from '@renderer/core/router/router'
import { createRuntime } from '@renderer/core/runtime'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useTabsStore } from '@renderer/core/tabs/store'
import { useWorkspaceStore } from '@renderer/core/workspace/store'
import { ThemeProvider } from '@renderer/shell/theme/ThemeProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { getModules } from './modules'
import './styles/index.css'

function Fatal({ error }: { error: unknown }) {
  return (
    <div className="fatal-error">
      <h1>Misk Desktop failed to start</h1>
      <pre>{error instanceof Error ? (error.stack ?? error.message) : String(error)}</pre>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>{children}</ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

async function start(): Promise<void> {
  const appInfo = await window.misk.app.getInfo()
  setAppInfo(appInfo)
  const settings = await window.misk.settings.get()
  useSettingsStore.getState().set(settings)

  await initI18n(settings.locale)
  const statuses = await activateModules(getModules(), appInfo)
  if (statuses.some((status) => !status.ok)) {
    console.warn('[misk] some modules failed to activate', statuses)
  }

  const lastWorkspaceId = settings.workspace.lastId
  if (lastWorkspaceId) {
    try {
      const workspace = await window.misk.workspace.openRecent(lastWorkspaceId)
      if (workspace) {
        useWorkspaceStore.getState().adopt(workspace)
      } else {
        await window.misk.settings.patch({ workspace: { lastId: null } })
      }
    } catch (error) {
      console.warn('[workspace] failed to restore', error)
    }
  }

  const session = await window.misk.session.get()
  const restored = restoreSessionTabs(
    session.tabs,
    session.activeIndex,
    useWorkspaceStore.getState().workspace?.id
  )
  useTabsStore.getState().hydrate(restored.tabs)
  const initialPath = restored.activeTab ? tabPath(restored.activeTab) : '/'
  const router = createAppRouter(initialPath)
  setCommandRuntime(createRuntime(appInfo))

  window.misk.settings.onChanged((next) => {
    useSettingsStore.getState().set(next)
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[renderer] unhandled rejection', event.reason)
    window.misk.log.write({
      level: 'error',
      scope: 'renderer',
      message: String(event.reason)
    })
  })
  window.addEventListener('error', (event) => {
    window.misk.log.write({
      level: 'error',
      scope: 'renderer',
      message: event.message
    })
  })

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>
  )
}

void start().catch((error) => {
  console.error('[misk] failed to start renderer', error)
  const root = document.getElementById('root')
  if (root) {
    createRoot(root).render(<Fatal error={error} />)
  }
})
