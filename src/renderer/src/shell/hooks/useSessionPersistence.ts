import { useCallback, useEffect, useRef } from 'react'
import { sessionSnapshot } from '../../core/navigation'
import { useRouteStore } from '../../core/route/store'
import { useTabsStore } from '../../core/tabs/store'

export function useSessionPersistence(): () => Promise<void> {
  const tabs = useTabsStore((state) => state.tabs)
  const activeKey = useRouteStore((state) => state.key)
  const hydrated = useTabsStore((state) => state.hydrated)
  const timer = useRef<number | null>(null)

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    if (!useTabsStore.getState().hydrated) {
      return
    }
    await window.misk.session.patch(sessionSnapshot())
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
    }
    timer.current = window.setTimeout(() => {
      timer.current = null
      void window.misk.session.patch(sessionSnapshot())
    }, 300)
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [activeKey, hydrated, tabs])

  return flush
}
