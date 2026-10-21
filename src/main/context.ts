import type { AppInfo } from '@shared/ipc/contract'
import type { MenuService } from './app/menu'
import type { WindowService } from './app/windows'
import type { DiagnosticsService } from './services/diagnostics'
import type { FilesService } from './services/files'
import type { SecretsService } from './services/secrets'
import type { SessionService } from './services/session'
import type { SettingsService } from './services/settings'
import type { StorageService } from './services/storage'
import type { WorkspaceService } from './services/workspace'

export interface AppContext {
  appInfo: AppInfo
  settings: SettingsService
  session: SessionService
  storage: StorageService
  secrets: SecretsService
  files: FilesService
  workspace: WorkspaceService
  diagnostics: DiagnosticsService
  menu: MenuService
  windows: WindowService
  resolveClose: (requestId: string, allow: boolean) => void
}
