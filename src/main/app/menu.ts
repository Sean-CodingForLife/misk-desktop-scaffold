import type { MenuNode, MenuRole } from '@shared/menu'
import { app, type BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'

function acceleratedLabel(label: string, accelerator: string | undefined): string {
  if (!accelerator) {
    return label
  }
  return `${label}    ${accelerator}`
}

export class MenuService {
  setTemplate(template: MenuNode[], window: BrowserWindow | null): void {
    if (!window || window.isDestroyed()) {
      return
    }
    const nodes: MenuNode[] = template
    const items = nodes.map((node) => this.buildNode(node))
    if (process.platform === 'darwin') {
      items.unshift({ role: 'appMenu' })
    }
    const menu = Menu.buildFromTemplate(items)
    Menu.setApplicationMenu(menu)
  }

  popup(window: BrowserWindow | null, items: MenuNode[], x?: number, y?: number): void {
    if (!window || window.isDestroyed()) {
      return
    }
    const menu = Menu.buildFromTemplate(items.map((node) => this.buildNode(node)))
    const options: Electron.PopupOptions = { window }
    if (typeof x === 'number' && typeof y === 'number') {
      options.x = Math.round(x)
      options.y = Math.round(y)
    }
    menu.popup(options)
  }

  runRole(window: BrowserWindow | null, role: MenuRole): void {
    if (!window || window.isDestroyed()) {
      return
    }
    const contents = window.webContents
    switch (role) {
      case 'undo':
        contents.undo()
        return
      case 'redo':
        contents.redo()
        return
      case 'cut':
        contents.cut()
        return
      case 'copy':
        contents.copy()
        return
      case 'paste':
        contents.paste()
        return
      case 'pasteAndMatchStyle':
        contents.pasteAndMatchStyle()
        return
      case 'delete':
        contents.delete()
        return
      case 'selectAll':
        contents.selectAll()
        return
      case 'minimize':
        window.minimize()
        return
      case 'zoom':
        if (window.isMaximized()) {
          window.unmaximize()
        } else {
          window.maximize()
        }
        return
      case 'close':
        window.close()
        return
      case 'quit':
        app.quit()
        return
      case 'togglefullscreen':
        window.setFullScreen(!window.isFullScreen())
        return
      case 'reload':
        contents.reload()
        return
      case 'toggleDevTools':
        contents.toggleDevTools()
        return
      default:
        return
    }
  }

  private buildNode(node: MenuNode): MenuItemConstructorOptions {
    if (node.kind === 'separator') {
      return { type: 'separator' }
    }
    if (node.kind === 'submenu') {
      return {
        label: node.label,
        submenu: node.items.map((item) => this.buildNode(item))
      }
    }
    if (node.role) {
      return {
        label: node.label,
        role: node.role as MenuItemConstructorOptions['role'],
        enabled: node.enabled ?? true
      }
    }
    const isMac = process.platform === 'darwin'
    const options: MenuItemConstructorOptions = {
      label: isMac
        ? acceleratedLabel(node.label, node.displayAccelerator ?? node.accelerator)
        : node.label,
      enabled: node.enabled ?? true,
      type: node.checked === undefined ? 'normal' : 'checkbox',
      checked: node.checked ?? false,
      click: (_item, focusedWindow) => {
        const target = focusedWindow as BrowserWindow | undefined
        if (!target || target.isDestroyed()) {
          return
        }
        target.webContents.send('command:run', {
          id: node.command,
          args: node.args
        })
      }
    }
    if (!isMac && node.accelerator) {
      options.accelerator = node.accelerator
      options.registerAccelerator = false
    }
    if (!node.command) {
      options.enabled = false
    }
    return options
  }
}
