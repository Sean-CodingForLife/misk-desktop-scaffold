import type { WorkspaceInfo } from '@shared/ipc/contract'
import { create } from 'zustand'
import { i18n } from '../i18n'
import { closeWorkspaceTabs } from '../navigation'
import { useSettingsStore } from '../settings/store'
import { notify } from '../toast/store'

interface WorkspaceState {
  workspace: WorkspaceInfo | null
  adopt: (workspace: WorkspaceInfo) => void
  openDialog: () => Promise<void>
  openRecent: (id: string) => Promise<boolean>
  openHandle: (handle: string) => Promise<void>
  close: () => Promise<void>
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  adopt: (workspace) => {
    const previous = get().workspace
    if (previous && previous.id !== workspace.id) {
      closeWorkspaceTabs(previous.id)
      void window.misk.workspace.unwatch(previous.id).catch(() => undefined)
    }
    set({ workspace })
    void window.misk.workspace.watch(workspace.id).catch((error) => {
      console.warn('[workspace] failed to watch', error)
    })
  },
  openDialog: async () => {
    try {
      const info = await window.misk.workspace.openDialog()
      if (!info) {
        return
      }
      get().adopt(info)
      notify(i18n.t('toast.workspaceOpened', { name: info.name }), 'success')
    } catch (error) {
      notify(i18n.t('toast.workspaceOpenFailed', { message: messageOf(error) }), 'error')
    }
  },
  openRecent: async (id) => {
    try {
      const info = await window.misk.workspace.openRecent(id)
      if (!info) {
        notify(i18n.t('toast.workspaceOpenFailed', { message: id }), 'error')
        await window.misk.settings.patch({ workspace: { lastId: null } })
        return false
      }
      get().adopt(info)
      notify(i18n.t('toast.workspaceOpened', { name: info.name }), 'success')
      return true
    } catch (error) {
      notify(i18n.t('toast.workspaceOpenFailed', { message: messageOf(error) }), 'error')
      return false
    }
  },
  openHandle: async (handle) => {
    try {
      const info = await window.misk.workspace.openHandle(handle)
      get().adopt(info)
      notify(i18n.t('toast.workspaceOpened', { name: info.name }), 'success')
    } catch (error) {
      notify(i18n.t('toast.workspaceOpenFailed', { message: messageOf(error) }), 'error')
    }
  },
  close: async () => {
    const workspace = get().workspace
    if (!workspace) {
      return
    }
    try {
      await window.misk.workspace.close(workspace.id)
    } finally {
      closeWorkspaceTabs(workspace.id)
      set({ workspace: null })
      await useSettingsStore.getState().patch({ workspace: { lastId: null } })
      notify(i18n.t('toast.workspaceClosed'), 'info')
    }
  }
}))
