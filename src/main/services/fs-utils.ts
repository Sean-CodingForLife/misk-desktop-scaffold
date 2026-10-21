import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'

// Windows refuses concurrent renames onto the same destination, so writes to
// the same path are serialized in-process as well as using a unique temp name.
const writeLocks = new Map<string, Promise<unknown>>()

async function performWrite(file: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, data)
    try {
      await fs.copyFile(file, `${file}.bak`)
    } catch {
      // No previous file to back up.
    }
    await fs.rename(temporary, file)
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined)
    throw error
  }
}

export function writeFileAtomic(file: string, data: string | Buffer): Promise<void> {
  const previous = writeLocks.get(file) ?? Promise.resolve()
  const task = previous.then(
    () => performWrite(file, data),
    () => performWrite(file, data)
  )
  const guarded = task.catch(() => undefined)
  writeLocks.set(file, guarded)
  void guarded.then(() => {
    if (writeLocks.get(file) === guarded) {
      writeLocks.delete(file)
    }
  })
  return task
}

export async function readJsonFile(file: string): Promise<unknown> {
  const raw = await fs.readFile(file, 'utf8')
  return JSON.parse(raw) as unknown
}

export async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}
