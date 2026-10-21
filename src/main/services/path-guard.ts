import { promises as fs } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { AppError } from '@shared/ipc/errors'

function comparable(path: string): string {
  return process.platform === 'win32' ? path.toLowerCase() : path
}

export function isInside(root: string, target: string): boolean {
  const normalizedRoot = comparable(root)
  const normalizedTarget = comparable(target)
  return (
    normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${sep}`)
  )
}

/**
 * Resolves a workspace-relative path and rejects absolute paths, `..`
 * traversal and NUL bytes before touching the filesystem.
 */
export function resolveInside(root: string, relative: string): string {
  if (relative.includes('\0')) {
    throw new AppError('E_PERMISSION', 'Invalid path')
  }
  if (isAbsolute(relative)) {
    throw new AppError('E_PERMISSION', 'Absolute paths are not allowed')
  }
  const segments = relative.split(/[\\/]+/).filter(Boolean)
  if (segments.some((segment) => segment === '..')) {
    throw new AppError('E_PERMISSION', 'Path traversal is not allowed')
  }
  const target = resolve(root, ...segments)
  if (!isInside(root, target)) {
    throw new AppError('E_PERMISSION', 'Path escapes the workspace')
  }
  return target
}

/**
 * Resolves symlinks and verifies the real target is still inside the root.
 * For new files, the parent directory is resolved and the basename appended.
 */
export async function assertRealInside(root: string, target: string): Promise<string> {
  const realRoot = await fs.realpath(root)
  let realTarget: string
  try {
    realTarget = await fs.realpath(target)
  } catch {
    const realParent = await fs.realpath(dirname(target))
    realTarget = join(realParent, basename(target))
  }
  if (!isInside(realRoot, realTarget)) {
    throw new AppError('E_PERMISSION', 'Path escapes the workspace through a link')
  }
  return realTarget
}
