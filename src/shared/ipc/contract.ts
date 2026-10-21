import { z } from 'zod'
import { LOG_LEVELS } from '../constants'
import { menuRoleSchema, menuTemplateSchema } from '../menu'
import { sessionParamsSchema, sessionSchema } from '../session/schema'
import { settingsPatchSchema, settingsSchema } from '../settings/schema'

export const fileEncodingSchema = z.enum(['utf8', 'base64'])
export type FileEncoding = z.infer<typeof fileEncodingSchema>

export const fileFilterSchema = z.object({
  name: z.string().min(1),
  extensions: z.array(z.string().min(1)).min(1)
})
export type FileFilter = z.infer<typeof fileFilterSchema>

export const appInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  electron: z.string(),
  chrome: z.string(),
  node: z.string(),
  platform: z.string(),
  arch: z.string(),
  locale: z.string(),
  repository: z.string(),
  userDataPath: z.string(),
  logsPath: z.string()
})
export type AppInfo = z.infer<typeof appInfoSchema>

export const fileHandleInfoSchema = z.object({
  handle: z.string().min(1),
  kind: z.enum(['file', 'directory']),
  name: z.string(),
  path: z.string()
})
export type FileHandleInfo = z.infer<typeof fileHandleInfoSchema>

export const fileContentSchema = z.object({
  content: z.string(),
  encoding: fileEncodingSchema,
  size: z.number().int().nonnegative(),
  truncated: z.boolean()
})
export type FileContent = z.infer<typeof fileContentSchema>

export const fileStatSchema = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.enum(['file', 'directory']),
  size: z.number().int().nonnegative(),
  mtimeMs: z.number().nonnegative()
})
export type FileStat = z.infer<typeof fileStatSchema>

export const workspaceInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  path: z.string()
})
export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>

export const workspaceEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  kind: z.enum(['file', 'directory']),
  size: z.number().int().nonnegative(),
  mtimeMs: z.number().nonnegative(),
  hidden: z.boolean()
})
export type WorkspaceEntry = z.infer<typeof workspaceEntrySchema>

export const workspaceListResultSchema = z.object({
  entries: z.array(workspaceEntrySchema),
  truncated: z.boolean()
})
export type WorkspaceListResult = z.infer<typeof workspaceListResultSchema>

export const workspaceReadResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), content: z.string(), size: z.number().int().nonnegative() }),
  z.object({
    kind: z.literal('image'),
    dataUrl: z.string(),
    mime: z.string(),
    size: z.number().int().nonnegative()
  }),
  z.object({
    kind: z.literal('binary'),
    mime: z.string(),
    size: z.number().int().nonnegative()
  }),
  z.object({
    kind: z.literal('too-large'),
    size: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative()
  })
])
export type WorkspaceReadResult = z.infer<typeof workspaceReadResultSchema>

export const workspaceChangeSchema = z.object({
  id: z.string(),
  changes: z
    .array(
      z.object({
        path: z.string(),
        type: z.enum(['add', 'change', 'unlink'])
      })
    )
    .max(200)
})
export type WorkspaceChange = z.infer<typeof workspaceChangeSchema>

export const notificationActionSchema = z.object({
  viewId: z.string().min(1),
  params: sessionParamsSchema.optional()
})
export type NotificationAction = z.infer<typeof notificationActionSchema>

export const notificationSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().max(2000),
  silent: z.boolean().optional(),
  action: notificationActionSchema.optional()
})
export type NotificationRequest = z.infer<typeof notificationSchema>

export const closeRequestSchema = z.object({ requestId: z.string() })
export const closeResponseSchema = z.object({
  requestId: z.string(),
  allow: z.boolean()
})

export const appOpenFileSchema = z.object({
  handle: z.string().min(1),
  name: z.string(),
  kind: z.enum(['file', 'directory'])
})

export const menuCommandSchema = z.object({
  id: z.string().min(1),
  args: z.unknown().optional()
})

export const logEntrySchema = z.object({
  level: z.enum(LOG_LEVELS),
  scope: z.string().min(1).max(40),
  message: z.string().min(1).max(8192),
  meta: z.unknown().optional()
})

export const settingsImportResultSchema = z.object({
  canceled: z.boolean(),
  settings: settingsSchema.optional()
})
export type SettingsImportResult = z.infer<typeof settingsImportResultSchema>

export const exportResultSchema = z.object({
  canceled: z.boolean(),
  path: z.string().optional()
})
export type ExportResult = z.infer<typeof exportResultSchema>

export const ipcContract = {
  'app:get-info': { input: z.void(), output: appInfoSchema },
  'app:quit': { input: z.void(), output: z.void() },
  'app:open-logs': { input: z.void(), output: z.void() },
  'app:open-external': { input: z.object({ url: z.string().min(1) }), output: z.void() },

  'window:minimize': { input: z.void(), output: z.void() },
  'window:toggle-maximize': { input: z.void(), output: z.boolean() },
  'window:close': { input: z.void(), output: z.void() },
  'window:is-maximized': { input: z.void(), output: z.boolean() },

  'settings:get': { input: z.void(), output: settingsSchema },
  'settings:patch': { input: settingsPatchSchema, output: settingsSchema },
  'settings:reset': { input: z.void(), output: settingsSchema },
  'settings:export': { input: z.void(), output: exportResultSchema },
  'settings:import': { input: z.void(), output: settingsImportResultSchema },

  'secrets:set': {
    input: z.object({ key: z.string().min(1).max(120), value: z.string().max(65536) }),
    output: z.void()
  },
  'secrets:get': { input: z.object({ key: z.string().min(1) }), output: z.string().nullable() },
  'secrets:delete': { input: z.object({ key: z.string().min(1) }), output: z.void() },
  'secrets:keys': { input: z.void(), output: z.array(z.string()) },

  'storage:read': { input: z.object({ key: z.string().min(1) }), output: z.unknown().nullable() },
  'storage:write': {
    input: z.object({ key: z.string().min(1), value: z.unknown() }),
    output: z.void()
  },
  'storage:delete': { input: z.object({ key: z.string().min(1) }), output: z.void() },
  'storage:keys': { input: z.void(), output: z.array(z.string()) },

  'session:get': { input: z.void(), output: sessionSchema },
  'session:patch': {
    input: z.object({
      tabs: sessionSchema.shape.tabs.optional(),
      activeIndex: z.number().int().min(-1).optional()
    }),
    output: sessionSchema
  },

  'files:open-dialog': {
    input: z.object({
      kind: z.enum(['file', 'directory']),
      filters: z.array(fileFilterSchema).optional()
    }),
    output: fileHandleInfoSchema.nullable()
  },
  'files:save-as': {
    input: z.object({
      handle: z.string().optional(),
      defaultName: z.string().min(1),
      filters: z.array(fileFilterSchema).optional(),
      content: z.string(),
      encoding: fileEncodingSchema.optional()
    }),
    output: fileHandleInfoSchema.nullable()
  },
  'files:read': {
    input: z.object({
      handle: z.string().min(1),
      maxBytes: z.number().int().positive().optional(),
      encoding: fileEncodingSchema.optional()
    }),
    output: fileContentSchema
  },
  'files:write': {
    input: z.object({
      handle: z.string().min(1),
      content: z.string(),
      encoding: fileEncodingSchema.optional()
    }),
    output: z.object({ size: z.number().int().nonnegative() })
  },
  'files:stat': { input: z.object({ handle: z.string().min(1) }), output: fileStatSchema },
  'files:close': { input: z.object({ handle: z.string().min(1) }), output: z.void() },
  'files:grant': {
    input: z.object({ paths: z.array(z.string().min(1)).min(1).max(32) }),
    output: z.array(fileHandleInfoSchema)
  },
  'files:reveal': { input: z.object({ handle: z.string().min(1) }), output: z.void() },
  'files:open-external': { input: z.object({ handle: z.string().min(1) }), output: z.void() },

  'workspace:open-dialog': { input: z.void(), output: workspaceInfoSchema.nullable() },
  'workspace:open-handle': {
    input: z.object({ handle: z.string().min(1) }),
    output: workspaceInfoSchema
  },
  'workspace:open-recent': {
    input: z.object({ id: z.string().min(1) }),
    output: workspaceInfoSchema.nullable()
  },
  'workspace:list': {
    input: z.object({ id: z.string().min(1), path: z.string().optional() }),
    output: workspaceListResultSchema
  },
  'workspace:read-file': {
    input: z.object({
      id: z.string().min(1),
      path: z.string().min(1),
      maxBytes: z.number().int().positive().optional()
    }),
    output: workspaceReadResultSchema
  },
  'workspace:find-files': {
    input: z.object({
      id: z.string().min(1),
      query: z.string().max(200),
      limit: z.number().int().min(1).max(100).optional()
    }),
    output: z.array(z.string())
  },
  'workspace:watch': { input: z.object({ id: z.string().min(1) }), output: z.void() },
  'workspace:unwatch': { input: z.object({ id: z.string().min(1) }), output: z.void() },
  'workspace:reveal': {
    input: z.object({ id: z.string().min(1), path: z.string() }),
    output: z.void()
  },
  'workspace:open-external': {
    input: z.object({ id: z.string().min(1), path: z.string() }),
    output: z.void()
  },
  'workspace:close': { input: z.object({ id: z.string().min(1) }), output: z.void() },

  'menu:update': { input: z.object({ template: menuTemplateSchema }), output: z.void() },
  'menu:popup': {
    input: z.object({
      items: menuTemplateSchema,
      x: z.number().optional(),
      y: z.number().optional()
    }),
    output: z.void()
  },
  'menu:run-role': { input: z.object({ role: menuRoleSchema }), output: z.void() },

  'notifications:show': { input: notificationSchema, output: z.void() },
  'clipboard:write-text': { input: z.object({ text: z.string() }), output: z.void() },
  'clipboard:read-text': { input: z.void(), output: z.string() },

  'diagnostics:export': {
    input: z.object({ snapshot: z.unknown().optional() }),
    output: exportResultSchema
  }
} as const

export type IpcContract = typeof ipcContract
export type Channel = keyof IpcContract
export type InputOf<C extends Channel> = z.infer<IpcContract[C]['input']>
export type OutputOf<C extends Channel> = z.infer<IpcContract[C]['output']>

export const eventSchemas = {
  'app:open-url': z.object({ url: z.string().min(1) }),
  'app:open-file': appOpenFileSchema,
  'app:before-close': closeRequestSchema,
  'app:close-response': closeResponseSchema,
  'window:maximized': z.boolean(),
  'window:fullscreen-changed': z.boolean(),
  'settings:changed': settingsSchema,
  'theme:system-changed': z.object({ shouldUseDarkColors: z.boolean() }),
  'workspace:changed': workspaceChangeSchema,
  'command:run': menuCommandSchema,
  'notifications:activated': z.object({ action: notificationActionSchema.optional() }),
  'log:write': logEntrySchema
} as const

export type EventChannel = keyof typeof eventSchemas
export type EventPayload<C extends EventChannel> = z.infer<(typeof eventSchemas)[C]>
