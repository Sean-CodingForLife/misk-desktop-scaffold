import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { AppInfo, ExportResult } from '@shared/ipc/contract'
import type { AppSession } from '@shared/session/schema'
import type { AppSettings } from '@shared/settings/schema'
import { app, type BrowserWindow, dialog } from 'electron'
import type { SessionService } from './session'
import type { SettingsService } from './settings'

function redactSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    workspace: {
      ...settings.workspace,
      recent: settings.workspace.recent.map((item) => ({ ...item, path: '[redacted]' }))
    }
  }
}

export class DiagnosticsService {
  constructor(
    private readonly settings: SettingsService,
    private readonly session: SessionService,
    private readonly getInfo: () => AppInfo
  ) {}

  async export(window: BrowserWindow | null, snapshot?: unknown): Promise<ExportResult> {
    const suggested = `misk-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const result = window
      ? await dialog.showSaveDialog(window, {
          defaultPath: suggested,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
      : await dialog.showSaveDialog({
          defaultPath: suggested,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        })
    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }
    const logs = await this.readLogTail()
    const payload = {
      generatedAt: new Date().toISOString(),
      app: this.getInfo(),
      settings: redactSettings(this.settings.get()),
      session: this.session.get() as AppSession,
      snapshot,
      logTail: logs
    }
    await fs.writeFile(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    return { canceled: false, path: result.filePath }
  }

  private async readLogTail(): Promise<string> {
    try {
      const raw = await fs.readFile(join(app.getPath('logs'), 'main.log'), 'utf8')
      return raw.split(/\r?\n/).slice(-500).join('\n')
    } catch {
      return ''
    }
  }
}
