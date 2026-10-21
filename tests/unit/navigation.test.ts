import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { initI18n } from '../../src/renderer/src/core/i18n'
import {
  ensureTab,
  restoreSessionTabs,
  sessionSnapshot
} from '../../src/renderer/src/core/navigation'
import { useRouteStore } from '../../src/renderer/src/core/route/store'
import { createTab, useTabsStore } from '../../src/renderer/src/core/tabs/store'
import { viewRegistry } from '../../src/renderer/src/core/views/registry'
import { MAX_SESSION_TABS } from '../../src/shared/constants'

const alpha = viewRegistry.register({
  id: 'nav.alpha',
  title: 'Alpha',
  component: () => null
})
const beta = viewRegistry.register({
  id: 'nav.beta',
  title: 'Beta',
  component: () => null
})

beforeAll(async () => {
  await initI18n('en-US')
})

afterAll(() => {
  alpha.dispose()
  beta.dispose()
})

describe('session restore', () => {
  it('keeps the active tab when earlier tabs are dropped', () => {
    const restored = restoreSessionTabs(
      [
        { viewId: 'missing.view', params: {}, title: 'Missing' },
        { viewId: 'nav.alpha', params: {}, title: 'Alpha' },
        { viewId: 'nav.beta', params: {}, title: 'Beta' }
      ],
      1
    )
    expect(restored.activeIndex).toBe(0)
    expect(restored.activeTab?.viewId).toBe('nav.alpha')
  })

  it('stays on Home when the session has no active tab', () => {
    const restored = restoreSessionTabs([{ viewId: 'nav.alpha', params: {}, title: 'Alpha' }], -1)
    expect(restored.activeIndex).toBe(-1)
    expect(restored.activeTab).toBeUndefined()
  })
})

describe('session snapshot', () => {
  it('never exceeds the schema limit', () => {
    useTabsStore.setState({
      hydrated: true,
      tabs: Array.from({ length: MAX_SESSION_TABS + 5 }, (_, index) =>
        createTab('nav.alpha', { index }, 'Alpha')
      )
    })
    useRouteStore.getState().setActive('nav.alpha', { index: 0 })

    const snapshot = sessionSnapshot()
    expect(snapshot.tabs).toHaveLength(MAX_SESSION_TABS)
    expect(snapshot.activeIndex).toBe(0)
    useTabsStore.setState({ tabs: [], hydrated: true })
    useRouteStore.getState().clear()
  })

  it('refuses to create tabs beyond the schema limit', () => {
    useTabsStore.setState({
      hydrated: true,
      tabs: Array.from({ length: MAX_SESSION_TABS }, (_, index) =>
        createTab('nav.alpha', { index }, 'Alpha')
      )
    })

    expect(ensureTab('nav.alpha', { index: MAX_SESSION_TABS })).toBeNull()
    expect(useTabsStore.getState().tabs).toHaveLength(MAX_SESSION_TABS)
    useTabsStore.setState({ tabs: [], hydrated: true })
  })
})
