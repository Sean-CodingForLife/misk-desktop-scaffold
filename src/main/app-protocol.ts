import { promises as fs } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { APP_CONFIG } from '@shared/app-config'
import { protocol } from 'electron'

const RENDERER_ROOT = join(__dirname, '../renderer')

export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ])
}

function connectSources(dev: boolean): string {
  const sources = new Set(["'self'", ...APP_CONFIG.csp.connectSrc])
  if (dev) {
    sources.add('ws:')
    sources.add('http:')
    sources.add('https:')
  }
  return [...sources].join(' ')
}

export function cspFor(dev: boolean): string {
  return [
    "default-src 'none'",
    dev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources(dev)}`,
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join('; ')
}

function mimeFor(file: string): string {
  const extension = file.slice(file.lastIndexOf('.') + 1).toLowerCase()
  switch (extension) {
    case 'html':
      return 'text/html; charset=utf-8'
    case 'js':
      return 'text/javascript; charset=utf-8'
    case 'css':
      return 'text/css; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'svg':
      return 'image/svg+xml'
    case 'png':
      return 'image/png'
    case 'ico':
      return 'image/x-icon'
    case 'woff2':
      return 'font/woff2'
    case 'woff':
      return 'font/woff'
    case 'map':
      return 'application/json; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

export function installAppProtocol(): void {
  protocol.handle('app', async (request) => {
    try {
      const url = new URL(request.url)
      if (url.host !== 'bundle') {
        return new Response('Not found', { status: 404 })
      }
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
      const target = resolve(RENDERER_ROOT, relative)
      if (target !== RENDERER_ROOT && !target.startsWith(`${RENDERER_ROOT}${sep}`)) {
        return new Response('Forbidden', { status: 403 })
      }
      const data = await fs.readFile(target)
      return new Response(new Uint8Array(data), {
        headers: {
          'content-type': mimeFor(target),
          'content-security-policy': cspFor(false)
        }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
