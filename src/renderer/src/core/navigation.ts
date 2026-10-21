import { MAX_SESSION_TABS } from '@shared/constants'
import type { SessionTab } from '@shared/session/schema'
import { i18n } from './i18n'
import { tabKey as makeKey, useRouteStore } from './route/store'
import { getAppRouter } from './router/router-instance'
import { createTab, useTabsStore } from './tabs/store'
import { notify } from './toast/store'
import type { TabInstance, ViewParams } from './types'
import { viewRegistry } from './views/registry'

function cleanParams(params: ViewParams): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = value as string | number | boolean
    }
  }
  return result
}

export function tabPath(tab: Pick<TabInstance, 'viewId' | 'params'>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(cleanParams(tab.params))) {
    query.set(key, String(value))
  }
  const suffix = query.toString()
  return `/view/${encodeURIComponent(tab.viewId)}${suffix ? `?${suffix}` : ''}`
}

export function activateTab(tab: TabInstance): void {
  useRouteStore.getState().setActive(tab.viewId, tab.params)
  const router = getAppRouter()
  if (!router) {
    return
  }
  void router.navigate({
    to: '/view/$viewId',
    params: { viewId: tab.viewId },
    search: cleanParams(tab.params)
  })
}

export function openView(viewId: string, params: ViewParams = {}): void {
  const definition = viewRegistry.get(viewId)
  if (!definition) {
    notify(i18n.t('toast.unknownView', { viewId }), 'error')
    return
  }
  const parsed = viewRegistry.parseParams(definition, params)
  if (!parsed.ok || !parsed.params) {
    notify(i18n.t('error.invalidParams'), 'error')
    return
  }
  const nextParams = cleanParams(parsed.params)
  const key = makeKey(viewId, nextParams)
  const tabs = useTabsStore.getState().tabs
  const singleton = definition.singleton ? tabs.find((tab) => tab.viewId === viewId) : undefined
  const existing =
    singleton ??
    (definition.dedupeParams === false
      ? undefined
      : tabs.find((tab) => makeKey(tab.viewId, tab.params) === key))
  if (existing) {
    if (singleton) {
      useTabsStore.getState().update(existing.id, nextParams, viewRegistry.titleFor(definition))
    }
    activateTab({ ...existing, params: nextParams })
    return
  }
  if (tabs.length >= MAX_SESSION_TABS) {
    notify(i18n.t('toast.tooManyTabs', { max: MAX_SESSION_TABS }), 'warning')
    return
  }
  const tab = createTab(viewId, nextParams, viewRegistry.titleFor(definition))
  useTabsStore.getState().add(tab)
  activateTab(tab)
}

export function ensureTab(viewId: string, params: ViewParams): TabInstance | null {
  const definition = viewRegistry.get(viewId)
  if (!definition) {
    return null
  }
  const parsed = viewRegistry.parseParams(definition, params)
  if (!parsed.ok || !parsed.params) {
    return null
  }
  const nextParams = cleanParams(parsed.params)
  const key = makeKey(viewId, nextParams)
  const existing = useTabsStore
    .getState()
    .tabs.find((tab) => makeKey(tab.viewId, tab.params) === key)
  if (existing) {
    return existing
  }
  if (useTabsStore.getState().tabs.length >= MAX_SESSION_TABS) {
    return null
  }
  const tab = createTab(viewId, nextParams, viewRegistry.titleFor(definition))
  useTabsStore.getState().add(tab)
  return tab
}

function releaseHandle(tab: TabInstance): void {
  if (tab.params.source !== 'handle') {
    return
  }
  const handle = tab.params.handle
  if (typeof handle !== 'string' || handle.length === 0) {
    return
  }
  const stillUsed = useTabsStore
    .getState()
    .tabs.some((item) => item.params.source === 'handle' && item.params.handle === handle)
  if (!stillUsed) {
    void window.misk.files.close(handle).catch(() => undefined)
  }
}

export function closeTab(id: string): void {
  const tabs = useTabsStore.getState().tabs
  const index = tabs.findIndex((tab) => tab.id === id)
  if (index < 0) {
    return
  }
  const tab = tabs[index]
  if (!tab) {
    return
  }
  const activeKey = useRouteStore.getState().key
  const wasActive = activeKey === makeKey(tab.viewId, tab.params)
  useTabsStore.getState().remove(id)
  releaseHandle(tab)
  if (!wasActive) {
    return
  }
  const next = tabs[index + 1] ?? tabs[index - 1]
  if (next) {
    activateTab(next)
  } else {
    navigateHome()
  }
}

export function closeActiveTab(): void {
  const key = useRouteStore.getState().key
  if (!key) {
    return
  }
  const tab = useTabsStore.getState().tabs.find((item) => makeKey(item.viewId, item.params) === key)
  if (tab) {
    closeTab(tab.id)
  }
}

export function closeAllTabs(): void {
  const closing = useTabsStore.getState().tabs
  useTabsStore.getState().replace([])
  for (const tab of closing) {
    releaseHandle(tab)
  }
  navigateHome()
}

export function closeWorkspaceTabs(workspaceId: string): void {
  const tabs = useTabsStore.getState().tabs
  const activeKey = useRouteStore.getState().key
  const remaining = tabs.filter(
    (tab) => !(tab.params.source === 'workspace' && tab.params.workspaceId === workspaceId)
  )
  if (remaining.length === tabs.length) {
    return
  }
  const activeRemoved =
    activeKey !== null && !remaining.some((tab) => makeKey(tab.viewId, tab.params) === activeKey)
  useTabsStore.getState().replace(remaining)
  if (activeRemoved) {
    const next = remaining[remaining.length - 1]
    if (next) {
      activateTab(next)
    } else {
      navigateHome()
    }
  }
}

export function navigateHome(): void {
  useRouteStore.getState().clear()
  const router = getAppRouter()
  if (router) {
    void router.navigate({ to: '/' })
  }
}

export function updateTabTitle(id: string, title: string): void {
  useTabsStore.getState().updateTitle(id, title)
}

export function relocalizeTabs(): void {
  const tabs = useTabsStore.getState().tabs
  let changed = false
  const next = tabs.map((tab) => {
    if (tab.customTitle) {
      return tab
    }
    const definition = viewRegistry.get(tab.viewId)
    if (!definition) {
      return tab
    }
    const title = viewRegistry.titleFor(definition)
    if (title === tab.title) {
      return tab
    }
    changed = true
    return { ...tab, title }
  })
  if (changed) {
    useTabsStore.getState().replace(next)
  }
}

export function sessionSnapshot(): { tabs: SessionTab[]; activeIndex: number } {
  // Defensive slice: the session schema rejects more than MAX_SESSION_TABS,
  // and a rejected patch would silently disable session persistence.
  const tabs = useTabsStore.getState().tabs.slice(0, MAX_SESSION_TABS)
  const activeKey = useRouteStore.getState().key
  const activeIndex = tabs.findIndex((tab) => makeKey(tab.viewId, tab.params) === activeKey)
  return {
    tabs: tabs.map((tab) => ({
      viewId: tab.viewId,
      params: cleanParams(tab.params),
      title: tab.title
    })),
    activeIndex
  }
}

export interface RestoredSession {
  tabs: TabInstance[]
  activeIndex: number
  activeTab?: TabInstance
}

export function restoreSessionTabs(
  tabs: SessionTab[],
  activeIndex: number,
  workspaceId?: string
): RestoredSession {
  const restored: TabInstance[] = []
  const seen = new Set<string>()
  let activeId: string | null = null
  for (const [index, entry] of tabs.entries()) {
    const definition = viewRegistry.get(entry.viewId)
    if (!definition) {
      continue
    }
    const parsed = viewRegistry.parseParams(definition, entry.params)
    if (!parsed.ok || !parsed.params) {
      continue
    }
    if (entry.params.source === 'workspace' && parsed.params.workspaceId !== workspaceId) {
      continue
    }
    const key = makeKey(entry.viewId, parsed.params)
    if (seen.has(key)) {
      continue
    }
    if (!viewRegistry.isRestorable(definition, parsed.params)) {
      continue
    }
    seen.add(key)
    const tab = createTab(entry.viewId, parsed.params, viewRegistry.titleFor(definition))
    restored.push(tab)
    if (index === activeIndex) {
      activeId = tab.id
    }
  }
  const boundedIndex =
    activeId !== null
      ? restored.findIndex((tab) => tab.id === activeId)
      : activeIndex < 0 || restored.length === 0
        ? -1
        : Math.min(activeIndex, restored.length - 1)
  return {
    tabs: restored,
    activeIndex: boundedIndex,
    activeTab: boundedIndex >= 0 ? restored[boundedIndex] : undefined
  }
}
