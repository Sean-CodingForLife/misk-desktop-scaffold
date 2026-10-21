import { describe, expect, it } from 'vitest'
import { useDialogStore } from '../../src/renderer/src/core/dialog/store'
import { tabKey, useRouteStore } from '../../src/renderer/src/core/route/store'
import { createTab, useTabsStore } from '../../src/renderer/src/core/tabs/store'
import { useToastStore } from '../../src/renderer/src/core/toast/store'
import { useUiStore } from '../../src/renderer/src/core/ui/store'
import { useTaskSettingsStore, useTasksStore } from '../../src/renderer/src/modules/tasks/store'

describe('route and tab stores', () => {
  it('builds stable tab keys', () => {
    expect(tabKey('tasks.board', { b: 2, a: 'x' })).toBe('tasks.board?a=x&b=2')
    expect(tabKey('core.settings', {})).toBe('core.settings?')
  })

  it('tracks the active route', () => {
    useRouteStore.getState().setActive('tasks.board', { filter: 'todo' })
    expect(useRouteStore.getState().viewId).toBe('tasks.board')
    expect(useRouteStore.getState().key).toBe('tasks.board?filter=todo')
    useRouteStore.getState().clear()
    expect(useRouteStore.getState().key).toBeNull()
  })

  it('adds, retitles and removes tabs', () => {
    useTabsStore.setState({ tabs: [], hydrated: true })
    const tab = createTab('tasks.board', {}, 'Tasks')
    useTabsStore.getState().add(tab)
    expect(useTabsStore.getState().tabs).toHaveLength(1)
    useTabsStore.getState().updateTitle(tab.id, 'My Tasks')
    expect(useTabsStore.getState().tabs[0]?.title).toBe('My Tasks')
    expect(useTabsStore.getState().tabs[0]?.customTitle).toBe(true)
    expect(useTabsStore.getState().remove(tab.id)).toBe(0)
    expect(useTabsStore.getState().tabs).toHaveLength(0)
  })

  it('reorders tabs', () => {
    useTabsStore.setState({
      tabs: [createTab('a.one', {}, 'One'), createTab('a.two', {}, 'Two')],
      hydrated: true
    })
    useTabsStore.getState().reorder(0, 1)
    expect(useTabsStore.getState().tabs.map((tab) => tab.viewId)).toEqual(['a.two', 'a.one'])
  })
})

describe('UI stores', () => {
  it('opens and closes overlays', () => {
    useUiStore.getState().openPalette()
    expect(useUiStore.getState().paletteOpen).toBe(true)
    useUiStore.getState().openQuickSwitcher()
    expect(useUiStore.getState().quickSwitcherOpen).toBe(true)
    expect(useUiStore.getState().paletteOpen).toBe(false)
    useUiStore.getState().closeOverlays()
    expect(useUiStore.getState().quickSwitcherOpen).toBe(false)
  })

  it('tracks keybinding recording state', () => {
    useUiStore.getState().setKeybindingRecording(true)
    expect(useUiStore.getState().keybindingRecording).toBe(true)
    useUiStore.getState().setKeybindingRecording(false)
    expect(useUiStore.getState().keybindingRecording).toBe(false)
  })

  it('resolves confirmation dialogs', async () => {
    const promise = useDialogStore.getState().confirm({ title: 'Title', message: 'Message' })
    expect(useDialogStore.getState().request?.options.title).toBe('Title')
    useDialogStore.getState().resolve(true)
    await expect(promise).resolves.toBe(true)
    expect(useDialogStore.getState().request).toBeNull()
  })

  it('adds and dismisses toasts', () => {
    useToastStore.setState({ toasts: [] })
    useToastStore.getState().notify('hello', 'success')
    expect(useToastStore.getState().toasts[0]?.message).toBe('hello')
    const id = useToastStore.getState().toasts[0]?.id
    if (id) {
      useToastStore.getState().dismiss(id)
    }
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})

describe('task store', () => {
  it('adds, moves and clears tasks', () => {
    useTasksStore.setState({ tasks: [], hydrated: true })
    useTasksStore.getState().add('First')
    useTasksStore.getState().add('Second')
    const first = useTasksStore.getState().tasks[0]
    expect(first?.title).toBe('First')
    if (first) {
      useTasksStore.getState().move(first.id, 'done')
      expect(useTasksStore.getState().tasks[0]?.column).toBe('done')
      useTasksStore.getState().update(first.id, { title: 'Renamed' })
      expect(useTasksStore.getState().tasks[0]?.title).toBe('Renamed')
      useTasksStore.getState().clearDone()
      expect(useTasksStore.getState().tasks).toHaveLength(1)
    }
  })

  it('stores the showDone preference', () => {
    useTaskSettingsStore.getState().hydrate(false)
    expect(useTaskSettingsStore.getState().showDone).toBe(false)
    useTaskSettingsStore.getState().setShowDone(true)
    expect(useTaskSettingsStore.getState().showDone).toBe(true)
  })
})
