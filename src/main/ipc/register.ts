import { promises as fs } from 'node:fs'
import {
  type Channel,
  closeResponseSchema,
  eventSchemas,
  type InputOf,
  ipcContract,
  logEntrySchema,
  type OutputOf
} from '@shared/ipc/contract'
import { AppError, toErrorPayload } from '@shared/ipc/errors'
import { app, clipboard, dialog, ipcMain, shell } from 'electron'
import { logger } from '../app/logging'
import { showNotification } from '../app/notifications'
import type { AppContext } from '../context'
import { assertTrustedSender, openExternalUrl } from '../security'

type Handler<C extends Channel> = (input: InputOf<C>) => OutputOf<C> | Promise<OutputOf<C>>

function define<C extends Channel>(
  channel: C,
  handler: Handler<C>
): { channel: C; run: (input: unknown) => Promise<unknown> } {
  return {
    channel,
    run: async (input) => handler(input as InputOf<C>)
  }
}

export function registerIpc(context: AppContext): void {
  const window = () => context.windows.get()

  const handlers = [
    define('app:get-info', () => context.appInfo),
    define('app:quit', () => {
      app.quit()
    }),
    define('app:open-logs', async () => {
      await shell.openPath(app.getPath('logs'))
    }),
    define('app:open-external', async ({ url }) => {
      await openExternalUrl(url)
    }),
    define('app:renderer-ready', () => {
      context.rendererReady()
    }),

    define('window:minimize', () => {
      context.windows.minimize()
    }),
    define('window:toggle-maximize', () => context.windows.toggleMaximize()),
    define('window:close', () => {
      context.windows.close()
    }),
    define('window:is-maximized', () => context.windows.isMaximized()),

    define('settings:get', () => context.settings.get()),
    define('settings:patch', (patch) => context.settings.patch(patch)),
    define('settings:reset', () => context.settings.reset()),
    define('settings:export', async () => {
      const result = window()
        ? await dialog.showSaveDialog(window()!, {
            defaultPath: 'misk-settings.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
          })
        : await dialog.showSaveDialog({
            defaultPath: 'misk-settings.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
          })
      if (result.canceled || !result.filePath) {
        return { canceled: true }
      }
      await fs.writeFile(
        result.filePath,
        `${JSON.stringify(context.settings.get(), null, 2)}\n`,
        'utf8'
      )
      return { canceled: false, path: result.filePath }
    }),
    define('settings:import', async () => {
      const result = window()
        ? await dialog.showOpenDialog(window()!, {
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
          })
        : await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
          })
      const path = result.filePaths[0]
      if (result.canceled || !path) {
        return { canceled: true }
      }
      let raw: unknown
      try {
        raw = JSON.parse(await fs.readFile(path, 'utf8')) as unknown
      } catch {
        throw new AppError('E_INVALID_INPUT', 'Settings file is not valid JSON')
      }
      const settings = await context.settings.replace(raw)
      return { canceled: false, settings }
    }),

    define('secrets:set', ({ key, value }) => context.secrets.set(key, value)),
    define('secrets:get', ({ key }) => context.secrets.get(key)),
    define('secrets:delete', ({ key }) => context.secrets.delete(key)),
    define('secrets:keys', () => context.secrets.keys()),

    define('storage:read', ({ key }) => context.storage.read(key)),
    define('storage:write', ({ key, value }) => context.storage.write(key, value)),
    define('storage:delete', ({ key }) => context.storage.delete(key)),
    define('storage:keys', () => context.storage.keys()),

    define('session:get', () => context.session.get()),
    define('session:patch', (patch) => context.session.patch(patch)),

    define('files:open-dialog', ({ kind, filters }) =>
      context.files.openDialog(window(), kind, filters)
    ),
    define('files:save-as', (input) => context.files.saveAs(window(), input)),
    define('files:read', ({ handle, maxBytes, encoding }) =>
      context.files.read(handle, maxBytes, encoding)
    ),
    define('files:write', ({ handle, content, encoding }) =>
      context.files.write(handle, content, encoding)
    ),
    define('files:stat', ({ handle }) => context.files.stat(handle)),
    define('files:close', ({ handle }) => {
      context.files.close(handle)
    }),
    define('files:grant', ({ paths }) => context.files.grant(paths)),
    define('files:reveal', ({ handle }) => {
      context.files.reveal(handle)
    }),
    define('files:open-external', ({ handle }) => context.files.openExternal(handle)),

    define('workspace:open-dialog', () => context.workspace.openDialog(window())),
    define('workspace:open-handle', ({ handle }) => context.workspace.openHandle(handle)),
    define('workspace:open-recent', ({ id }) => context.workspace.openRecent(id)),
    define('workspace:list', ({ id, path }) => context.workspace.list(id, path)),
    define('workspace:read-file', ({ id, path, maxBytes }) =>
      context.workspace.readFile(id, path, maxBytes)
    ),
    define('workspace:find-files', ({ id, query, limit }) =>
      context.workspace.findFiles(id, query, limit)
    ),
    define('workspace:watch', ({ id }) => {
      context.workspace.watch(id)
    }),
    define('workspace:unwatch', ({ id }) => {
      context.workspace.unwatch(id)
    }),
    define('workspace:reveal', ({ id, path }) => {
      context.workspace.reveal(id, path)
    }),
    define('workspace:open-external', ({ id, path }) => context.workspace.openExternal(id, path)),
    define('workspace:close', ({ id }) => {
      context.workspace.close(id)
    }),

    define('menu:update', ({ template }) => {
      context.menu.setTemplate(template, window())
    }),
    define('menu:popup', ({ items, x, y }) => {
      context.menu.popup(window(), items, x, y)
    }),
    define('menu:run-role', ({ role }) => {
      context.menu.runRole(window(), role)
    }),

    define('notifications:show', (request) => {
      showNotification(request, (action) => {
        context.windows.send('notifications:activated', { action })
        context.windows.focus()
      })
    }),
    define('clipboard:write-text', ({ text }) => {
      clipboard.writeText(text)
    }),
    define('clipboard:read-text', () => clipboard.readText()),

    define('diagnostics:export', ({ snapshot }) => context.diagnostics.export(window(), snapshot))
  ]

  for (const handler of handlers) {
    ipcMain.handle(handler.channel, async (event, payload: unknown) => {
      try {
        assertTrustedSender(event)
        const input = ipcContract[handler.channel].input.parse(payload)
        const data = await handler.run(input)
        const output = ipcContract[handler.channel].output.parse(data)
        return { ok: true, data: output }
      } catch (error) {
        logger.error('ipc', `handler failed: ${handler.channel}`, error)
        return { ok: false, error: toErrorPayload(error) }
      }
    })
  }

  ipcMain.on('app:close-response', (event, payload: unknown) => {
    try {
      assertTrustedSender(event)
      const { requestId, allow } = closeResponseSchema.parse(payload)
      context.resolveClose(requestId, allow)
    } catch (error) {
      logger.warn('ipc', 'invalid close response', error)
    }
  })

  ipcMain.on('log:write', (event, payload: unknown) => {
    try {
      assertTrustedSender(event)
      const entry = logEntrySchema.parse(payload)
      logger[entry.level](entry.scope, entry.message, entry.meta)
    } catch {
      // Never let renderer logging failures escape.
    }
  })
}

export const eventNames = Object.keys(eventSchemas) as (keyof typeof eventSchemas)[]
