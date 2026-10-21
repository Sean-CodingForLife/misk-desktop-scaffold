import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'

export async function writeFileAtomic(file: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  await fs.writeFile(temporary, data)
  try {
    await fs.copyFile(file, `${file}.bak`)
  } catch {
    // No previous file to back up.
  }
  await fs.rename(temporary, file)
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
