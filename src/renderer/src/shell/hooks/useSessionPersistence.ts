import { useEffect, useRef } from 'react'
import { sessionSnapshot } from '../../core/navigation'
import { useRouteStore } from '../../core/route/store'
import { useTabsStore } from '../../core/tabs/store'

export function useSessionPersistence(): void {
  const tabs = useTabsStore((state) => state.tabs)
  const activeKey = useRouteStore((state) => state.key)
  const hydrated = useTabsStore((state) => state.hydrated)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!hydrated) {
      return
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
    }
    timer.current = window.setTimeout(() => {
      timer.current = null
      void window.misk.session.patch(sessionSnapshot()).catch((error) => {
        console.error('[session] failed to persist', error)
      })
    }, 300)
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [activeKey, hydrated, tabs])
}
