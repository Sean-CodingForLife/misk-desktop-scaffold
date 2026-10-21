import { promises as fs } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const configFile = join(root, 'app.config.json')
const packageFile = join(root, 'package.json')

function arg(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

try {
  const name = arg('--name')
  const id = arg('--id')
  const protocol = arg('--protocol')
  if (!name && !id && !protocol) {
    console.error(
      'Usage: npm run rename-app -- --name "Acme Desk" --id com.acme.desk --protocol acme'
    )
    process.exit(1)
  }

  const config = JSON.parse(await fs.readFile(configFile, 'utf8'))
  if (name) {
    config.productName = name
  }
  if (id) {
    config.appId = id
  }
  if (protocol) {
    config.protocol = protocol
  }
  await fs.writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  const pkg = JSON.parse(await fs.readFile(packageFile, 'utf8'))
  if (name) {
    pkg.name = slugify(name)
    pkg.description = `${name} - built with Misk Desktop.`
  }
  await fs.writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

  console.log(`Renamed to ${config.productName} (${config.appId}, ${config.protocol}://).`)
  console.log('Run npm install to refresh package-lock.json, then npm run dev.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
