import { describe, expect, it } from 'vitest'
import {
  bindingFor,
  bindingsFor,
  conflictsFor
} from '../../src/renderer/src/core/commands/bindings'
import type { Command } from '../../src/renderer/src/core/commands/types'

function command(id: string, defaultKeybinding?: string): Command<void> {
  return { id, title: id, defaultKeybinding, run: () => undefined }
}

describe('command bindings', () => {
  it('prefers user overrides, including explicit unbinds', () => {
    const close = command('view.closeTab', 'Mod+W')
    expect(bindingFor(close, {})).toBe('Mod+W')
    expect(bindingFor(close, { 'view.closeTab': 'Mod+Q' })).toBe('Mod+Q')
    expect(bindingFor(close, { 'view.closeTab': null })).toBeNull()
  })

  it('collects only bound commands', () => {
    const map = bindingsFor([command('a.one', 'Mod+1'), command('a.two')], {})
    expect(map.get('a.one')).toBe('Mod+1')
    expect(map.has('a.two')).toBe(false)
  })

  it('detects normalized conflicts', () => {
    const commands = [command('a.one', 'Mod+Shift+P'), command('a.two', 'Shift+Mod+P')]
    const conflicts = conflictsFor(commands, {}, 'win32')
    expect(conflicts.get('a.one')).toEqual(['a.two'])
    expect(conflicts.get('a.two')).toEqual(['a.one'])
  })

  it('treats Mod and Ctrl as equivalent on Windows/Linux but not on macOS', () => {
    const commands = [command('a.ctrl', 'Ctrl+Tab'), command('a.mod', 'Mod+Tab')]
    expect(conflictsFor(commands, {}, 'win32').get('a.ctrl')).toEqual(['a.mod'])
    expect(conflictsFor(commands, {}, 'linux').get('a.ctrl')).toEqual(['a.mod'])
    expect(conflictsFor(commands, {}, 'darwin').get('a.ctrl')).toBeUndefined()
  })
})
