import { describe, expect, it } from 'vitest'
import {
  defaultSettings,
  mergeSettings,
  migrateSettings,
  settingsSchema
} from '../../src/shared/settings/schema'

describe('settings', () => {
  it('ships valid defaults', () => {
    expect(settingsSchema.safeParse(defaultSettings).success).toBe(true)
  })

  it('merges nested patches', () => {
    const next = mergeSettings(defaultSettings, {
      appearance: { theme: 'light' },
      layout: { sidebarWidth: 320 }
    })
    expect(next.appearance.theme).toBe('light')
    expect(next.appearance.accent).toBe(defaultSettings.appearance.accent)
    expect(next.layout.sidebarWidth).toBe(320)
  })

  it('replaces the keybinding map instead of deep merging it', () => {
    const withBinding = mergeSettings(defaultSettings, {
      keybindings: { 'view.home': 'Mod+H' }
    })
    expect(withBinding.keybindings).toEqual({ 'view.home': 'Mod+H' })
    const reset = mergeSettings(withBinding, { keybindings: {} })
    expect(reset.keybindings).toEqual({})
  })

  it('migrates partial or unknown data back to valid settings', () => {
    const migrated = migrateSettings({ appearance: { theme: 'dark' } })
    expect(migrated.appearance.theme).toBe('dark')
    expect(migrated.version).toBe(1)
    expect(settingsSchema.safeParse(migrated).success).toBe(true)

    const future = migrateSettings({ version: 99 })
    expect(future).toEqual(defaultSettings)
  })

  it('rejects invalid patches', () => {
    expect(() => mergeSettings(defaultSettings, { layout: { sidebarWidth: 10 } })).toThrow()
  })
})
