import { useEffect } from 'react'
import { runCloseGuards } from '../../core/close-guards'
import { sessionSnapshot } from '../../core/navigation'

export function useCloseGuard(): void {
  useEffect(() => {
    return window.misk.window.onBeforeClose(async () => {
      try {
        await window.misk.session.patch(sessionSnapshot())
      } catch (error) {
        console.error('[close] failed to persist session', error)
      }
      return runCloseGuards()
    })
  }, [])
}
