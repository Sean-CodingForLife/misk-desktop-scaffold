import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { AppError } from '@shared/ipc/errors'
import {
  type AppSettings,
  defaultSettings,
  mergeSettings,
  migrateSettings,
  type SettingsPatch,
  settingsSchema
} from '@shared/settings/schema'
import { app } from 'electron'
import { writeFileAtomic } from './fs-utils'

type SettingsListener = (settings: AppSettings) => void

export class SettingsService {
  private readonly file: string
  private value: AppSettings = defaultSettings
  private readonly listeners = new Set<SettingsListener>()
  private pending: Promise<unknown> = Promise.resolve()

  constructor(file = join(app.getPath('userData'), 'settings.json')) {
    this.file = file
  }

  async init(): Promise<AppSettings> {
    const systemLocale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
    const initial: AppSettings = { ...defaultSettings, locale: systemLocale }
    try {
      const raw = await fs.readFile(this.file, 'utf8')
      let parsed: unknown
      try {
        parsed = JSON.parse(raw) as unknown
      } catch {
        await this.backupCorrupt()
        this.value = initial
        await this.write(initial)
        return this.value
      }
      const migrated = migrateSettings(parsed, initial)
      this.value = migrated
      if (settingsSchema.safeParse(parsed).success === false) {
        await this.write(migrated)
      }
      return this.value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('[settings] failed to read, using defaults', error)
      }
      this.value = initial
      await this.write(initial)
      return this.value
    }
  }

  get(): AppSettings {
    return this.value
  }

  onChange(listener: SettingsListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  patch(patch: SettingsPatch): Promise<AppSettings> {
    return this.enqueue(async () => {
      let next: AppSettings
      try {
        next = mergeSettings(this.value, patch)
      } catch (error) {
        throw new AppError(
          'E_INVALID_INPUT',
          error instanceof Error ? error.message : 'Invalid settings patch'
        )
      }
      await this.write(next)
      this.value = next
      this.emit()
      return next
    })
  }

  replace(raw: unknown): Promise<AppSettings> {
    return this.enqueue(async () => {
      const next = migrateSettings(raw)
      const parsed = settingsSchema.safeParse(next)
      if (!parsed.success) {
        throw new AppError('E_INVALID_INPUT', 'Imported settings are invalid')
      }
      await this.write(parsed.data)
      this.value = parsed.data
      this.emit()
      return this.value
    })
  }

  reset(): Promise<AppSettings> {
    return this.enqueue(async () => {
      await this.write(defaultSettings)
      this.value = defaultSettings
      this.emit()
      return this.value
    })
  }

  /**
   * Settings writes are serialized: merge, write and commit all happen after
   * the previous patch settled. Without this, two concurrent patches merge on
   * the same stale value and the last write wins (or one rename fails).
   */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.pending.then(task, task)
    this.pending = result.catch(() => undefined)
    return result
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.value)
      } catch (error) {
        // A broken listener must not make a persisted patch look failed.
        console.warn('[settings] listener failed', error)
      }
    }
  }

  private async write(value: AppSettings): Promise<void> {
    await writeFileAtomic(this.file, `${JSON.stringify(value, null, 2)}\n`)
  }

  private async backupCorrupt(): Promise<void> {
    try {
      await fs.copyFile(this.file, `${this.file}.corrupt-${Date.now()}`)
    } catch {
      // Ignore backup failures; defaults are still used.
    }
  }
}
