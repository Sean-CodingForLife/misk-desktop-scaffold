import { join } from 'node:path'
import type { LogLevel } from '@shared/constants'
import { app } from 'electron'
import log from 'electron-log/main'

export type { LogLevel }

export interface Logger {
  debug: (scope: string, message: string, meta?: unknown) => void
  info: (scope: string, message: string, meta?: unknown) => void
  warn: (scope: string, message: string, meta?: unknown) => void
  error: (scope: string, message: string, meta?: unknown) => void
}

let configured = false

export function initLogging(level: LogLevel): void {
  log.transports.file.resolvePathFn = () => join(app.getPath('logs'), 'main.log')
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.file.level = level
  log.transports.console.level = app.isPackaged ? false : 'debug'
  log.initialize()
  configured = true
}

export function setLogLevel(level: LogLevel): void {
  log.transports.file.level = level
}

function write(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  if (!configured) {
    console[level === 'debug' ? 'log' : level](`[${scope}] ${message}`, meta ?? '')
    return
  }
  const line = `[${scope}] ${message}`
  if (meta === undefined) {
    log[level](line)
  } else {
    log[level](line, meta)
  }
}

export const logger: Logger = {
  debug: (scope, message, meta) => write('debug', scope, message, meta),
  info: (scope, message, meta) => write('info', scope, message, meta),
  warn: (scope, message, meta) => write('warn', scope, message, meta),
  error: (scope, message, meta) => write('error', scope, message, meta)
}
