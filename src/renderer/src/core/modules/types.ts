import type { AppInfo } from '@shared/ipc/contract'
import type { ComponentType } from 'react'
import type { Command } from '../commands/types'
import type { MenuId, MenuItemDefinition } from '../menus/registry'
import type {
  Disposable,
  LocalizedText,
  PanelDefinition,
  SettingsSectionDefinition,
  StatusItemDefinition,
  ToastKind,
  ViewDefinition,
  ViewParams
} from '../types'

export interface ModuleContext {
  views: {
    register: <P extends ViewParams>(definition: ViewDefinition<P>) => Disposable
  }
  commands: {
    register: <A>(command: Command<A>) => Disposable
  }
  panels: {
    register: (panel: PanelDefinition) => Disposable
  }
  status: {
    register: (item: StatusItemDefinition) => Disposable
  }
  settings: {
    register: (section: SettingsSectionDefinition) => Disposable
  }
  menus: {
    add: (menu: MenuId, item: MenuItemDefinition) => Disposable
  }
  home: {
    set: (component: ComponentType) => void
  }
  i18n: {
    add: (locale: string, namespace: string, messages: Record<string, string>) => void
  }
  notifications: {
    notify: (message: string, kind?: ToastKind) => void
  }
  logger: {
    info: (scope: string, message: string, meta?: unknown) => void
    warn: (scope: string, message: string, meta?: unknown) => void
    error: (scope: string, message: string, meta?: unknown) => void
  }
  app: AppInfo
  track: (disposable: Disposable) => Disposable
}

export interface ModuleDefinition {
  id: string
  name: LocalizedText
  description?: LocalizedText
  dependsOn?: string[]
  activate: (context: ModuleContext) => void | Promise<void>
}

export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  return definition
}

export interface ModuleStatus {
  id: string
  name: LocalizedText
  ok: boolean
  error?: string
}

export const moduleStatuses: ModuleStatus[] = []
