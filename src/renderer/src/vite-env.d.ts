/// <reference types="vite/client" />

import type { MiskApi } from '../../preload'

declare global {
  interface Window {
    misk: MiskApi
  }
}
