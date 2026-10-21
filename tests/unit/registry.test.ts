import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { CommandRegistry } from '../../src/renderer/src/core/commands/registry'
import type { CommandRuntime } from '../../src/renderer/src/core/commands/types'
import type { WhenContext } from '../../src/renderer/src/core/types'
import { ViewRegistry } from '../../src/renderer/src/core/views/registry'

const when: WhenContext = {
  workspaceOpen: false,
  paletteOpen: false,
  quickSwitcherOpen: false,
  modalOpen: false
}

function runtime(): CommandRuntime {
  return {
    notify: vi.fn(),
    getWhenContext: () => when
  } as unknown as CommandRuntime
}

describe('ViewRegistry', () => {
  it('registers, parses params and evaluates restorable', () => {
    const registry = new ViewRegistry()
    const dispose = registry.register({
      id: 'test.view',
      title: 'Test view',
      component: () => null,
      params: z.object({ id: z.string() }),
      restorable: (params) => params.id !== 'temp'
    })
    expect(registry.get('test.view')?.id).toBe('test.view')
    expect(registry.parseParams(registry.get('test.view')!, { id: 'a' }).ok).toBe(true)
    expect(registry.parseParams(registry.get('test.view')!, { id: 1 }).ok).toBe(false)
    expect(registry.isRestorable(registry.get('test.view')!, { id: 'a' })).toBe(true)
    expect(registry.isRestorable(registry.get('test.view')!, { id: 'temp' })).toBe(false)
    expect(registry.componentFor(registry.get('test.view')!)).toBeTruthy()
    dispose.dispose()
    expect(registry.get('test.view')).toBeUndefined()
  })

  it('rejects malformed ids and duplicates', () => {
    const registry = new ViewRegistry()
    expect(() => registry.register({ id: 'bad', title: 'Bad', component: () => null })).toThrow(
      /invalid id/
    )
    registry.register({ id: 'test.one', title: 'One', component: () => null })
    registry.register({ id: 'test.one', title: 'One again', component: () => null })
    expect(registry.list()).toHaveLength(1)
  })
})

describe('CommandRegistry', () => {
  it('validates args and runs commands', async () => {
    const registry = new CommandRegistry()
    const run = vi.fn()
    registry.register({
      id: 'test.run',
      title: 'Run',
      args: z.object({ count: z.number().int() }),
      run
    })
    expect(await registry.execute('test.run', { count: 2 }, runtime())).toBe(true)
    expect(run).toHaveBeenCalledTimes(1)
    expect(await registry.execute('test.run', { count: 'nope' }, runtime())).toBe(false)
  })

  it('skips commands whose when() is false and reports unknown ids', async () => {
    const registry = new CommandRegistry()
    const run = vi.fn()
    registry.register({ id: 'test.disabled', title: 'Disabled', when: () => false, run })
    const ctx = runtime()
    expect(await registry.execute('test.disabled', undefined, ctx)).toBe(false)
    expect(await registry.execute('test.missing', undefined, ctx)).toBe(false)
    expect(ctx.notify).toHaveBeenCalled()
  })

  it('contains throwing commands', async () => {
    const registry = new CommandRegistry()
    registry.register({
      id: 'test.throw',
      title: 'Throw',
      run: () => {
        throw new Error('boom')
      }
    })
    const ctx = runtime()
    expect(await registry.execute('test.throw', undefined, ctx)).toBe(false)
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining('boom'), 'error')
  })
})
