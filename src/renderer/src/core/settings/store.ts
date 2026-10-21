import {
  type AppSettings,
  defaultSettings,
  mergeSettings,
  type SettingsPatch
} from '@shared/settings/schema'
import { create } from 'zustand'
import { i18n } from '../i18n'
import { notify } from '../toast/store'

interface SettingsState {
  settings: AppSettings
  ready: boolean
  set: (settings: AppSettings) => void
  patch: (patch: SettingsPatch) => Promise<AppSettings>
  reset: () => Promise<AppSettings>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  ready: false,
  set: (settings) => {
    set({ settings, ready: true })
  },
  patch: async (patch) => {
    const previous = get().settings
    const optimistic = mergeSettings(previous, patch)
    set({ settings: optimistic })
    try {
      const saved = await window.misk.settings.patch(patch)
      set({ settings: saved })
      return saved
    } catch (error) {
      set({ settings: previous })
      notify(
        i18n.t('toast.settingsFailed', {
          message: error instanceof Error ? error.message : String(error)
        }),
        'error'
      )
      throw error
    }
  },
  reset: async () => {
    const saved = await window.misk.settings.reset()
    set({ settings: saved })
    return saved
  }
}))
