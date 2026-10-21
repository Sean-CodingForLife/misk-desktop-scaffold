import { promises as fs } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const registryFile = join(root, 'src/renderer/src/modules/index.ts')
const tasksDir = join(root, 'src/renderer/src/modules/tasks')
const configFile = join(root, 'app.config.json')

try {
  await fs.rm(tasksDir, { recursive: true, force: true })
  let source = await fs.readFile(registryFile, 'utf8')
  source = source.replace("import { tasksModule } from './tasks'\n", '')
  source = source.replace(
    /\n {2}if \(APP_CONFIG\.features\.demo\) \{\n {4}modules\.push\(tasksModule\)\n {2}\}/,
    ''
  )
  await fs.writeFile(registryFile, source, 'utf8')

  const config = JSON.parse(await fs.readFile(configFile, 'utf8'))
  config.features.demo = false
  await fs.writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  console.log('Removed the Tasks demo module and disabled the demo feature flag.')
  console.log('You can now build your own module with: npm run gen:module -- my-module')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
