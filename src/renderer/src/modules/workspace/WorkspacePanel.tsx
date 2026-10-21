import { openView } from '@renderer/core/navigation'
import { useSettingsStore } from '@renderer/core/settings/store'
import { useWorkspaceStore } from '@renderer/core/workspace/store'
import { Button, EmptyState, Spinner } from '@renderer/shell/ui/primitives'
import type { WorkspaceEntry } from '@shared/ipc/contract'
import type { MenuNode } from '@shared/menu'
import { isImagePath } from '@shared/mime'
import { formatBytes } from '@shared/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  X
} from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

function FileIcon({ path }: { path: string }) {
  if (isImagePath(path)) {
    return <FileImage size={14} className="tree-icon" />
  }
  if (/\.(ts|tsx|js|jsx|json|css|html|md|yml|yaml)$/i.test(path)) {
    return <FileCode2 size={14} className="tree-icon" />
  }
  return <FileText size={14} className="tree-icon" />
}

function TreeChildren({
  workspaceId,
  path,
  depth
}: {
  workspaceId: string
  path: string
  depth: number
}) {
  const { t } = useTranslation()
  const showHidden = useSettingsStore((state) => state.settings.workspace.showHidden)
  const query = useQuery({
    queryKey: ['workspace', workspaceId, 'list', path, showHidden],
    queryFn: () => window.misk.workspace.list(workspaceId, path),
    staleTime: 15_000
  })

  if (query.isLoading) {
    return (
      <div className="tree-message" style={{ paddingLeft: 12 + depth * 14 }}>
        <Spinner label={t('workspace.loading')} />
      </div>
    )
  }
  if (query.isError) {
    return (
      <p className="tree-message" style={{ paddingLeft: 12 + depth * 14 }}>
        {t('workspace.loadError')}
      </p>
    )
  }
  if (!query.data || query.data.entries.length === 0) {
    return (
      <p className="tree-message" style={{ paddingLeft: 12 + depth * 14 }}>
        {t('workspace.empty')}
      </p>
    )
  }
  return (
    <div role="group">
      {query.data.entries.map((entry) => (
        <TreeNode key={entry.path} entry={entry} workspaceId={workspaceId} depth={depth} />
      ))}
      {query.data.truncated ? (
        <p className="tree-message" style={{ paddingLeft: 12 + depth * 14 }}>
          {t('workspace.truncated', { count: query.data.entries.length })}
        </p>
      ) : null}
    </div>
  )
}

function TreeNode({
  entry,
  workspaceId,
  depth
}: {
  entry: WorkspaceEntry
  workspaceId: string
  depth: number
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const isDirectory = entry.kind === 'directory'

  const open = (): void => {
    if (isDirectory) {
      setExpanded((value) => !value)
    } else {
      openView('workspace.preview', { source: 'workspace', workspaceId, path: entry.path })
    }
  }

  const showContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
    const items: MenuNode[] = isDirectory
      ? [
          {
            kind: 'item',
            label: t('workspace.reveal'),
            command: 'workspace.reveal',
            args: { path: entry.path }
          },
          {
            kind: 'item',
            label: t('workspace.copyPath'),
            command: 'workspace.copyPath',
            args: { path: entry.path }
          }
        ]
      : [
          {
            kind: 'item',
            label: t('workspace.open'),
            command: 'workspace.openFile',
            args: { path: entry.path }
          },
          {
            kind: 'item',
            label: t('workspace.reveal'),
            command: 'workspace.reveal',
            args: { path: entry.path }
          },
          {
            kind: 'item',
            label: t('workspace.copyPath'),
            command: 'workspace.copyPath',
            args: { path: entry.path }
          }
        ]
    void window.misk.menu.popup(items, event.clientX, event.clientY)
  }

  return (
    <div>
      <button
        type="button"
        className="tree-row"
        style={{ paddingLeft: 8 + depth * 14 }}
        title={entry.path}
        aria-expanded={isDirectory ? expanded : undefined}
        onClick={open}
        onContextMenu={showContextMenu}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open()
          } else if (event.key === 'ArrowRight' && isDirectory && !expanded) {
            setExpanded(true)
          } else if (event.key === 'ArrowLeft' && isDirectory && expanded) {
            setExpanded(false)
          }
        }}
      >
        {isDirectory ? (
          expanded ? (
            <ChevronDown size={12} className="tree-chevron" />
          ) : (
            <ChevronRight size={12} className="tree-chevron" />
          )
        ) : (
          <span className="tree-chevron" />
        )}
        {isDirectory ? (
          expanded ? (
            <FolderOpen size={14} className="tree-icon folder" />
          ) : (
            <Folder size={14} className="tree-icon folder" />
          )
        ) : (
          <FileIcon path={entry.path} />
        )}
        <span className="tree-name">{entry.name}</span>
        {!isDirectory ? <span className="tree-size">{formatBytes(entry.size)}</span> : null}
      </button>
      {isDirectory && expanded ? (
        <TreeChildren workspaceId={workspaceId} path={entry.path} depth={depth + 1} />
      ) : null}
    </div>
  )
}

export function WorkspacePanel() {
  const { t } = useTranslation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const openDialog = useWorkspaceStore((state) => state.openDialog)
  const close = useWorkspaceStore((state) => state.close)
  const client = useQueryClient()

  if (!workspace) {
    return (
      <div className="workspace-panel">
        <EmptyState
          icon={<FolderPlus size={22} />}
          title={t('workspace.noFolder')}
          description={t('workspace.noFolderHint')}
          action={<Button onClick={() => void openDialog()}>{t('workspace.openFolder')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="workspace-panel">
      <div className="workspace-header">
        <span className="workspace-name" title={workspace.path}>
          {workspace.name}
        </span>
        <div className="workspace-actions">
          <button
            type="button"
            className="icon-btn"
            title={t('workspace.refresh')}
            aria-label={t('workspace.refresh')}
            onClick={() => void client.invalidateQueries({ queryKey: ['workspace', workspace.id] })}
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t('workspace.close')}
            aria-label={t('workspace.close')}
            onClick={() => void close()}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="file-tree">
        <TreeChildren workspaceId={workspace.id} path="" depth={0} />
      </div>
    </div>
  )
}
