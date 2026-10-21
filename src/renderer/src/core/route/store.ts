import { create } from 'zustand'
import type { ViewParams } from '../types'

export function tabKey(viewId: string, params: ViewParams): string {
  const keys = Object.keys(params)
    .filter((key) => params[key] !== undefined)
    .sort()
  return `${viewId}?${keys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&')}`
}

interface RouteState {
  viewId: string | null
  params: ViewParams
  key: string | null
  setActive: (viewId: string, params: ViewParams) => void
  clear: () => void
}

export const useRouteStore = create<RouteState>((set) => ({
  viewId: null,
  params: {},
  key: null,
  setActive: (viewId, params) => set({ viewId, params, key: tabKey(viewId, params) }),
  clear: () => set({ viewId: null, params: {}, key: null })
}))
