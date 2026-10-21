import { APP_CONFIG } from '@shared/app-config'
import { useEffect } from 'react'
import { executeCommand } from '../../core/commands/execute'
import { i18n } from '../../core/i18n'
import { openView } from '../../core/navigation'
import { queryClient } from '../../core/query/client'
import { notify } from '../../core/toast/store'
import { viewRegistry } from '../../core/views/registry'
import { useWorkspaceStore } from '../../core/workspace/store'

function handleDeepLink(raw: string): void {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return
  }
  if (url.protocol !== `${APP_CONFIG.protocol}:` || url.host !== 'view') {
    return
  }
  const viewId = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  if (!viewRegistry.get(viewId)) {
    notify(i18n.t('toast.unknownView', { viewId }), 'error')
    return
  }
  const params = Object.fromEntries(url.searchParams.entries())
  openView(viewId, params)
}

export function useIpcBridge(): void {
  useEffect(() => {
    const cleanups = [
      window.misk.menu.onCommand(({ id, args }) => {
        void executeCommand(id, args)
      }),
      window.misk.app.onOpenUrl(({ url }) => handleDeepLink(url)),
      window.misk.app.onOpenFile(({ handle, name, kind }) => {
        if (kind === 'directory') {
          void useWorkspaceStore.getState().openHandle(handle)
          return
        }
        openView('workspace.preview', { source: 'handle', handle, name })
      }),
      window.misk.notifications.onActivated(({ action }) => {
        if (action) {
          openView(action.viewId, action.params ?? {})
        }
      }),
      window.misk.workspace.onChanged((change) => {
        void queryClient.invalidateQueries({ queryKey: ['workspace', change.id] })
      })
    ]
    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }, [])
}
