export interface NavigateOptions {
  to: string
  params?: Record<string, string>
  search?: Record<string, string | number | boolean>
}

export interface AppRouter {
  navigate: (options: NavigateOptions) => Promise<void> | void
}

let router: AppRouter | null = null

export function setAppRouter(value: AppRouter): void {
  router = value
}

export function getAppRouter(): AppRouter | null {
  return router
}
