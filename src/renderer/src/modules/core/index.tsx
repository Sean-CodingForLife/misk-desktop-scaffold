import { commandRegistry } from '@renderer/core/commands/registry'
import { resetLayout } from '@renderer/core/layout'
import { defineModule, moduleStatuses } from '@renderer/core/modules/types'
import { activateTab } from '@renderer/core/navigation'
import { panelRegistry } from '@renderer/core/panels/registry'
import { tabKey, useRouteStore } from '@renderer/core/route/store'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useTabsStore } from '@renderer/core/tabs/store'
import { viewRegistry } from '@renderer/core/views/registry'
import { APP_CONFIG } from '@shared/app-config'
import {
  BookOpen,
  Bug,
  Command,
  FileQuestion,
  Home,
  Info,
  Laptop,
  Layers,
  LogOut,
  Moon,
  RotateCcw,
  Save,
  Settings,
  Sun,
  X
} from 'lucide-react'
import { z } from 'zod'
import { HomeView } from './HomeView'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'
import {
  AboutSection,
  AdvancedSection,
  AppearanceSection,
  KeybindingsSection,
  LanguageSection,
  WorkspaceSection
} from './SettingsSections'
import { type SettingsParams, SettingsView } from './SettingsView'

function cycleTab(delta: number): void {
  const tabs = useTabsStore.getState().tabs
  if (tabs.length < 2) {
    return
  }
  const activeKey = useRouteStore.getState().key
  const index = tabs.findIndex((tab) => tabKey(tab.viewId, tab.params) === activeKey)
  const next = tabs[(index + delta + tabs.length) % tabs.length]
  if (next) {
    activateTab(next)
  }
}

function diagnosticsSnapshot() {
  return {
    modules: moduleStatuses,
    views: viewRegistry.list().map((view) => view.id),
    commands: commandRegistry.list().map((command) => command.id),
    panels: panelRegistry.list().map((panel) => panel.id)
  }
}

export const coreModule = defineModule({
  id: 'core',
  name: { key: 'module.core.name', ns: 'core', fallback: 'Core' },
  description: {
    key: 'module.core.description',
    ns: 'core',
    fallback: 'Shell chrome, home, settings, commands and appearance.'
  },
  activate: (ctx) => {
    ctx.i18n.add('en-US', 'core', enUS)
    ctx.i18n.add('zh-CN', 'core', zhCN)

    ctx.home.set(HomeView)

    ctx.views.register<SettingsParams>({
      id: 'core.settings',
      title: { key: 'settings.title' },
      icon: Settings,
      component: SettingsView,
      params: z.object({ section: z.string().optional() }),
      singleton: true
    })

    ctx.commands.register({
      id: 'view.home',
      title: { key: 'menu.home' },
      category: { key: 'menu.view' },
      icon: Home,
      defaultKeybinding: 'Mod+Shift+H',
      run: (runtime) => runtime.navigateHome()
    })

    ctx.commands.register({
      id: 'view.commandPalette',
      title: { key: 'menu.commandPalette' },
      category: { key: 'menu.view' },
      icon: Command,
      defaultKeybinding: 'Mod+Shift+P',
      run: (runtime) => runtime.openCommandPalette()
    })

    ctx.commands.register({
      id: 'view.quickSwitcher',
      title: { key: 'menu.quickSwitcher' },
      category: { key: 'menu.view' },
      defaultKeybinding: 'Mod+P',
      run: (runtime) => runtime.openQuickSwitcher()
    })

    ctx.commands.register({
      id: 'view.toggleSidebar',
      title: { key: 'menu.toggleSidebar' },
      category: { key: 'menu.view' },
      defaultKeybinding: 'Mod+B',
      icon: Layers,
      run: (runtime) => runtime.toggleSidebar()
    })

    ctx.commands.register({
      id: 'view.closeTab',
      title: { key: 'menu.closeTab' },
      category: { key: 'menu.file' },
      defaultKeybinding: 'Mod+W',
      icon: X,
      run: (runtime) => runtime.closeActiveTab()
    })

    ctx.commands.register({
      id: 'view.nextTab',
      title: { key: 'menu.nextTab' },
      category: { key: 'menu.view' },
      defaultKeybinding: 'Ctrl+Tab',
      run: () => cycleTab(1)
    })

    ctx.commands.register({
      id: 'view.prevTab',
      title: { key: 'menu.prevTab' },
      category: { key: 'menu.view' },
      defaultKeybinding: 'Ctrl+Shift+Tab',
      run: () => cycleTab(-1)
    })

    ctx.commands.register({
      id: 'view.resetLayout',
      title: { key: 'menu.resetLayout' },
      category: { key: 'menu.view' },
      icon: RotateCcw,
      run: () => resetLayout()
    })

    ctx.commands.register({
      id: 'settings.open',
      title: { key: 'settings.title' },
      category: { key: 'menu.view' },
      icon: Settings,
      defaultKeybinding: 'Mod+,',
      args: z.object({ section: z.string().optional() }).default({}),
      run: (runtime, args) => runtime.openSettings(args.section)
    })

    ctx.commands.register({
      id: 'theme.system',
      title: { key: 'menu.appearanceSystem' },
      category: { key: 'menu.appearance' },
      icon: Laptop,
      run: (runtime) => runtime.setTheme('system')
    })

    ctx.commands.register({
      id: 'theme.light',
      title: { key: 'menu.appearanceLight' },
      category: { key: 'menu.appearance' },
      icon: Sun,
      run: (runtime) => runtime.setTheme('light')
    })

    ctx.commands.register({
      id: 'theme.dark',
      title: { key: 'menu.appearanceDark' },
      category: { key: 'menu.appearance' },
      icon: Moon,
      run: (runtime) => runtime.setTheme('dark')
    })

    ctx.commands.register({
      id: 'help.shortcuts',
      title: { key: 'menu.keyboardShortcuts' },
      category: { key: 'menu.help' },
      defaultKeybinding: 'F1',
      icon: Command,
      run: (runtime) => runtime.openShortcuts()
    })

    ctx.commands.register({
      id: 'help.about',
      title: { key: 'menu.about' },
      category: { key: 'menu.help' },
      icon: Info,
      run: (runtime) => runtime.openSettings('about')
    })

    ctx.commands.register({
      id: 'help.documentation',
      title: { key: 'menu.documentation' },
      category: { key: 'menu.help' },
      icon: BookOpen,
      run: () => void window.misk.app.openExternal(APP_CONFIG.repository)
    })

    ctx.commands.register({
      id: 'help.reportIssue',
      title: { key: 'menu.reportIssue' },
      category: { key: 'menu.help' },
      icon: Bug,
      run: () => void window.misk.app.openExternal(`${APP_CONFIG.repository}/issues`)
    })

    ctx.commands.register({
      id: 'app.openLogs',
      title: { key: 'settings.openLogs' },
      category: { key: 'settings.advanced' },
      icon: FileQuestion,
      run: () => void window.misk.app.openLogs()
    })

    ctx.commands.register({
      id: 'app.exit',
      title: { key: 'menu.exit' },
      category: { key: 'menu.file' },
      icon: LogOut,
      run: (runtime) => runtime.quit()
    })

    ctx.commands.register({
      id: 'diagnostics.export',
      title: { key: 'settings.diagnostics' },
      category: { key: 'settings.advanced' },
      icon: Save,
      run: async () => {
        const result = await window.misk.diagnostics.export(diagnosticsSnapshot())
        if (!result.canceled && result.path) {
          ctx.notifications.notify(`Diagnostics saved to ${result.path}`, 'success')
        }
      }
    })

    ctx.commands.register({
      id: 'settings.export',
      title: { key: 'settings.export' },
      category: { key: 'settings.advanced' },
      icon: Save,
      run: async () => {
        const result = await window.misk.settings.export()
        if (!result.canceled && result.path) {
          ctx.notifications.notify(`Exported to ${result.path}`, 'success')
        }
      }
    })

    ctx.commands.register({
      id: 'settings.import',
      title: { key: 'settings.import' },
      category: { key: 'settings.advanced' },
      icon: Save,
      run: async () => {
        const result = await window.misk.settings.import()
        if (!result.canceled) {
          if (result.settings) {
            useSettingsStore.getState().set(result.settings)
          }
          ctx.notifications.notify('Settings imported', 'success')
        }
      }
    })

    ctx.settings.register({
      id: 'appearance',
      title: { key: 'settings.appearance' },
      order: 10,
      component: AppearanceSection
    })
    ctx.settings.register({
      id: 'language',
      title: { key: 'settings.language' },
      order: 20,
      component: LanguageSection
    })
    ctx.settings.register({
      id: 'keybindings',
      title: { key: 'settings.keybindings' },
      order: 30,
      component: KeybindingsSection
    })
    ctx.settings.register({
      id: 'workspace',
      title: { key: 'settings.workspace' },
      order: 40,
      component: WorkspaceSection
    })
    ctx.settings.register({
      id: 'advanced',
      title: { key: 'settings.advanced' },
      order: 50,
      component: AdvancedSection
    })
    ctx.settings.register({
      id: 'about',
      title: { key: 'settings.about' },
      order: 90,
      component: AboutSection
    })

    ctx.menus.add('file', { separator: true, order: 90 })
    ctx.menus.add('file', { command: 'view.closeTab', order: 40 })
    ctx.menus.add('file', { command: 'app.exit', order: 100 })

    ctx.menus.add('edit', { role: 'undo', label: { key: 'menu.undo' }, order: 10 })
    ctx.menus.add('edit', { role: 'redo', label: { key: 'menu.redo' }, order: 20 })
    ctx.menus.add('edit', { separator: true, order: 30 })
    ctx.menus.add('edit', { role: 'cut', label: { key: 'menu.cut' }, order: 40 })
    ctx.menus.add('edit', { role: 'copy', label: { key: 'menu.copy' }, order: 50 })
    ctx.menus.add('edit', { role: 'paste', label: { key: 'menu.paste' }, order: 60 })
    ctx.menus.add('edit', { role: 'selectAll', label: { key: 'menu.selectAll' }, order: 70 })

    ctx.menus.add('view', { command: 'view.commandPalette', order: 10 })
    ctx.menus.add('view', { command: 'view.quickSwitcher', order: 20 })
    ctx.menus.add('view', { command: 'view.home', order: 30 })
    ctx.menus.add('view', { separator: true, order: 40 })
    ctx.menus.add('view', { command: 'view.toggleSidebar', order: 50 })
    ctx.menus.add('view', {
      label: { key: 'menu.appearance' },
      order: 60,
      submenu: [
        {
          command: 'theme.system',
          checked: () => useSettingsStore.getState().settings.appearance.theme === 'system'
        },
        {
          command: 'theme.light',
          checked: () => useSettingsStore.getState().settings.appearance.theme === 'light'
        },
        {
          command: 'theme.dark',
          checked: () => useSettingsStore.getState().settings.appearance.theme === 'dark'
        }
      ]
    })
    ctx.menus.add('view', { command: 'view.resetLayout', order: 70 })

    ctx.menus.add('window', { role: 'minimize', label: { key: 'window.minimize' }, order: 10 })
    ctx.menus.add('window', { role: 'zoom', label: { key: 'window.maximize' }, order: 20 })
    ctx.menus.add('window', { role: 'close', label: { key: 'window.close' }, order: 30 })

    ctx.menus.add('help', { command: 'help.shortcuts', order: 10 })
    ctx.menus.add('help', { command: 'help.documentation', order: 20 })
    ctx.menus.add('help', { command: 'help.reportIssue', order: 30 })
    ctx.menus.add('help', { separator: true, order: 40 })
    ctx.menus.add('help', { command: 'help.about', order: 50 })
  }
})
