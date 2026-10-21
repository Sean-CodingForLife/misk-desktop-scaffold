import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type {
  FileContent,
  FileEncoding,
  FileFilter,
  FileHandleInfo,
  FileStat
} from '@shared/ipc/contract'
import { AppError } from '@shared/ipc/errors'
import { type BrowserWindow, dialog, shell } from 'electron'

interface HandleRecord {
  path: string
  kind: 'file' | 'directory'
  name: string
}

function sanitizeFilters(filters: FileFilter[] | undefined): Electron.FileFilter[] | undefined {
  if (!filters || filters.length === 0) {
    return undefined
  }
  const sanitized = filters
    .filter((filter) => filter.extensions.length > 0)
    .map((filter) => ({
      name: filter.name || 'Files',
      extensions: filter.extensions.map((extension) => extension.replace(/^\./, ''))
    }))
  return sanitized.length > 0 ? sanitized : undefined
}

export class FilesService {
  private readonly handles = new Map<string, HandleRecord>()

  private createHandle(path: string, kind: 'file' | 'directory'): FileHandleInfo {
    const handle = randomUUID()
    const name = basename(path)
    this.handles.set(handle, { path, kind, name })
    return { handle, kind, name, path }
  }

  resolve(handle: string): HandleRecord {
    const record = this.handles.get(handle)
    if (!record) {
      throw new AppError('E_NOT_FOUND', 'File handle is no longer available')
    }
    return record
  }

  resolvePath(handle: string): string {
    return this.resolve(handle).path
  }

  async openDialog(
    window: BrowserWindow | null,
    kind: 'file' | 'directory',
    filters?: FileFilter[]
  ): Promise<FileHandleInfo | null> {
    const properties: Electron.OpenDialogOptions['properties'] =
      kind === 'directory' ? ['openDirectory'] : ['openFile']
    const result = window
      ? await dialog.showOpenDialog(window, { properties, filters: sanitizeFilters(filters) })
      : await dialog.showOpenDialog({ properties, filters: sanitizeFilters(filters) })
    const path = result.filePaths[0]
    if (result.canceled || !path) {
      return null
    }
    return this.createHandle(path, kind)
  }

  async saveAs(
    window: BrowserWindow | null,
    input: {
      handle?: string
      defaultName: string
      filters?: FileFilter[]
      content: string
      encoding?: FileEncoding
    }
  ): Promise<FileHandleInfo | null> {
    const existing = input.handle ? this.handles.get(input.handle) : undefined
    const options: Electron.SaveDialogOptions = {
      defaultPath: existing?.path ?? input.defaultName,
      filters: sanitizeFilters(input.filters)
    }
    const result = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) {
      return null
    }
    const encoding = input.encoding ?? 'utf8'
    await fs.writeFile(result.filePath, Buffer.from(input.content, encoding))
    return this.createHandle(result.filePath, 'file')
  }

  async read(
    handle: string,
    maxBytes = 1024 * 1024,
    encoding: FileEncoding = 'utf8'
  ): Promise<FileContent> {
    const record = this.resolve(handle)
    const stat = await fs.stat(record.path)
    const limit = Math.min(maxBytes, stat.size)
    const buffer = Buffer.alloc(Math.max(0, limit))
    if (limit > 0) {
      const file = await fs.open(record.path, 'r')
      try {
        await file.read(buffer, 0, limit, 0)
      } finally {
        await file.close()
      }
    }
    return {
      content: buffer.toString(encoding),
      encoding,
      size: stat.size,
      truncated: stat.size > limit
    }
  }

  async write(
    handle: string,
    content: string,
    encoding: FileEncoding = 'utf8'
  ): Promise<{ size: number }> {
    const record = this.resolve(handle)
    if (record.kind !== 'file') {
      throw new AppError('E_PERMISSION', 'Cannot write to a directory handle')
    }
    const buffer = Buffer.from(content, encoding)
    await fs.writeFile(record.path, buffer)
    return { size: buffer.byteLength }
  }

  async stat(handle: string): Promise<FileStat> {
    const record = this.resolve(handle)
    const stat = await fs.stat(record.path)
    return {
      name: record.name,
      path: record.path,
      kind: record.kind,
      size: stat.size,
      mtimeMs: stat.mtimeMs
    }
  }

  close(handle: string): void {
    this.handles.delete(handle)
  }

  async grant(paths: string[]): Promise<FileHandleInfo[]> {
    const result: FileHandleInfo[] = []
    for (const path of paths) {
      const stat = await fs.stat(path)
      result.push(this.createHandle(path, stat.isDirectory() ? 'directory' : 'file'))
    }
    return result
  }

  reveal(handle: string): void {
    const record = this.resolve(handle)
    shell.showItemInFolder(record.path)
  }

  async openExternal(handle: string): Promise<void> {
    const record = this.resolve(handle)
    const error = await shell.openPath(record.path)
    if (error) {
      throw new AppError('E_IO', error)
    }
  }

  closeAll(): void {
    this.handles.clear()
  }
}
