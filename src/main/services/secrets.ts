import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { AppError } from '@shared/ipc/errors'
import { app, safeStorage } from 'electron'
import { writeFileAtomic } from './fs-utils'

type SecretMap = Record<string, string>

export class SecretsService {
  private readonly file: string
  private values: SecretMap = {}
  private loaded = false

  constructor(file = join(app.getPath('userData'), 'secrets.json')) {
    this.file = file
  }

  private async load(): Promise<void> {
    if (this.loaded) {
      return
    }
    try {
      const raw = await fs.readFile(this.file, 'utf8')
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.values = parsed as SecretMap
      }
    } catch {
      this.values = {}
    }
    this.loaded = true
  }

  private async persist(): Promise<void> {
    await writeFileAtomic(this.file, `${JSON.stringify(this.values, null, 2)}\n`)
  }

  async set(key: string, value: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new AppError('E_UNAVAILABLE', 'Secure storage is not available on this system')
    }
    await this.load()
    this.values[key] = safeStorage.encryptString(value).toString('base64')
    await this.persist()
  }

  async get(key: string): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new AppError('E_UNAVAILABLE', 'Secure storage is not available on this system')
    }
    await this.load()
    const encoded = this.values[key]
    if (!encoded) {
      return null
    }
    try {
      return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
    } catch {
      throw new AppError('E_IO', 'Failed to decrypt secret')
    }
  }

  async delete(key: string): Promise<void> {
    await this.load()
    delete this.values[key]
    await this.persist()
  }

  async keys(): Promise<string[]> {
    await this.load()
    return Object.keys(this.values).sort()
  }
}
