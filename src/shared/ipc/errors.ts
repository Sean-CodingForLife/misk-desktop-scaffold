export const ERROR_CODES = [
  'E_INVALID_INPUT',
  'E_NOT_FOUND',
  'E_CANCELED',
  'E_PERMISSION',
  'E_IO',
  'E_CONFLICT',
  'E_UNAVAILABLE',
  'E_INTERNAL'
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export interface IpcErrorPayload {
  code: ErrorCode
  message: string
  details?: unknown
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload }

export class AppError extends Error {
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

export class IpcError extends Error {
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(payload: IpcErrorPayload) {
    super(payload.message)
    this.name = 'IpcError'
    this.code = payload.code
    this.details = payload.details
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value)
}

export function toErrorPayload(error: unknown): IpcErrorPayload {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details }
  }
  if (error instanceof Error) {
    return { code: 'E_INTERNAL', message: error.message }
  }
  return { code: 'E_INTERNAL', message: String(error) }
}
