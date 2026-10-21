import { z } from 'zod'
import { MENU_ROLES } from './constants'

export const menuRoleSchema = z.enum(MENU_ROLES)
export type MenuRole = z.infer<typeof menuRoleSchema>

export type MenuNode =
  | { kind: 'separator' }
  | {
      kind: 'item'
      label: string
      command?: string
      args?: unknown
      role?: MenuRole
      accelerator?: string
      displayAccelerator?: string
      enabled?: boolean
      checked?: boolean
    }
  | { kind: 'submenu'; label: string; items: MenuNode[] }

const separatorSchema = z.object({ kind: z.literal('separator') })

const itemSchema = z.object({
  kind: z.literal('item'),
  label: z.string().min(1).max(200),
  command: z.string().min(1).max(120).optional(),
  args: z.unknown().optional(),
  role: menuRoleSchema.optional(),
  accelerator: z.string().max(80).optional(),
  displayAccelerator: z.string().max(80).optional(),
  enabled: z.boolean().optional(),
  checked: z.boolean().optional()
})

export const menuNodeSchema: z.ZodType<MenuNode> = z.lazy(() =>
  z.union([
    separatorSchema,
    itemSchema,
    z.object({
      kind: z.literal('submenu'),
      label: z.string().min(1).max(200),
      items: z.array(menuNodeSchema).max(60)
    })
  ])
)

export const menuTemplateSchema = z.array(menuNodeSchema).max(10)

export interface MenuCommandPayload {
  id: string
  args?: unknown
}
