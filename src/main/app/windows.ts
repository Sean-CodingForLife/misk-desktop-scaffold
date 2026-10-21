import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { APP_CONFIG } from '@shared/app-config'
import { clamp } from '@shared/utils'
import { app, BrowserWindow, nativeTheme, screen } from 'electron'
import { writeFileAtomic } from '../services/fs-utils'
import type { Logger } from './logging'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
  fullScreen: boolean
}

interface WindowCallbacks {
  onRendererGone: (reason: string) => void
  onUnresponsive: () => void
  onCloseDenied: () => void
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 820,
  maximized: false,
  fullScreen: false
}

function isVisibleOnSomeDisplay(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) {
    return false
  }
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      state.x! < area.x + area.width &&
      state.x! + state.width > area.x &&
      state.y! < area.y + area.height &&
      state.y! + state.height > area.y
    )
  })
}

export class WindowService {
  private window: BrowserWindow | null = null
  private readonly stateFile: string
  private saveTimer: NodeJS.Timeout | null = null
  private forceClose = false

  constructor(
    private readonly requestClose: () => Promise<boolean>,
    private readonly logger: Logger,
    private readonly callbacks: WindowCallbacks
  ) {
    this.stateFile = join(app.getPath('userData'), 'window-state.json')
  }

  get(): BrowserWindow | null {
    return this.window
  }

  async create(): Promise<BrowserWindow> {
    if (this.window && !this.window.isDestroyed()) {
      return this.window
    }
    const state = await this.loadState()
    const visible = isVisibleOnSomeDisplay(state)
    const isMac = process.platform === 'darwin'
    const window = new BrowserWindow({
      width: clamp(state.width, 960, 4096),
      height: clamp(state.height, 600, 4096),
      ...(visible ? { x: state.x, y: state.y } : {}),
      minWidth: 960,
      minHeight: 600,
      show: false,
      frame: isMac,
      titleBarStyle: isMac ? 'hiddenInset' : undefined,
      trafficLightPosition: isMac ? { x: 16, y: 18 } : undefined,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b0d12' : '#f6f7fb',
      title: APP_CONFIG.productName,
      icon: this.iconPath(),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        spellcheck: false,
        devTools: !app.isPackaged
      }
    })

    this.window = window
    this.forceClose = false

    if (state.maximized) {
      window.maximize()
    }
    if (state.fullScreen) {
      window.setFullScreen(true)
    }

    window.on('close', (event) => {
      if (this.forceClose) {
        this.persistState()
        return
      }
      event.preventDefault()
      void this.requestClose().then((allow) => {
        if (!allow) {
          this.callbacks.onCloseDenied()
          return
        }
        this.forceClose = true
        window.close()
      })
    })

    window.on('closed', () => {
      if (this.window === window) {
        this.window = null
      }
    })

    window.on('maximize', () => {
      this.send('window:maximized', true)
      this.scheduleSave()
    })
    window.on('unmaximize', () => {
      this.send('window:maximized', false)
      this.scheduleSave()
    })
    window.on('enter-full-screen', () => this.send('window:fullscreen-changed', true))
    window.on('leave-full-screen', () => this.send('window:fullscreen-changed', false))
    window.on('resize', () => this.scheduleSave())
    window.on('move', () => this.scheduleSave())

    window.once('ready-to-show', () => {
      window.show()
    })

    window.webContents.on('render-process-gone', (_event, details) => {
      this.logger.error('window', 'renderer process gone', details)
      this.callbacks.onRendererGone(details.reason)
    })
    window.webContents.on('unresponsive', () => {
      this.logger.warn('window', 'renderer unresponsive')
      this.callbacks.onUnresponsive()
    })
    window.webContents.on('did-fail-load', (_event, code, description, url) => {
      this.logger.error('window', `failed to load ${url} (${code}): ${description}`)
    })

    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl) {
      await window.loadURL(devUrl)
    } else {
      await window.loadURL('app://bundle/index.html')
    }

    if (process.env.MISK_DEVTOOLS === '1') {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    return window
  }

  focus(): void {
    if (!this.window || this.window.isDestroyed()) {
      return
    }
    if (this.window.isMinimized()) {
      this.window.restore()
    }
    this.window.show()
    this.window.focus()
  }

  send(channel: string, payload: unknown): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, payload)
    }
  }

  isMaximized(): boolean {
    return this.window?.isMaximized() ?? false
  }

  minimize(): void {
    this.window?.minimize()
  }

  toggleMaximize(): boolean {
    if (!this.window) {
      return false
    }
    if (this.window.isMaximized()) {
      this.window.unmaximize()
    } else {
      this.window.maximize()
    }
    return this.window.isMaximized()
  }

  close(): void {
    this.window?.close()
  }

  forceCloseWindow(): void {
    this.forceClose = true
    this.window?.close()
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    await this.persistState()
  }

  private iconPath(): string {
    return app.isPackaged
      ? join(process.resourcesPath, 'icon.png')
      : join(__dirname, '../../build/icon.png')
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.persistState()
    }, 300)
  }

  private async loadState(): Promise<WindowState> {
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8')
      const parsed = JSON.parse(raw) as Partial<WindowState>
      return {
        x: typeof parsed.x === 'number' ? parsed.x : undefined,
        y: typeof parsed.y === 'number' ? parsed.y : undefined,
        width: typeof parsed.width === 'number' ? parsed.width : DEFAULT_STATE.width,
        height: typeof parsed.height === 'number' ? parsed.height : DEFAULT_STATE.height,
        maximized: Boolean(parsed.maximized),
        fullScreen: Boolean(parsed.fullScreen)
      }
    } catch {
      return DEFAULT_STATE
    }
  }

  private async persistState(): Promise<void> {
    if (!this.window || this.window.isDestroyed()) {
      return
    }
    // Save the restored bounds so a maximized/full-screen window does not
    // reopen at screen size after the user un-maximizes it.
    const bounds = this.window.getNormalBounds()
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: this.window.isMaximized(),
      fullScreen: this.window.isFullScreen()
    }
    try {
      await writeFileAtomic(this.stateFile, `${JSON.stringify(state, null, 2)}\n`)
    } catch (error) {
      this.logger.warn('window', 'failed to save window state', error)
    }
  }
}
