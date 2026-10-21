import { AppError } from '@shared/ipc/errors'
import {
  app,
  BrowserWindow,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  session,
  shell,
  type WebContents
} from 'electron'
import { cspFor } from './app-protocol'

const devUrl = process.env.ELECTRON_RENDERER_URL

export function isTrustedUrl(url: string): boolean {
  if (url.startsWith('app://bundle/')) {
    return true
  }
  if (devUrl && url.startsWith(devUrl)) {
    return true
  }
  return false
}

export function assertTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): void {
  const frame = event.senderFrame
  const url = frame?.url ?? ''
  if (!isTrustedUrl(url)) {
    throw new AppError('E_PERMISSION', 'Untrusted IPC sender')
  }
  if (!BrowserWindow.fromWebContents(event.sender)) {
    throw new AppError('E_PERMISSION', 'IPC sender is not an application window')
  }
}

export async function openExternalUrl(raw: string): Promise<void> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new AppError('E_INVALID_INPUT', 'Invalid URL')
  }
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
    throw new AppError('E_PERMISSION', 'Protocol is not allowed')
  }
  await shell.openExternal(url.toString())
}

export function configureSession(): void {
  const ses = session.defaultSession
  ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  ses.setPermissionCheckHandler(() => false)

  if (devUrl) {
    ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
      if (!details.url.startsWith(devUrl)) {
        callback({})
        return
      }
      const headers = details.responseHeaders ?? {}
      callback({
        responseHeaders: {
          ...headers,
          'Content-Security-Policy': [cspFor(true)]
        }
      })
    })
  }
}

export function hardenWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event, url) => {
    if (isTrustedUrl(url)) {
      return
    }
    event.preventDefault()
    void openExternalUrl(url).catch(() => undefined)
  })

  contents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url).catch(() => undefined)
    return { action: 'deny' }
  })

  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
}

export function installWebContentsHardening(): void {
  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents)
  })
}
