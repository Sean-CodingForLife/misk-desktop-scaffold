import { formatKeybinding, toElectronAccelerator } from '@shared/keybindings'
import type { MenuNode, MenuRole } from '@shared/menu'
import type { RecentWorkspace } from '@shared/settings/schema'
import { bindingFor } from '../commands/bindings'
import { commandRegistry } from '../commands/registry'
import { translateText } from '../i18n'
import type { WhenContext } from '../types'
import { type MenuId, type MenuItemDefinition, menuRegistry } from './registry'

export interface MenuItemModel {
  kind: 'separator' | 'item' | 'submenu'
  label?: string
  command?: string
  args?: unknown
  role?: MenuRole
  accelerator?: string
  displayAccelerator?: string
  enabled?: boolean
  checked?: boolean
  items?: MenuItemModel[]
}

export interface MenuSectionModel {
  id: MenuId
  label: string
  items: MenuItemModel[]
}

const SECTION_ORDER: MenuId[] = ['file', 'edit', 'view', 'window', 'help']
const SECTION_LABELS: Record<MenuId, string> = {
  file: 'menu.file',
  edit: 'menu.edit',
  view: 'menu.view',
  window: 'menu.window',
  help: 'menu.help'
}

interface BuildContext {
  when: WhenContext
  platform: string
  keybindings: Record<string, string | null>
  recent: RecentWorkspace[]
}

function evaluate(value: boolean | (() => boolean) | undefined, fallback: boolean): boolean {
  if (typeof value === 'function') {
    try {
      return value()
    } catch {
      return fallback
    }
  }
  return value ?? fallback
}

function buildItems(items: MenuItemDefinition[], context: BuildContext): MenuItemModel[] {
  const result: MenuItemModel[] = []
  for (const item of items) {
    if (item.visible !== undefined && !evaluate(item.visible, true)) {
      continue
    }
    if (item.separator) {
      result.push({ kind: 'separator' })
      continue
    }
    const children = item.submenu ?? item.dynamicItems?.()
    if (children) {
      result.push({
        kind: 'submenu',
        label: translateText(item.label),
        items: buildItems(children, context)
      })
      continue
    }
    const command = item.command ? commandRegistry.get(item.command) : undefined
    const label = item.label
      ? translateText(item.label)
      : command
        ? translateText(command.title)
        : ''
    if (item.role) {
      result.push({
        kind: 'item',
        label,
        role: item.role,
        enabled: evaluate(item.enabled, true)
      })
      continue
    }
    if (!item.command || !label) {
      continue
    }
    const binding = command ? bindingFor(command, context.keybindings) : null
    const enabledByWhen = command?.when ? command.when(context.when) : true
    result.push({
      kind: 'item',
      label,
      command: item.command,
      args: item.args,
      enabled: evaluate(item.enabled, enabledByWhen),
      ...(item.checked !== undefined ? { checked: evaluate(item.checked, false) } : {}),
      ...(binding
        ? {
            accelerator: toElectronAccelerator(binding) ?? undefined,
            displayAccelerator: formatKeybinding(binding, context.platform)
          }
        : {})
    })
  }
  return result
}

export function buildMenuSections(context: BuildContext): MenuSectionModel[] {
  return SECTION_ORDER.map((id) => ({
    id,
    label: translateText({ key: SECTION_LABELS[id] }),
    items: buildItems(menuRegistry.items(id), context)
  }))
}

function toNode(item: MenuItemModel): MenuNode | null {
  if (item.kind === 'separator') {
    return { kind: 'separator' }
  }
  if (item.kind === 'submenu') {
    return {
      kind: 'submenu',
      label: item.label ?? '',
      items: (item.items ?? []).map(toNode).filter((node): node is MenuNode => node !== null)
    }
  }
  if (!item.label) {
    return null
  }
  return {
    kind: 'item',
    label: item.label,
    command: item.command,
    args: item.args,
    role: item.role,
    accelerator: item.accelerator,
    displayAccelerator: item.displayAccelerator,
    enabled: item.enabled,
    checked: item.checked
  }
}

export function toNativeTemplate(sections: MenuSectionModel[]): MenuNode[] {
  return sections.map((section) => ({
    kind: 'submenu',
    label: section.label,
    items: section.items.map(toNode).filter((node): node is MenuNode => node !== null)
  }))
}
