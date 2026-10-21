import type { MenuRole } from '@shared/menu'
import { type Disposable, disposable } from '../disposable'
import type { LocalizedText } from '../types'

export type MenuId = 'file' | 'edit' | 'view' | 'window' | 'help'

export interface MenuItemDefinition {
  id?: string
  label?: LocalizedText
  command?: string
  args?: unknown
  role?: MenuRole
  separator?: boolean
  submenu?: MenuItemDefinition[]
  dynamicItems?: () => MenuItemDefinition[]
  checked?: boolean | (() => boolean)
  enabled?: boolean | (() => boolean)
  visible?: boolean | (() => boolean)
  order?: number
}

export class MenuRegistry {
  private readonly menus = new Map<MenuId, MenuItemDefinition[]>()

  add(menu: MenuId, item: MenuItemDefinition): Disposable {
    const items = this.menus.get(menu) ?? []
    items.push(item)
    this.menus.set(menu, items)
    return disposable(() => {
      const current = this.menus.get(menu)
      if (!current) {
        return
      }
      const index = current.indexOf(item)
      if (index >= 0) {
        current.splice(index, 1)
      }
    })
  }

  items(menu: MenuId): MenuItemDefinition[] {
    return [...(this.menus.get(menu) ?? [])].sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }
}

export const menuRegistry = new MenuRegistry()
