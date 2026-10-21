import { APP_CONFIG } from '@shared/app-config'
import type { AppInfo } from '@shared/ipc/contract'
import { app } from 'electron'

export function getAppInfo(): AppInfo {
  return {
    name: APP_CONFIG.productName,
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    locale: app.getLocale(),
    repository: APP_CONFIG.repository,
    userDataPath: app.getPath('userData'),
    logsPath: app.getPath('logs')
  }
}
