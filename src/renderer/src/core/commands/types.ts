import type { AppInfo, WorkspaceInfo } from '@shared/ipc/contract'
import type { LucideIcon } from 'lucide-react'
import type { ZodType } from 'zod'
import type {
  Disposable,
  LocalizedText,
  ThemeMode,
  ToastKind,
  ViewParams,
  WhenContext
} from '../types'

export interface CommandRuntime {
  appInfo: AppInfo
  platform: string
  getActiveView: () => { viewId: string; params: ViewParams } | undefined
  getWorkspace: () => WorkspaceInfo | null
  getWhenContext: () => WhenContext
  openView: (viewId: string, params?: ViewParams) => void
  navigateHome: () => void
  closeTab: (id: string) => void
  closeActiveTab: () => void
  openSettings: (section?: string) => void
  openCommandPalette: () => void
  openQuickSwitcher: () => void
  openShortcuts: () => void
  toggleSidebar: (panelId?: string) => void
  setTheme: (mode: ThemeMode) => void
  notify: (message: string, kind?: ToastKind) => void
  openWorkspace: () => Promise<void>
  openRecentWorkspace: (id: string) => Promise<void>
  closeWorkspace: () => Promise<void>
  invalidateWorkspace: () => Promise<void>
  quit: () => void
  executeCommand: (id: string, args?: unknown) => Promise<boolean>
}

export interface Command<A = void> {
  id: string
  title: LocalizedText
  category?: LocalizedText
  icon?: LucideIcon
  defaultKeybinding?: string
  hidden?: boolean
  args?: ZodType<A>
  when?: (context: WhenContext) => boolean
  run: (runtime: CommandRuntime, args: A) => void | Promise<void>
}

export type CommandContext = CommandRuntime

export type CommandDisposable = Disposable
