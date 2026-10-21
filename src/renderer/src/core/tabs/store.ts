import { create } from 'zustand'
import type { TabInstance, ViewParams } from '../types'

interface TabsState {
  tabs: TabInstance[]
  hydrated: boolean
  hydrate: (tabs: TabInstance[]) => void
  add: (tab: TabInstance) => void
  remove: (id: string) => number
  update: (id: string, params: ViewParams, title: string) => void
  updateTitle: (id: string, title: string) => void
  reorder: (from: number, to: number) => void
  replace: (tabs: TabInstance[]) => void
}

export function createTab(viewId: string, params: ViewParams, title: string): TabInstance {
  return {
    id: `tab-${crypto.randomUUID()}`,
    viewId,
    params,
    title,
    customTitle: false
  }
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  hydrated: false,
  hydrate: (tabs) => set({ tabs, hydrated: true }),
  add: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
  remove: (id) => {
    const tabs = get().tabs
    const index = tabs.findIndex((tab) => tab.id === id)
    if (index < 0) {
      return -1
    }
    set({ tabs: tabs.filter((tab) => tab.id !== id) })
    return index
  },
  update: (id, params, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, params, title } : tab))
    })),
  updateTitle: (id, title) =>
    set((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === id)
      if (index < 0 || state.tabs[index]?.title === title) {
        return state
      }
      const tabs = state.tabs.slice()
      const current = tabs[index]
      if (!current) {
        return state
      }
      tabs[index] = { ...current, title, customTitle: true }
      return { tabs }
    }),
  reorder: (from, to) => {
    const tabs = [...get().tabs]
    if (from < 0 || from >= tabs.length || to < 0 || to >= tabs.length || from === to) {
      return
    }
    const [moved] = tabs.splice(from, 1)
    if (moved) {
      tabs.splice(to, 0, moved)
    }
    set({ tabs })
  },
  replace: (tabs) => set({ tabs })
}))
