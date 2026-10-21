import { AppShell } from '@renderer/shell/layout/AppShell'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
  useSearch
} from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { ensureTab } from '../navigation'
import { tabKey, useRouteStore } from '../route/store'
import type { ViewParams } from '../types'
import { setAppRouter } from './router-instance'

function HomeRoute(): null {
  useEffect(() => {
    useRouteStore.getState().clear()
  }, [])
  return null
}

function ViewRoute(): null {
  const { viewId } = useParams({ from: '/view/$viewId' })
  const search = useSearch({ from: '/view/$viewId' }) as ViewParams
  const params = useMemo<ViewParams>(() => {
    const result: ViewParams = {}
    for (const [key, value] of Object.entries(search)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value
      }
    }
    return result
  }, [search])
  const key = tabKey(viewId, params)
  useEffect(() => {
    ensureTab(viewId, params)
    useRouteStore.getState().setActive(viewId, params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, key])
  return null
}

const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRoute
})
const viewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/view/$viewId',
  validateSearch: (search: Record<string, unknown>): ViewParams => {
    const result: ViewParams = {}
    for (const [key, value] of Object.entries(search)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value
      }
    }
    return result
  },
  component: ViewRoute
})

const routeTree = rootRoute.addChildren([indexRoute, viewRoute])

export function createAppRouter(initialPath: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    defaultPreload: false
  })
  setAppRouter(router as unknown as Parameters<typeof setAppRouter>[0])
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
