export type Platform = 'darwin' | 'win32' | 'linux' | string

const MAC_MODIFIER_LABELS: Record<string, string> = {
  mod: '⌘',
  meta: '⌘',
  cmd: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧'
}

const PC_MODIFIER_LABELS: Record<string, string> = {
  mod: 'Ctrl',
  meta: 'Meta',
  cmd: 'Cmd',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift'
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  escape: 'escape',
  return: 'enter',
  enter: 'enter',
  space: 'space',
  spacebar: 'space',
  del: 'delete',
  delete: 'delete',
  backspace: 'backspace',
  tab: 'tab',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  arrowup: 'arrowup',
  arrowdown: 'arrowdown',
  arrowleft: 'arrowleft',
  arrowright: 'arrowright',
  plus: '+',
  minus: '-',
  comma: ',',
  period: '.',
  slash: '/'
}

export interface ParsedKeybinding {
  key: string
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  usesMod: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

function normalizeKey(key: string): string {
  const lower = key.trim().toLowerCase()
  if (KEY_ALIASES[lower]) {
    return KEY_ALIASES[lower]
  }
  if (lower.length === 1) {
    return lower
  }
  return lower
}

export function parseKeybinding(binding: string): ParsedKeybinding | null {
  const parts = binding
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return null
  }
  const keyToken = parts.pop()
  if (!keyToken) {
    return null
  }
  const modifiers = new Set(parts.map(normalizeToken))
  const usesMod = modifiers.has('mod')
  return {
    key: normalizeKey(keyToken),
    ctrl: modifiers.has('ctrl') || modifiers.has('control'),
    meta: modifiers.has('meta') || modifiers.has('cmd'),
    alt: modifiers.has('alt') || modifiers.has('option'),
    shift: modifiers.has('shift'),
    usesMod
  }
}

export function normalizeKeybinding(binding: string): string | null {
  const parsed = parseKeybinding(binding)
  if (!parsed) {
    return null
  }
  const parts: string[] = []
  if (parsed.usesMod) {
    parts.push('mod')
  }
  if (parsed.ctrl) {
    parts.push('ctrl')
  }
  if (parsed.meta) {
    parts.push('meta')
  }
  if (parsed.alt) {
    parts.push('alt')
  }
  if (parsed.shift) {
    parts.push('shift')
  }
  parts.push(parsed.key)
  return parts.join('+')
}

export function formatKeybinding(binding: string, platform: Platform): string {
  const parsed = parseKeybinding(binding)
  if (!parsed) {
    return binding
  }
  const isMac = platform === 'darwin'
  const labels = isMac ? MAC_MODIFIER_LABELS : PC_MODIFIER_LABELS
  const modifiers: string[] = []
  if (parsed.usesMod) {
    modifiers.push(labels.mod)
  }
  if (parsed.ctrl) {
    modifiers.push(labels.ctrl)
  }
  if (parsed.meta) {
    modifiers.push(labels.meta)
  }
  if (parsed.alt) {
    modifiers.push(labels.alt)
  }
  if (parsed.shift) {
    modifiers.push(labels.shift)
  }
  const key = formatKeyLabel(parsed.key)
  if (isMac) {
    return `${modifiers.join('')}${key}`
  }
  return [...modifiers, key].join('+')
}

function formatKeyLabel(key: string): string {
  switch (key) {
    case 'arrowup':
      return '↑'
    case 'arrowdown':
      return '↓'
    case 'arrowleft':
      return '←'
    case 'arrowright':
      return '→'
    case 'escape':
      return 'Esc'
    case 'enter':
      return 'Enter'
    case 'space':
      return 'Space'
    case 'tab':
      return 'Tab'
    case 'backspace':
      return 'Backspace'
    case 'delete':
      return 'Del'
    default:
      return key.length === 1 ? key.toUpperCase() : key.toUpperCase()
  }
}

export function toElectronAccelerator(binding: string): string | null {
  const parsed = parseKeybinding(binding)
  if (!parsed) {
    return null
  }
  const parts: string[] = []
  if (parsed.usesMod) {
    parts.push('CmdOrCtrl')
  }
  if (parsed.ctrl) {
    parts.push('Ctrl')
  }
  if (parsed.meta) {
    parts.push('Cmd')
  }
  if (parsed.alt) {
    parts.push('Alt')
  }
  if (parsed.shift) {
    parts.push('Shift')
  }
  parts.push(electronKey(parsed.key))
  return parts.join('+')
}

function electronKey(key: string): string {
  switch (key) {
    case 'escape':
      return 'Escape'
    case 'enter':
      return 'Enter'
    case 'space':
      return 'Space'
    case 'tab':
      return 'Tab'
    case 'backspace':
      return 'Backspace'
    case 'delete':
      return 'Delete'
    case 'arrowup':
      return 'Up'
    case 'arrowdown':
      return 'Down'
    case 'arrowleft':
      return 'Left'
    case 'arrowright':
      return 'Right'
    default:
      return key.length === 1 ? key.toUpperCase() : key
  }
}

export function keybindingMatches(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  binding: string,
  platform: Platform
): boolean {
  const parsed = parseKeybinding(binding)
  if (!parsed) {
    return false
  }
  const isMac = platform === 'darwin'
  const wantMeta = parsed.meta || (parsed.usesMod && isMac)
  const wantCtrl = parsed.ctrl || (parsed.usesMod && !isMac)
  if (
    event.metaKey !== wantMeta ||
    event.ctrlKey !== wantCtrl ||
    event.altKey !== parsed.alt ||
    event.shiftKey !== parsed.shift
  ) {
    return false
  }
  const eventKey = normalizeKey(event.key)
  if (eventKey === parsed.key) {
    return true
  }
  const eventCode = event.code.toLowerCase()
  if (eventCode === parsed.key) {
    return true
  }
  if (parsed.key === 'space' && (event.code === 'Space' || event.key === ' ')) {
    return true
  }
  return false
}

export function bindingFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  platform: Platform
): string | null {
  const pureModifier = ['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)
  if (pureModifier) {
    return null
  }
  const isMac = platform === 'darwin'
  const parts: string[] = []
  if (isMac ? event.metaKey : event.ctrlKey) {
    parts.push('Mod')
  }
  if ((isMac && event.ctrlKey) || (!isMac && event.metaKey)) {
    parts.push(isMac ? 'Ctrl' : 'Meta')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }
  const key = event.key === ' ' ? 'Space' : event.key
  const normalized = normalizeKey(key)
  if (!normalized) {
    return null
  }
  parts.push(formatKeyLabel(normalized))
  return parts.join('+')
}
