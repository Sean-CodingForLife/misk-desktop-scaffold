import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

// Electron ships its binary through a postinstall script. Some npm/pnpm
// configurations skip dependency install scripts, so run it explicitly when
// the package is present. If the binary already exists the script exits fast.
const installer = 'node_modules/electron/install.js'
if (existsSync(installer)) {
  execFileSync(process.execPath, [installer], { stdio: 'inherit' })
}
