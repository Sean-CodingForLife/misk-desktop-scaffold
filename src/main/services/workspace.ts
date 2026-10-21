import { createHash } from 'node:crypto'
import { type Dirent, type FSWatcher, promises as fs, type Stats, watch as watchFs } from 'node:fs'
import { basename, join } from 'node:path'
import {
  MAX_RECENT_WORKSPACES,
  PREVIEW_IMAGE_LIMIT,
  PREVIEW_TEXT_LIMIT,
  WORKSPACE_LIST_LIMIT,
  WORKSPACE_SCAN_LIMIT,
  WORKSPACE_SEARCH_LIMIT
} from '@shared/constants'
import type {
  WorkspaceChange,
  WorkspaceEntry,
  WorkspaceInfo,
  WorkspaceListResult,
  WorkspaceReadResult
} from '@shared/ipc/contract'
import { AppError } from '@shared/ipc/errors'
import { isImagePath, mimeForPath } from '@shared/mime'
import { type BrowserWindow, dialog, shell } from 'electron'
import type { FilesService } from './files'
import { assertRealInside, resolveInside } from './path-guard'
import type { SettingsService } from './settings'

interface WorkspaceRecord {
  info: WorkspaceInfo
  root: string
}

interface WatchState {
  watcher: FSWatcher
  timer: NodeJS.Timeout | null
  // `rename` is resolved against the filesystem when the debounce flushes.
  pending: Map<string, 'change' | 'rename'>
}

const IGNORE_FALLBACK = new Set(['.git', 'node_modules', 'dist', 'out'])

function workspaceId(root: string): string {
  const normalized = process.platform === 'win32' ? root.toLowerCase() : root
  return createHash('sha1').update(normalized).digest('hex').slice(0, 16)
}

export class WorkspaceService {
  private readonly records = new Map<string, WorkspaceRecord>()
  private readonly watches = new Map<string, WatchState>()

  constructor(
    private readonly settings: SettingsService,
    private readonly files: FilesService,
    private readonly send: (change: WorkspaceChange) => void
  ) {}

  async openDialog(window: BrowserWindow | null): Promise<WorkspaceInfo | null> {
    const forced = process.env.MISK_E2E === '1' ? process.env.MISK_E2E_WORKSPACE : undefined
    if (forced) {
      return this.openPath(forced)
    }
    const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    const path = result.filePaths[0]
    if (result.canceled || !path) {
      return null
    }
    return this.openPath(path)
  }

  async openHandle(handle: string): Promise<WorkspaceInfo> {
    const record = this.files.resolve(handle)
    if (record.kind !== 'directory') {
      throw new AppError('E_INVALID_INPUT', 'Workspace handle is not a directory')
    }
    try {
      return await this.openPath(record.path)
    } finally {
      // The workspace keeps its own root record; the one-shot handle is not
      // needed afterwards and would otherwise stay in the handle map forever.
      this.files.close(handle)
    }
  }

  async openRecent(id: string): Promise<WorkspaceInfo | null> {
    const recent = this.settings.get().workspace.recent.find((item) => item.id === id)
    if (!recent) {
      return null
    }
    try {
      return await this.openPath(recent.path)
    } catch {
      await this.forget(id)
      return null
    }
  }

  async openPath(path: string): Promise<WorkspaceInfo> {
    const root = await fs.realpath(path)
    const stat = await fs.stat(root)
    if (!stat.isDirectory()) {
      throw new AppError('E_INVALID_INPUT', 'Selected path is not a directory')
    }
    const id = workspaceId(root)
    const info: WorkspaceInfo = { id, name: basename(root), path: root }
    this.records.set(id, { info, root })
    await this.remember(info)
    return info
  }

  async list(id: string, path = ''): Promise<WorkspaceListResult> {
    const record = this.requireRecord(id)
    const target = resolveInside(record.root, path)
    await assertRealInside(record.root, target)
    const entries = await fs.readdir(target, { withFileTypes: true })
    const showHidden = this.settings.get().workspace.showHidden
    const result: WorkspaceEntry[] = []
    let truncated = false
    for (const entry of entries) {
      if (result.length >= WORKSPACE_LIST_LIMIT) {
        truncated = true
        break
      }
      const hidden = entry.name.startsWith('.')
      if (hidden && !showHidden) {
        continue
      }
      const absolute = join(target, entry.name)
      let stat: Stats
      try {
        stat = await fs.stat(absolute)
      } catch {
        continue
      }
      if (!stat.isDirectory() && !stat.isFile()) {
        continue
      }
      result.push({
        name: entry.name,
        path: path ? `${path.replace(/\\/g, '/')}/${entry.name}` : entry.name,
        kind: stat.isDirectory() ? 'directory' : 'file',
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        hidden
      })
    }
    result.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    return { entries: result, truncated }
  }

  async readFile(id: string, path: string, maxBytes?: number): Promise<WorkspaceReadResult> {
    const record = this.requireRecord(id)
    const target = resolveInside(record.root, path)
    const real = await assertRealInside(record.root, target)
    const stat = await fs.stat(real)
    if (stat.isDirectory()) {
      throw new AppError('E_INVALID_INPUT', 'Cannot preview a directory')
    }
    if (isImagePath(real)) {
      if (stat.size > PREVIEW_IMAGE_LIMIT) {
        return { kind: 'too-large', size: stat.size, limit: PREVIEW_IMAGE_LIMIT }
      }
      const buffer = await fs.readFile(real)
      const mime = mimeForPath(real)
      return {
        kind: 'image',
        dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
        mime,
        size: stat.size
      }
    }
    const limit = maxBytes ?? PREVIEW_TEXT_LIMIT
    if (stat.size > limit) {
      return { kind: 'too-large', size: stat.size, limit }
    }
    const buffer = await fs.readFile(real)
    if (buffer.includes(0)) {
      return { kind: 'binary', mime: mimeForPath(real), size: stat.size }
    }
    return { kind: 'text', content: buffer.toString('utf8'), size: stat.size }
  }

  async findFiles(id: string, query: string, limit = WORKSPACE_SEARCH_LIMIT): Promise<string[]> {
    const record = this.requireRecord(id)
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return []
    }
    const showHidden = this.settings.get().workspace.showHidden
    const ignore = new Set([...IGNORE_FALLBACK, ...this.settings.get().workspace.ignore])
    const results: string[] = []
    const queue: string[] = ['']
    let scanned = 0
    while (queue.length > 0 && scanned < WORKSPACE_SCAN_LIMIT && results.length < limit) {
      const current = queue.shift() ?? ''
      const target = resolveInside(record.root, current)
      let entries: Dirent[]
      try {
        entries = await fs.readdir(target, { withFileTypes: true })
      } catch {
        continue
      }
      for (const entry of entries) {
        if (scanned >= WORKSPACE_SCAN_LIMIT) {
          break
        }
        if (entry.name.startsWith('.') && !showHidden) {
          continue
        }
        if (ignore.has(entry.name)) {
          continue
        }
        scanned += 1
        const relativePath = current ? `${current}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          queue.push(relativePath)
        } else if (relativePath.toLowerCase().includes(needle)) {
          results.push(relativePath)
          if (results.length >= limit) {
            break
          }
        }
      }
    }
    return results
  }

  watch(id: string): void {
    if (this.watches.has(id)) {
      return
    }
    const record = this.requireRecord(id)
    try {
      const watcher = watchFs(record.root, { recursive: true }, (eventType, filename) => {
        const state = this.watches.get(id)
        if (!state) {
          return
        }
        const raw = filename ?? ''
        // Windows reports backslashes; POSIX file names may legitimately
        // contain them, so only translate on Windows.
        const path = process.platform === 'win32' ? raw.replace(/\\/g, '/') : raw
        state.pending.set(path, eventType === 'rename' ? 'rename' : 'change')
        this.scheduleFlush(id)
      })
      watcher.on('error', (error) => {
        console.warn('[workspace] watcher error', error)
        this.unwatch(id)
      })
      this.watches.set(id, { watcher, timer: null, pending: new Map() })
    } catch (error) {
      console.warn('[workspace] failed to watch', error)
    }
  }

  unwatch(id: string): void {
    const state = this.watches.get(id)
    if (!state) {
      return
    }
    if (state.timer) {
      clearTimeout(state.timer)
    }
    state.watcher.close()
    this.watches.delete(id)
  }

  close(id: string): void {
    this.unwatch(id)
    this.records.delete(id)
  }

  closeAll(): void {
    for (const id of [...this.watches.keys()]) {
      this.unwatch(id)
    }
    this.records.clear()
  }

  reveal(id: string, path: string): void {
    const record = this.requireRecord(id)
    const target = resolveInside(record.root, path)
    shell.showItemInFolder(target)
  }

  async openExternal(id: string, path: string): Promise<void> {
    const record = this.requireRecord(id)
    const target = resolveInside(record.root, path)
    await assertRealInside(record.root, target)
    const error = await shell.openPath(target)
    if (error) {
      throw new AppError('E_IO', error)
    }
  }

  private scheduleFlush(id: string): void {
    const state = this.watches.get(id)
    if (!state) {
      return
    }
    if (state.timer) {
      clearTimeout(state.timer)
    }
    state.timer = setTimeout(() => {
      state.timer = null
      void this.flush(id)
    }, 150)
  }

  private async flush(id: string): Promise<void> {
    const state = this.watches.get(id)
    const record = this.records.get(id)
    if (!state || !record) {
      return
    }
    const pending = [...state.pending.entries()]
    state.pending.clear()
    if (pending.length === 0) {
      return
    }
    const changes: WorkspaceChange['changes'] = []
    for (const [path, fallback] of pending) {
      if (!path) {
        changes.push({ path: '', type: 'change' })
        continue
      }
      const absolute = join(record.root, path)
      try {
        await fs.stat(absolute)
        // A `rename` that still exists is a create/rename-in; a missing path
        // is a delete/rename-out.
        changes.push({ path, type: fallback === 'rename' ? 'add' : 'change' })
      } catch {
        changes.push({ path, type: 'unlink' })
      }
    }
    if (changes.length > 0) {
      this.send({ id, changes })
    }
  }

  private requireRecord(id: string): WorkspaceRecord {
    const record = this.records.get(id)
    if (!record) {
      throw new AppError('E_NOT_FOUND', 'Workspace is not open')
    }
    return record
  }

  private async remember(info: WorkspaceInfo): Promise<void> {
    const current = this.settings.get().workspace
    const recent = [
      { id: info.id, name: info.name, path: info.path, openedAt: Date.now() },
      ...current.recent.filter((item) => item.id !== info.id)
    ].slice(0, MAX_RECENT_WORKSPACES)
    await this.settings.patch({ workspace: { recent, lastId: info.id } })
  }

  private async forget(id: string): Promise<void> {
    const current = this.settings.get().workspace
    await this.settings.patch({
      workspace: {
        recent: current.recent.filter((item) => item.id !== id),
        lastId: current.lastId === id ? null : current.lastId
      }
    })
  }
}
