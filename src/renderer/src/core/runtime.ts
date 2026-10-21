import type { AppInfo } from '@shared/ipc/contract'
import { executeCommand } from './commands/execute'
import type { CommandRuntime } from './commands/types'
import { useDialogStore } from './dialog/store'
import { i18n } from './i18n'
import { toggleSidebar } from './layout'
import { closeActiveTab, closeTab, closeWorkspaceTabs, navigateHome, openView } from './navigation'
import { queryClient } from './query/client'
import { useRouteStore } from './route/store'
import { getAppRouter } from './router/router-instance'
import { useSettingsStore } from './settings/store'
import { notify } from './toast/store'
import { useUiStore } from './ui/store'
import { useWorkspaceStore } from './workspace/store'

export function createRuntime(appInfo: AppInfo): CommandRuntime {
  return {
    appInfo,
    platform: appInfo.platform,
    getActiveView: () => {
      const route = useRouteStore.getState()
      return route.viewId ? { viewId: route.viewId, params: route.params } : undefined
    },
    getWorkspace: () => useWorkspaceStore.getState().workspace,
    getWhenContext: () => {
      const route = useRouteStore.getState()
      const ui = useUiStore.getState()
      return {
        activeViewId: route.viewId ?? undefined,
        activeViewParams: route.params,
        workspaceOpen: useWorkspaceStore.getState().workspace !== null,
        paletteOpen: ui.paletteOpen,
        quickSwitcherOpen: ui.quickSwitcherOpen,
        modalOpen: ui.shortcutsOpen || useDialogStore.getState().request !== null
      }
    },
    openView,
    navigateHome,
    closeTab,
    closeActiveTab,
    openSettings: (section) => openView('core.settings', section ? { section } : {}),
    openCommandPalette: () => useUiStore.getState().openPalette(),
    openQuickSwitcher: () => useUiStore.getState().openQuickSwitcher(),
    openShortcuts: () => useUiStore.getState().openShortcuts(),
    toggleSidebar,
    setTheme: (mode) => {
      void useSettingsStore
        .getState()
        .patch({ appearance: { theme: mode } })
        .catch(() => undefined)
    },
    notify,
    openWorkspace: () => useWorkspaceStore.getState().openDialog(),
    openRecentWorkspace: async (id) => {
      await useWorkspaceStore.getState().openRecent(id)
    },
    closeWorkspace: async () => {
      const workspace = useWorkspaceStore.getState().workspace
      if (workspace) {
        closeWorkspaceTabs(workspace.id)
      }
      await useWorkspaceStore.getState().close()
    },
    invalidateWorkspace: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace'] })
    },
    quit: () => {
      void window.misk.app.quit()
    },
    executeCommand: (id, args) => executeCommand(id, args)
  }
}

export function titleForView(viewId: string | null): string | null {
  if (!viewId) {
    return null
  }
  const router = getAppRouter()
  if (!router) {
    return null
  }
  return null
}

export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params)
}
