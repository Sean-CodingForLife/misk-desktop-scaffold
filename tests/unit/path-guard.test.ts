import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assertRealInside, isInside, resolveInside } from '../../src/main/services/path-guard'

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'misk-path-'))
  await writeFile(join(root, 'note.txt'), 'hello')
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('workspace path guard', () => {
  it('resolves relative paths inside the root', () => {
    expect(resolveInside(root, 'note.txt')).toBe(join(root, 'note.txt'))
    expect(resolveInside(root, 'nested/file.txt')).toBe(join(root, 'nested', 'file.txt'))
    expect(isInside(root, join(root, 'note.txt'))).toBe(true)
  })

  it('rejects absolute paths and traversal', () => {
    expect(() => resolveInside(root, join(root, 'note.txt'))).toThrow(/Absolute/)
    expect(() => resolveInside(root, '../escape.txt')).toThrow(/traversal/)
    expect(() => resolveInside(root, 'a/../../escape.txt')).toThrow(/traversal/)
    expect(() => resolveInside(root, 'bad\0name')).toThrow(/Invalid/)
  })

  it('rejects real paths that escape through a symlink-like parent', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'misk-outside-'))
    try {
      const target = join(outside, 'secret.txt')
      await writeFile(target, 'secret')
      await expect(assertRealInside(root, target)).rejects.toThrow(/escapes/)
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })

  it('allows a new file whose parent is inside the root', async () => {
    const resolved = await assertRealInside(root, join(root, 'new-file.txt'))
    expect(isInside(await realpath(root), resolved)).toBe(true)
  })
})
