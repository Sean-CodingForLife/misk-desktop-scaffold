import { z } from 'zod'
import { ACCENTS, DENSITIES, LOG_LEVELS, MAX_RECENT_WORKSPACES, THEMES } from '../constants'
import { deepMerge } from '../utils'

export const recentWorkspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  openedAt: z.number()
})

export const settingsSchema = z.object({
  version: z.literal(1),
  appearance: z.object({
    theme: z.enum(THEMES),
    accent: z.enum(ACCENTS),
    density: z.enum(DENSITIES),
    reduceMotion: z.boolean()
  }),
  locale: z.string().min(2),
  layout: z.object({
    sidebarOpen: z.boolean(),
    sidebarWidth: z.number().min(220).max(480),
    sidebarPanel: z.string().min(1)
  }),
  keybindings: z.record(z.string(), z.string().nullable()),
  commands: z.object({
    recent: z.array(z.string()).max(8)
  }),
  workspace: z.object({
    recent: z.array(recentWorkspaceSchema).max(MAX_RECENT_WORKSPACES),
    lastId: z.string().nullable(),
    showHidden: z.boolean(),
    ignore: z.array(z.string())
  }),
  advanced: z.object({
    logLevel: z.enum(LOG_LEVELS),
    confirmOnQuit: z.boolean()
  })
})

export type AppSettings = z.infer<typeof settingsSchema>
export type RecentWorkspace = z.infer<typeof recentWorkspaceSchema>

export const defaultSettings: AppSettings = {
  version: 1,
  appearance: {
    theme: 'system',
    accent: 'violet',
    density: 'comfortable',
    reduceMotion: false
  },
  locale: 'en-US',
  layout: {
    sidebarOpen: true,
    sidebarWidth: 280,
    sidebarPanel: 'workspace.files'
  },
  keybindings: {},
  commands: {
    recent: []
  },
  workspace: {
    recent: [],
    lastId: null,
    showHidden: false,
    ignore: ['.git', 'node_modules', 'dist', 'out']
  },
  advanced: {
    logLevel: 'info',
    confirmOnQuit: true
  }
}

export const settingsPatchSchema = z.object({
  appearance: z
    .object({
      theme: z.enum(THEMES).optional(),
      accent: z.enum(ACCENTS).optional(),
      density: z.enum(DENSITIES).optional(),
      reduceMotion: z.boolean().optional()
    })
    .optional(),
  locale: z.string().min(2).optional(),
  layout: z
    .object({
      sidebarOpen: z.boolean().optional(),
      sidebarWidth: z.number().min(220).max(480).optional(),
      sidebarPanel: z.string().min(1).optional()
    })
    .optional(),
  keybindings: z.record(z.string(), z.string().nullable()).optional(),
  commands: z
    .object({
      recent: z.array(z.string()).max(8).optional()
    })
    .optional(),
  workspace: z
    .object({
      recent: z.array(recentWorkspaceSchema).max(MAX_RECENT_WORKSPACES).optional(),
      lastId: z.string().nullable().optional(),
      showHidden: z.boolean().optional(),
      ignore: z.array(z.string()).optional()
    })
    .optional(),
  advanced: z
    .object({
      logLevel: z.enum(LOG_LEVELS).optional(),
      confirmOnQuit: z.boolean().optional()
    })
    .optional()
})

export type SettingsPatch = z.infer<typeof settingsPatchSchema>

export function mergeSettings(current: AppSettings, patch: SettingsPatch): AppSettings {
  const merged = deepMerge(
    current as unknown as Record<string, unknown>,
    patch
  ) as unknown as Record<string, unknown>
  // Keybindings are a map, not a nested settings tree: a patch replaces the
  // whole map so "reset to defaults ({})" actually clears user overrides.
  if (patch.keybindings !== undefined) {
    merged.keybindings = patch.keybindings
  }
  return settingsSchema.parse(merged)
}

/**
 * Settings migrations. Version 1 is the initial schema; future versions append
 * a case here and bump `version` in the schema.
 */
export function migrateSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaultSettings
  }
  const record = raw as Record<string, unknown>
  const version = typeof record.version === 'number' ? record.version : 1
  if (version > 1) {
    return defaultSettings
  }
  const merged = deepMerge(
    defaultSettings as unknown as Record<string, unknown>,
    record
  ) as unknown as Record<string, unknown>
  const parsed = settingsSchema.safeParse(merged)
  return parsed.success ? parsed.data : defaultSettings
}
