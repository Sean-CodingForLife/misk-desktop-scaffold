import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type ElectronApplication, _electron as electron, type Page } from 'playwright'

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
  userData: string
}

export async function launchApp(
  options: { userData?: string; workspace?: string } = {}
): Promise<LaunchedApp> {
  const userData = options.userData ?? (await mkdtemp(join(tmpdir(), 'misk-e2e-')))
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value
    }
  }
  delete env.ELECTRON_RUN_AS_NODE
  env.MISK_E2E = '1'
  env.MISK_USER_DATA = userData
  if (options.workspace) {
    env.MISK_E2E_WORKSPACE = options.workspace
  }

  const app = await electron.launch({ args: ['.'], env })
  const page = await app.firstWindow()
  await page.waitForSelector('.app')
  // Deterministic UI language for selectors and screenshots.
  await page.evaluate(async () => {
    await window.misk.settings.patch({ locale: 'en-US' })
  })
  await page.waitForTimeout(300)
  return { app, page, userData }
}

export async function closeApp(app: ElectronApplication, userData: string): Promise<void> {
  await app.close()
  try {
    await rm(userData, { recursive: true, force: true })
  } catch {
    // Chromium can still be releasing its profile on Windows.
  }
}
