import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { writeFileAtomic } from '../../src/main/services/fs-utils'

let directory: string

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'misk-fs-'))
})

afterAll(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('writeFileAtomic', () => {
  it('keeps overlapping writes to the same file intact', async () => {
    const file = join(directory, 'settings.json')
    await writeFileAtomic(file, JSON.stringify({ value: 'initial' }))

    const writes = Array.from({ length: 8 }, (_, index) =>
      writeFileAtomic(file, JSON.stringify({ value: index }))
    )
    await Promise.all(writes)

    const parsed = JSON.parse(await readFile(file, 'utf8')) as { value: number }
    expect(parsed.value).toBeGreaterThanOrEqual(0)
    expect(parsed.value).toBeLessThan(8)

    const leftovers = (await readdir(directory)).filter((name) => name.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })
})
