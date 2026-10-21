import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ZodType } from 'zod'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type ToastKind = 'info' | 'success' | 'warning' | 'error'
export type TextDirection = 'ltr' | 'rtl'

export type LocalizedText = string | { key: string; ns?: string; fallback?: string }

export type ViewParams = Record<string, string | number | boolean | undefined>

export interface Disposable {
  dispose: () => void
}

export interface ViewProps<P extends ViewParams = ViewParams> {
  instanceId: string
  params: P
  isActive: boolean
  setTitle: (title: string) => void
}

export interface ViewDefinition<P extends ViewParams = ViewParams> {
  id: string
  title: LocalizedText
  icon?: LucideIcon
  component?: ComponentType<ViewProps<P>>
  load?: () => Promise<{ default: ComponentType<ViewProps<P>> }>
  params?: ZodType<P>
  singleton?: boolean
  dedupeParams?: boolean
  keepAlive?: boolean
  restorable?: boolean | ((params: P) => boolean)
}

export interface TabInstance {
  id: string
  viewId: string
  params: ViewParams
  title: string
  customTitle?: boolean
}

export interface PanelDefinition {
  id: string
  title: LocalizedText
  icon: LucideIcon
  order?: number
  component: ComponentType
}

export interface StatusItemDefinition {
  id: string
  align?: 'left' | 'right'
  order?: number
  component: ComponentType
}

export interface SettingsSectionDefinition {
  id: string
  title: LocalizedText
  keywords?: string[]
  order?: number
  component: ComponentType
}

export interface WhenContext {
  activeViewId?: string
  activeViewParams?: ViewParams
  workspaceOpen: boolean
  paletteOpen: boolean
  quickSwitcherOpen: boolean
  modalOpen: boolean
}
