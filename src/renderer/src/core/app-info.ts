import type { AppInfo } from '@shared/ipc/contract'

let appInfo: AppInfo | null = null

export function setAppInfo(info: AppInfo): void {
  appInfo = info
}

export function getAppInfo(): AppInfo {
  if (!appInfo) {
    throw new Error('App info is not initialized')
  }
  return appInfo
}

export function useAppInfo(): AppInfo {
  return getAppInfo()
}
