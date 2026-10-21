import type { AppInfo } from '@shared/ipc/contract'
import { commandRegistry } from '../commands/registry'
import { homeRegistry } from '../home/registry'
import { addModuleResources } from '../i18n'
import { menuRegistry } from '../menus/registry'
import { panelRegistry } from '../panels/registry'
import { settingsSectionRegistry } from '../settings/sections'
import { statusRegistry } from '../status/registry'
import { notify } from '../toast/store'
import type { Disposable } from '../types'
import { viewRegistry } from '../views/registry'
import {
  defineModule,
  type ModuleContext,
  type ModuleDefinition,
  type ModuleStatus,
  moduleStatuses
} from './types'

function log(
  level: 'info' | 'warn' | 'error',
  scope: string,
  message: string,
  meta?: unknown
): void {
  const method = level === 'info' ? console.info : level === 'warn' ? console.warn : console.error
  method(`[${scope}] ${message}`, meta ?? '')
  window.misk.log.write({ level, scope, message, meta })
}

function orderModules(modules: ModuleDefinition[]): ModuleDefinition[] {
  const byId = new Map<string, ModuleDefinition>()
  for (const module of modules) {
    if (byId.has(module.id)) {
      throw new Error(`[modules] duplicate id: ${module.id}`)
    }
    byId.set(module.id, module)
  }
  const ordered: ModuleDefinition[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (module: ModuleDefinition): void => {
    if (visited.has(module.id)) {
      return
    }
    if (visiting.has(module.id)) {
      throw new Error(`[modules] dependency cycle at ${module.id}`)
    }
    visiting.add(module.id)
    for (const dependency of module.dependsOn ?? []) {
      const target = byId.get(dependency)
      if (!target) {
        throw new Error(`[modules] ${module.id} depends on missing module ${dependency}`)
      }
      visit(target)
    }
    visiting.delete(module.id)
    visited.add(module.id)
    ordered.push(module)
  }
  for (const module of modules) {
    visit(module)
  }
  return ordered
}

export async function activateModules(
  modules: ModuleDefinition[],
  appInfo: AppInfo
): Promise<ModuleStatus[]> {
  moduleStatuses.length = 0
  let ordered: ModuleDefinition[]
  try {
    ordered = orderModules(modules)
  } catch (error) {
    log('error', 'modules', error instanceof Error ? error.message : String(error))
    moduleStatuses.push({
      id: 'modules',
      name: 'Module graph',
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
    return moduleStatuses
  }

  for (const module of ordered) {
    const tracked: Disposable[] = []
    const track = (disposable: Disposable): Disposable => {
      tracked.push(disposable)
      return disposable
    }
    const context: ModuleContext = {
      views: { register: (definition) => track(viewRegistry.register(definition)) },
      commands: { register: (command) => track(commandRegistry.register(command)) },
      panels: { register: (panel) => track(panelRegistry.register(panel)) },
      status: { register: (item) => track(statusRegistry.register(item)) },
      settings: { register: (section) => track(settingsSectionRegistry.register(section)) },
      menus: { add: (menu, item) => track(menuRegistry.add(menu, item)) },
      home: { set: (component) => homeRegistry.set(component) },
      i18n: {
        add: (locale, namespace, messages) => {
          addModuleResources(locale, namespace, messages)
          if (namespace !== 'core') {
            // Module keys are also mirrored into the core namespace so a plain
            // useTranslation() works in shared shell UI.
            addModuleResources(locale, 'core', messages)
          }
        }
      },
      notifications: { notify },
      logger: {
        info: (scope, message, meta) => log('info', scope, message, meta),
        warn: (scope, message, meta) => log('warn', scope, message, meta),
        error: (scope, message, meta) => log('error', scope, message, meta)
      },
      app: appInfo,
      track
    }
    try {
      await module.activate(context)
      moduleStatuses.push({ id: module.id, name: module.name, ok: true })
    } catch (error) {
      for (const disposable of tracked.reverse()) {
        disposable.dispose()
      }
      const message = error instanceof Error ? error.message : String(error)
      moduleStatuses.push({ id: module.id, name: module.name, ok: false, error: message })
      log('error', 'modules', `failed to activate ${module.id}: ${message}`)
    }
  }
  return moduleStatuses
}

export { defineModule }
