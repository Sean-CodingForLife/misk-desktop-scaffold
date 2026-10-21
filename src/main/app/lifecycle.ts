import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { APP_CONFIG } from '@shared/app-config'
import type { LogLevel } from '@shared/constants'
import { app, dialog, nativeTheme } from 'electron'
import { getAppInfo } from '../app-info'
import { installAppProtocol, registerAppScheme } from '../app-protocol'
import type { AppContext } from '../context'
import { registerIpc } from '../ipc/register'
import { configureSession, installWebContentsHardening } from '../security'
import { DiagnosticsService } from '../services/diagnostics'
import { FilesService } from '../services/files'
import { SecretsService } from '../services/secrets'
import { SessionService } from '../services/session'
import { SettingsService } from '../services/settings'
import { StorageService } from '../services/storage'
import { WorkspaceService } from '../services/workspace'
import { initLogging, logger, setLogLevel } from './logging'
import { MenuService } from './menu'
import { WindowService } from './windows'

export { registerAppScheme }

let context: AppContext | null = null
let closeRequestId: string | null = null
let closeResolver: ((allow: boolean) => void) | null = null
let closeTimer: NodeJS.Timeout | null = null
let pendingClose: Promise<boolean> | null = null
let pendingUrls: string[] = []
let pendingPaths: string[] = []
let quitting = false

function finishClose(allow: boolean): void {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  const resolver = closeResolver
  closeResolver = null
  closeRequestId = null
  pendingClose = null
  resolver?.(allow)
}

async function requestClose(): Promise<boolean> {
  const window = context?.windows.get()
  if (!window || window.isDestroyed() || window.webContents.isDestroyed()) {
    return true
  }
  if (pendingClose) {
    return pendingClose
  }
  const requestId = randomUUID()
  closeRequestId = requestId
  pendingClose = new Promise<boolean>((resolvePromise) => {
    closeResolver = resolvePromise
    closeTimer = setTimeout(async () => {
      if (!closeResolver) {
        return
      }
      if (window.isDestroyed()) {
        finishClose(true)
        return
      }
      const result = await dialog.showMessageBox(window, {
        type: 'warning',
        title: APP_CONFIG.productName,
        message: 'The window is still shutting down.',
        detail: 'A background operation has not finished yet.',
        buttons: ['Quit anyway', 'Cancel'],
        defaultId: 1,
        cancelId: 1
      })
      finishClose(result.response === 0)
    }, 15_000)
  })
  window.webContents.send('app:before-close', { requestId })
  window.once('closed', () => finishClose(true))
  return pendingClose
}

function isDeepLink(value: string): boolean {
  return value.startsWith(`${APP_CONFIG.protocol}://`)
}

function findDeepLink(argv: string[]): string | undefined {
  return argv.find((value) => isDeepLink(value))
}

function sendDeepLink(url: string): void {
  if (!context?.windows.get()) {
    pendingUrls.push(url)
    return
  }
  context.windows.send('app:open-url', { url })
  context.windows.focus()
}

async function sendOpenPath(path: string): Promise<void> {
  if (!context) {
    pendingPaths.push(path)
    return
  }
  try {
    const [handle] = await context.files.grant([path])
    if (!handle) {
      return
    }
    context.windows.send('app:open-file', {
      handle: handle.handle,
      name: handle.name,
      kind: handle.kind
    })
    context.windows.focus()
  } catch (error) {
    logger.warn('open-file', 'failed to grant dropped/opened path', error)
  }
}

function flushPending(): void {
  const urls = pendingUrls
  const paths = pendingPaths
  pendingUrls = []
  pendingPaths = []
  for (const url of urls) {
    sendDeepLink(url)
  }
  for (const path of paths) {
    void sendOpenPath(path)
  }
}

function registerProtocolClient(): void {
  const protocol = APP_CONFIG.protocol
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(protocol)
  }
}

function handleArgv(argv: string[]): void {
  const link = findDeepLink(argv)
  if (link) {
    sendDeepLink(link)
    return
  }
  for (const value of argv.slice(1)) {
    if (value.startsWith('-')) {
      continue
    }
    if (value === process.execPath || value === resolve(process.argv[1] ?? '')) {
      continue
    }
    if (/^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('/')) {
      void sendOpenPath(value)
    }
  }
}

async function createWindow(): Promise<void> {
  if (!context) {
    return
  }
  const window = await context.windows.create()
  window.webContents.once('did-finish-load', () => {
    setTimeout(flushPending, 500)
  })
}

export async function bootstrap(): Promise<void> {
  if (process.env.MISK_E2E === '1') {
    app.disableHardwareAcceleration()
  }
  app.enableSandbox()
  app.setName(APP_CONFIG.productName)

  if (process.env.MISK_USER_DATA) {
    app.setPath('userData', process.env.MISK_USER_DATA)
  }

  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.setAppUserModelId(APP_CONFIG.appId)
  installWebContentsHardening()

  app.on('second-instance', (_event, argv) => {
    context?.windows.focus()
    handleArgv(argv)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    sendDeepLink(url)
  })

  app.on('open-file', (event, path) => {
    event.preventDefault()
    void sendOpenPath(path)
  })

  process.on('uncaughtException', (error) => {
    logger.error('process', 'uncaught exception', error)
    if (app.isReady()) {
      dialog.showErrorBox(APP_CONFIG.productName, error.stack ?? error.message)
    }
    app.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    logger.error('process', 'unhandled rejection', reason)
  })

  await app.whenReady()

  const settings = new SettingsService()
  await settings.init()
  initLogging(settings.get().advanced.logLevel)

  const session = new SessionService()
  await session.init()
  const storage = new StorageService()
  const secrets = new SecretsService()
  const files = new FilesService()

  const windows = new WindowService(requestClose, logger, {
    onRendererGone: (reason) => {
      const window = windows.get()
      if (!window || window.isDestroyed()) {
        return
      }
      void dialog
        .showMessageBox(window, {
          type: 'error',
          title: APP_CONFIG.productName,
          message: 'The interface process stopped unexpectedly.',
          detail: reason,
          buttons: ['Reload', 'Quit'],
          defaultId: 0,
          cancelId: 1
        })
        .then((result) => {
          if (result.response === 0) {
            window.reload()
          } else {
            app.quit()
          }
        })
    },
    onUnresponsive: () => {
      const window = windows.get()
      if (!window || window.isDestroyed()) {
        return
      }
      void dialog
        .showMessageBox(window, {
          type: 'warning',
          title: APP_CONFIG.productName,
          message: 'The window is not responding.',
          buttons: ['Wait', 'Reload'],
          defaultId: 0,
          cancelId: 1
        })
        .then((result) => {
          if (result.response === 1) {
            window.reload()
          }
        })
    }
  })

  const workspace = new WorkspaceService(settings, files, (change) => {
    windows.send('workspace:changed', change)
  })

  const diagnostics = new DiagnosticsService(settings, session, getAppInfo)
  const menu = new MenuService()

  context = {
    appInfo: getAppInfo(),
    settings,
    session,
    storage,
    secrets,
    files,
    workspace,
    diagnostics,
    menu,
    windows,
    resolveClose: (requestId, allow) => {
      if (requestId !== closeRequestId) {
        return
      }
      finishClose(allow)
    }
  }

  installAppProtocol()
  configureSession()
  registerIpc(context)
  registerProtocolClient()

  nativeTheme.themeSource = settings.get().appearance.theme
  nativeTheme.on('updated', () => {
    windows.send('theme:system-changed', {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors
    })
  })

  settings.onChange((next) => {
    windows.send('settings:changed', next)
    setLogLevel(next.advanced.logLevel as LogLevel)
    nativeTheme.themeSource = next.appearance.theme
    windows.get()?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#0b0d12' : '#f6f7fb')
  })

  await createWindow()

  app.on('activate', () => {
    if (context && context.windows.get() === null) {
      void createWindow()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('will-quit', (event) => {
    if (quitting) {
      return
    }
    event.preventDefault()
    quitting = true
    context?.workspace.closeAll()
    context?.files.closeAll()
    void Promise.all([session.flush(), context?.windows.flush()]).finally(() => {
      app.quit()
    })
  })

  app.on('before-quit', () => {
    // Window close guards are handled by WindowService; this hook exists so
    // native Cmd+Q / Alt+F4 paths are explicit.
  })
}
