import { type Disposable, disposable } from '../disposable'
import type { SettingsSectionDefinition } from '../types'

export class SettingsSectionRegistry {
  private readonly sections = new Map<string, SettingsSectionDefinition>()

  register(section: SettingsSectionDefinition): Disposable {
    if (!section.id) {
      throw new Error('[settings] section needs an id')
    }
    if (this.sections.has(section.id)) {
      console.warn(`[settings] duplicate section id: ${section.id}`)
      return { dispose: () => undefined }
    }
    this.sections.set(section.id, section)
    return disposable(() => this.sections.delete(section.id))
  }

  list(): SettingsSectionDefinition[] {
    return [...this.sections.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }
}

export const settingsSectionRegistry = new SettingsSectionRegistry()
