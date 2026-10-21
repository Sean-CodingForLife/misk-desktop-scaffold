import { describe, expect, it } from 'vitest'
import {
  bindingFromEvent,
  formatKeybinding,
  keybindingMatches,
  normalizeKeybinding,
  parseKeybinding,
  toElectronAccelerator
} from '../../src/shared/keybindings'

function event(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: '',
    code: '',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    defaultPrevented: false,
    ...overrides
  } as KeyboardEvent
}

describe('keybindings', () => {
  it('parses Mod into a platform-neutral modifier', () => {
    const parsed = parseKeybinding('Mod+Shift+P')
    expect(parsed?.usesMod).toBe(true)
    expect(parsed?.shift).toBe(true)
    expect(parsed?.key).toBe('p')
  })

  it('normalizes equivalent bindings', () => {
    expect(normalizeKeybinding('Shift+Mod+P')).toBe('mod+shift+p')
    expect(normalizeKeybinding('cmd+shift+p')).toBe('meta+shift+p')
  })

  it('formats for macOS and PC', () => {
    expect(formatKeybinding('Mod+Shift+P', 'darwin')).toBe('⌘⇧P')
    expect(formatKeybinding('Mod+Shift+P', 'win32')).toBe('Ctrl+Shift+P')
    expect(formatKeybinding('F1', 'win32')).toBe('F1')
  })

  it('converts to Electron accelerator syntax', () => {
    expect(toElectronAccelerator('Mod+Shift+P')).toBe('CmdOrCtrl+Shift+P')
    expect(toElectronAccelerator('Ctrl+Tab')).toBe('Ctrl+Tab')
  })

  it('matches exact modifier state', () => {
    expect(
      keybindingMatches(event({ key: 'p', ctrlKey: true, shiftKey: true }), 'Mod+Shift+P', 'win32')
    ).toBe(true)
    expect(keybindingMatches(event({ key: 'p', ctrlKey: true }), 'Mod+Shift+P', 'win32')).toBe(
      false
    )
    expect(
      keybindingMatches(event({ key: 'p', metaKey: true, shiftKey: true }), 'Mod+Shift+P', 'darwin')
    ).toBe(true)
  })

  it('builds a binding from a keyboard event', () => {
    expect(bindingFromEvent(event({ key: 'p', ctrlKey: true, shiftKey: true }), 'win32')).toBe(
      'Mod+Shift+P'
    )
    expect(bindingFromEvent(event({ key: 'F1' }), 'win32')).toBe('F1')
    expect(bindingFromEvent(event({ key: 'Control', ctrlKey: true }), 'win32')).toBeNull()
  })
})
