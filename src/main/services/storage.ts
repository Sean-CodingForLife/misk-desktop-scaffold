import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { MAX_STORAGE_BYTES } from '@shared/constants'
import { AppError } from '@shared/ipc/errors'
import { app } from 'electron'
import { writeFileAtomic } from './fs-utils'

const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

export class StorageService {
  private readonly directory: string

  constructor(directory = join(app.getPath('userData'), 'storage')) {
    this.directory = directory
  }

  private fileFor(key: string): string {
    if (!KEY_PATTERN.test(key)) {
      throw new AppError('E_INVALID_INPUT', `Invalid storage key: ${key}`)
    }
    return join(this.directory, `${key}.json`)
  }

  async read(key: string): Promise<unknown | null> {
    try {
      const raw = await fs.readFile(this.fileFor(key), 'utf8')
      return JSON.parse(raw) as unknown
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw new AppError(
        'E_IO',
        error instanceof Error ? error.message : `Failed to read storage key ${key}`
      )
    }
  }

  async write(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      throw new AppError('E_INVALID_INPUT', 'Storage values must be JSON serializable')
    }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_STORAGE_BYTES) {
      throw new AppError('E_INVALID_INPUT', 'Storage value is too large')
    }
    await writeFileAtomic(this.fileFor(key), serialized)
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.fileFor(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new AppError('E_IO', 'Failed to delete storage value')
      }
    }
  }

  async keys(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.directory, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name.slice(0, -'.json'.length))
        .sort()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw new AppError('E_IO', 'Failed to list storage keys')
    }
  }
}
