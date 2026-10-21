export const IPC_VERSION = 1

export const MAX_RECENT_WORKSPACES = 10
export const MAX_SESSION_TABS = 50
export const MAX_STORAGE_BYTES = 2 * 1024 * 1024
export const PREVIEW_TEXT_LIMIT = 1024 * 1024
export const PREVIEW_IMAGE_LIMIT = 5 * 1024 * 1024
export const FILE_GRANT_LIMIT = 32
export const WORKSPACE_LIST_LIMIT = 2000
export const WORKSPACE_SCAN_LIMIT = 5000
export const WORKSPACE_SEARCH_LIMIT = 50

export const THEMES = ['system', 'light', 'dark'] as const
export const ACCENTS = ['violet', 'cyan', 'emerald', 'amber', 'rose'] as const
export const DENSITIES = ['comfortable', 'compact'] as const
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export const MENU_ROLES = [
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'pasteAndMatchStyle',
  'delete',
  'selectAll',
  'minimize',
  'zoom',
  'close',
  'quit',
  'togglefullscreen',
  'reload',
  'toggleDevTools'
] as const
