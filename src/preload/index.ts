import type { LogLevel } from '@shared/constants'
import type {
  AppInfo,
  Channel,
  EventChannel,
  EventPayload,
  ExportResult,
  FileContent,
  FileEncoding,
  FileFilter,
  FileHandleInfo,
  FileStat,
  InputOf,
  NotificationRequest,
  OutputOf,
  SettingsImportResult,
  WorkspaceChange,
  WorkspaceEntry,
  WorkspaceInfo,
  WorkspaceListResult,
  WorkspaceReadResult
} from '@shared/ipc/contract'
import { IpcError, type IpcResult } from '@shared/ipc/errors'
import type { MenuNode, MenuRole } from '@shared/menu'
import type { AppSession, SessionTab } from '@shared/session/schema'
import type { AppSettings, SettingsPatch } from '@shared/settings/schema'
import { contextBridge, ipcRenderer, webUtils } from 'electron'

async function invoke<C extends Channel>(channel: C, payload?: InputOf<C>): Promise<OutputOf<C>> {
  const result = (await ipcRenderer.invoke(channel, payload)) as IpcResult<OutputOf<C>>
  if (!result.ok) {
    throw new IpcError(result.error)
  }
  return result.data
}

function on<C extends EventChannel>(
  channel: C,
  callback: (payload: EventPayload<C>) => void
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
    callback(payload as EventPayload<C>)
  }
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  platform: process.platform,
  app: {
    getInfo: (): Promise<AppInfo> => invoke('app:get-info'),
    quit: (): Promise<void> => invoke('app:quit'),
    rendererReady: (): Promise<void> => invoke('app:renderer-ready'),
    openLogs: (): Promise<void> => invoke('app:open-logs'),
    openExternal: (url: string): Promise<void> => invoke('app:open-external', { url }),
    onOpenUrl: (callback: (payload: { url: string }) => void) => on('app:open-url', callback),
    onOpenFile: (
      callback: (payload: { handle: string; name: string; kind: 'file' | 'directory' }) => void
    ) => on('app:open-file', callback)
  },
  window: {
    minimize: (): Promise<void> => invoke('window:minimize'),
    toggleMaximize: (): Promise<boolean> => invoke('window:toggle-maximize'),
    close: (): Promise<void> => invoke('window:close'),
    isMaximized: (): Promise<boolean> => invoke('window:is-maximized'),
    onMaximized: (callback: (maximized: boolean) => void) => on('window:maximized', callback),
    onFullscreenChanged: (callback: (fullscreen: boolean) => void) =>
      on('window:fullscreen-changed', callback),
    onBeforeClose: (handler: () => boolean | Promise<boolean>): (() => void) => {
      const listener = async (
        _event: Electron.IpcRendererEvent,
        payload: { requestId: string }
      ): Promise<void> => {
        let allow = false
        try {
          allow = await handler()
        } catch (error) {
          console.error('[misk] close guard failed', error)
        } finally {
          ipcRenderer.send('app:close-response', { requestId: payload.requestId, allow })
        }
      }
      ipcRenderer.on('app:before-close', listener)
      return () => ipcRenderer.removeListener('app:before-close', listener)
    }
  },
  settings: {
    get: (): Promise<AppSettings> => invoke('settings:get'),
    patch: (patch: SettingsPatch): Promise<AppSettings> => invoke('settings:patch', patch),
    reset: (): Promise<AppSettings> => invoke('settings:reset'),
    export: (): Promise<ExportResult> => invoke('settings:export'),
    import: (): Promise<SettingsImportResult> => invoke('settings:import'),
    onChanged: (callback: (settings: AppSettings) => void) => on('settings:changed', callback)
  },
  secrets: {
    set: (key: string, value: string): Promise<void> => invoke('secrets:set', { key, value }),
    get: (key: string): Promise<string | null> => invoke('secrets:get', { key }),
    delete: (key: string): Promise<void> => invoke('secrets:delete', { key }),
    keys: (): Promise<string[]> => invoke('secrets:keys')
  },
  storage: {
    read: (key: string): Promise<unknown> => invoke('storage:read', { key }),
    write: (key: string, value: unknown): Promise<void> => invoke('storage:write', { key, value }),
    delete: (key: string): Promise<void> => invoke('storage:delete', { key }),
    keys: (): Promise<string[]> => invoke('storage:keys')
  },
  session: {
    get: (): Promise<AppSession> => invoke('session:get'),
    patch: (patch: { tabs?: SessionTab[]; activeIndex?: number }): Promise<AppSession> =>
      invoke('session:patch', patch)
  },
  files: {
    openDialog: (
      kind: 'file' | 'directory',
      filters?: FileFilter[]
    ): Promise<FileHandleInfo | null> => invoke('files:open-dialog', { kind, filters }),
    saveAs: (input: {
      handle?: string
      defaultName: string
      filters?: FileFilter[]
      content: string
      encoding?: FileEncoding
    }): Promise<FileHandleInfo | null> => invoke('files:save-as', input),
    read: (
      handle: string,
      options?: { maxBytes?: number; encoding?: FileEncoding }
    ): Promise<FileContent> => invoke('files:read', { handle, ...options }),
    write: (handle: string, content: string, encoding?: FileEncoding): Promise<{ size: number }> =>
      invoke('files:write', { handle, content, encoding }),
    stat: (handle: string): Promise<FileStat> => invoke('files:stat', { handle }),
    close: (handle: string): Promise<void> => invoke('files:close', { handle }),
    grant: (paths: string[]): Promise<FileHandleInfo[]> => invoke('files:grant', { paths }),
    reveal: (handle: string): Promise<void> => invoke('files:reveal', { handle }),
    openExternal: (handle: string): Promise<void> => invoke('files:open-external', { handle }),
    getPathForFile: (file: File): string => webUtils.getPathForFile(file)
  },
  workspace: {
    openDialog: (): Promise<WorkspaceInfo | null> => invoke('workspace:open-dialog'),
    openHandle: (handle: string): Promise<WorkspaceInfo> =>
      invoke('workspace:open-handle', { handle }),
    openRecent: (id: string): Promise<WorkspaceInfo | null> =>
      invoke('workspace:open-recent', { id }),
    list: (id: string, path?: string): Promise<WorkspaceListResult> =>
      invoke('workspace:list', { id, path }),
    readFile: (id: string, path: string, maxBytes?: number): Promise<WorkspaceReadResult> =>
      invoke('workspace:read-file', { id, path, maxBytes }),
    findFiles: (id: string, query: string, limit?: number): Promise<string[]> =>
      invoke('workspace:find-files', { id, query, limit }),
    watch: (id: string): Promise<void> => invoke('workspace:watch', { id }),
    unwatch: (id: string): Promise<void> => invoke('workspace:unwatch', { id }),
    reveal: (id: string, path: string): Promise<void> => invoke('workspace:reveal', { id, path }),
    openExternal: (id: string, path: string): Promise<void> =>
      invoke('workspace:open-external', { id, path }),
    close: (id: string): Promise<void> => invoke('workspace:close', { id }),
    onChanged: (callback: (change: WorkspaceChange) => void) => on('workspace:changed', callback)
  },
  menu: {
    update: (template: MenuNode[]): Promise<void> => invoke('menu:update', { template }),
    popup: (items: MenuNode[], x?: number, y?: number): Promise<void> =>
      invoke('menu:popup', { items, x, y }),
    runRole: (role: MenuRole): Promise<void> => invoke('menu:run-role', { role }),
    onCommand: (callback: (payload: { id: string; args?: unknown }) => void) =>
      on('command:run', callback)
  },
  notifications: {
    show: (request: NotificationRequest): Promise<void> => invoke('notifications:show', request),
    onActivated: (
      callback: (payload: {
        action?: { viewId: string; params?: Record<string, string | number | boolean> }
      }) => void
    ) => on('notifications:activated', callback)
  },
  clipboard: {
    writeText: (text: string): Promise<void> => invoke('clipboard:write-text', { text }),
    readText: (): Promise<string> => invoke('clipboard:read-text')
  },
  theme: {
    onSystemChanged: (callback: (payload: { shouldUseDarkColors: boolean }) => void) =>
      on('theme:system-changed', callback)
  },
  diagnostics: {
    export: (snapshot?: unknown): Promise<ExportResult> =>
      invoke('diagnostics:export', { snapshot })
  },
  log: {
    write: (entry: { level: LogLevel; scope: string; message: string; meta?: unknown }): void => {
      ipcRenderer.send('log:write', entry)
    }
  }
}

contextBridge.exposeInMainWorld('misk', api)

export type MiskApi = typeof api
export type { WorkspaceEntry }
