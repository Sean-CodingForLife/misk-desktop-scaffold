import { useEffect } from 'react'

/**
 * Signals the main process after the IPC bridge effects have mounted. The main
 * process uses this as the point where queued deep links and file paths can be
 * delivered safely instead of relying on a fixed timeout.
 */
export function useRendererReady(): void {
  useEffect(() => {
    void window.misk.app.rendererReady().catch((error) => {
      console.error('[misk] failed to report renderer readiness', error)
    })
  }, [])
}
