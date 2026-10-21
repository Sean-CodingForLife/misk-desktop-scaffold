import { notify } from '@renderer/core/toast/store'
import type { ViewParams, ViewProps } from '@renderer/core/types'
import { Button, Spinner } from '@renderer/shell/ui/primitives'
import { PREVIEW_IMAGE_LIMIT, PREVIEW_TEXT_LIMIT } from '@shared/constants'
import { isImagePath, mimeForPath } from '@shared/mime'
import { formatBytes } from '@shared/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, FolderSearch, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

export interface PreviewParams extends ViewParams {
  source: 'workspace' | 'handle'
  workspaceId?: string
  path?: string
  handle?: string
  name?: string
}

export const previewParamsSchema = z.object({
  source: z.enum(['workspace', 'handle']),
  workspaceId: z.string().optional(),
  path: z.string().optional(),
  handle: z.string().optional(),
  name: z.string().optional()
}) as unknown as z.ZodType<PreviewParams>

type PreviewData =
  | { kind: 'text'; content: string; size: number }
  | { kind: 'image'; dataUrl: string; size: number }
  | { kind: 'binary'; size: number }
  | { kind: 'too-large'; size: number; limit: number }

async function loadHandlePreview(handle: string): Promise<PreviewData> {
  const stat = await window.misk.files.stat(handle)
  if (isImagePath(stat.path)) {
    if (stat.size > PREVIEW_IMAGE_LIMIT) {
      return { kind: 'too-large', size: stat.size, limit: PREVIEW_IMAGE_LIMIT }
    }
    const content = await window.misk.files.read(handle, {
      maxBytes: PREVIEW_IMAGE_LIMIT,
      encoding: 'base64'
    })
    return {
      kind: 'image',
      dataUrl: `data:${mimeForPath(stat.path)};base64,${content.content}`,
      size: stat.size
    }
  }
  const content = await window.misk.files.read(handle, { maxBytes: PREVIEW_TEXT_LIMIT })
  if (content.truncated) {
    return { kind: 'too-large', size: stat.size, limit: PREVIEW_TEXT_LIMIT }
  }
  if (content.content.includes('\0')) {
    return { kind: 'binary', size: stat.size }
  }
  return { kind: 'text', content: content.content, size: stat.size }
}

function baseName(path: string | undefined): string {
  if (!path) {
    return ''
  }
  const normalized = path.replace(/\\/g, '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

export function FilePreviewView({ params, setTitle }: ViewProps<PreviewParams>) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const displayPath = params.source === 'workspace' ? (params.path ?? '') : (params.name ?? '')
  const name = params.name ?? baseName(displayPath)

  useEffect(() => {
    setTitle(name || t('workspace.preview'))
  }, [name, setTitle, t])

  const query = useQuery<PreviewData>({
    queryKey:
      params.source === 'workspace'
        ? ['workspace', params.workspaceId, 'file', params.path]
        : ['files', params.handle, 'preview'],
    queryFn: async () => {
      if (params.source === 'workspace') {
        if (!params.workspaceId || !params.path) {
          throw new Error('Missing workspace file reference')
        }
        return (await window.misk.workspace.readFile(
          params.workspaceId,
          params.path,
          PREVIEW_TEXT_LIMIT
        )) as PreviewData
      }
      if (!params.handle) {
        throw new Error('Missing file handle')
      }
      return loadHandlePreview(params.handle)
    },
    enabled:
      params.source === 'workspace'
        ? Boolean(params.workspaceId && params.path)
        : Boolean(params.handle),
    retry: false
  })

  const refresh = (): void => {
    void client.invalidateQueries({
      queryKey:
        params.source === 'workspace'
          ? ['workspace', params.workspaceId, 'file', params.path]
          : ['files', params.handle, 'preview']
    })
  }

  const reveal = (): void => {
    if (params.source === 'workspace' && params.workspaceId && params.path) {
      void window.misk.workspace.reveal(params.workspaceId, params.path)
    } else if (params.handle) {
      void window.misk.files.reveal(params.handle)
    }
  }

  const openExternal = (): void => {
    if (params.source === 'workspace' && params.workspaceId && params.path) {
      void window.misk.workspace.openExternal(params.workspaceId, params.path)
    } else if (params.handle) {
      void window.misk.files.openExternal(params.handle)
    }
  }

  const copyPath = (): void => {
    void window.misk.clipboard.writeText(displayPath)
    notify(t('toast.copied'), 'success')
  }

  return (
    <div className="preview-view">
      <header className="preview-header">
        <div className="preview-heading">
          <span className="preview-name">{name || t('workspace.preview')}</span>
          {query.data ? (
            <span className="preview-meta">
              {formatBytes(query.data.size)}
              {query.data.kind === 'text' ? ` · ${t('workspace.preview')}` : ''}
            </span>
          ) : null}
        </div>
        <div className="preview-actions">
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw size={13} />
            {t('common.refresh')}
          </Button>
          <Button size="sm" variant="ghost" onClick={reveal}>
            <FolderSearch size={13} />
            {t('workspace.reveal')}
          </Button>
          <Button size="sm" variant="ghost" onClick={copyPath}>
            <Copy size={13} />
            {t('workspace.copyPath')}
          </Button>
          <Button size="sm" variant="ghost" onClick={openExternal}>
            <ExternalLink size={13} />
            {t('workspace.openExternal')}
          </Button>
        </div>
      </header>

      {query.isLoading ? (
        <div className="preview-loading">
          <Spinner label={t('workspace.loading')} />
        </div>
      ) : query.isError ? (
        <div className="preview-message">
          <p>{t('workspace.loadError')}</p>
          <code>{query.error instanceof Error ? query.error.message : String(query.error)}</code>
        </div>
      ) : query.data?.kind === 'text' ? (
        <pre className="preview-text">{query.data.content}</pre>
      ) : query.data?.kind === 'image' ? (
        <div className="preview-image">
          <img src={query.data.dataUrl} alt={name} />
        </div>
      ) : query.data?.kind === 'binary' ? (
        <div className="preview-message">
          <p>{t('workspace.binary')}</p>
          <code>{displayPath}</code>
        </div>
      ) : query.data?.kind === 'too-large' ? (
        <div className="preview-message">
          <p>{t('workspace.tooLarge')}</p>
          <code>
            {formatBytes(query.data.size)} / {formatBytes(query.data.limit)}
          </code>
        </div>
      ) : null}
    </div>
  )
}
