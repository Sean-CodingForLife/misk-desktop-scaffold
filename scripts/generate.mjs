import { promises as fs } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const modulesDir = join(root, 'src/renderer/src/modules')

function pascal(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

function camel(value) {
  const whole = pascal(value)
  return whole[0].toLowerCase() + whole.slice(1)
}

function validateName(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid name "${name}". Use lowercase letters, digits and dashes.`)
  }
}

function nextArg(args, flag) {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

async function writeIfMissing(file, content) {
  try {
    await fs.access(file)
    throw new Error(`Refusing to overwrite existing file: ${file}`)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
  await fs.mkdir(join(file, '..'), { recursive: true })
  await fs.writeFile(file, content, 'utf8')
}

async function addLocaleKeys(moduleName, keys) {
  for (const locale of ['en-US', 'zh-CN']) {
    const file = join(modulesDir, moduleName, 'locales', `${locale}.json`)
    const data = JSON.parse(await fs.readFile(file, 'utf8'))
    Object.assign(data, keys)
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }
}

async function insertBefore(file, marker, snippet) {
  let source = await fs.readFile(file, 'utf8')
  if (!source.includes(marker)) {
    throw new Error(`Marker not found in ${file}: ${marker}`)
  }
  source = source.replace(marker, `${snippet}\n  ${marker}`)
  await fs.writeFile(file, source, 'utf8')
}

function viewTemplate(moduleName, viewName) {
  const component = `${pascal(viewName)}View`
  const key = `${moduleName}.${viewName}.title`
  return `import { useTranslation } from 'react-i18next'
import type { ViewProps } from '@renderer/core/types'

export function ${component}(_props: ViewProps) {
  const { t } = useTranslation('${moduleName}')
  return (
    <div className="module-view">
      <h1>{t('${key}')}</h1>
      <p>{t('${moduleName}.${viewName}.description')}</p>
    </div>
  )
}
`
}

async function generateModule(args) {
  const name = args[0]
  if (!name) {
    throw new Error('Usage: npm run gen:module -- <name>')
  }
  validateName(name)
  const directory = join(modulesDir, name)
  const component = `${pascal(name)}View`
  await fs.mkdir(join(directory, 'locales'), { recursive: true })

  await writeIfMissing(
    join(directory, 'index.tsx'),
    `import { Sparkles } from 'lucide-react'
import { defineModule } from '@renderer/core/modules/types'
import { ${component} } from './${component}'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'

export const ${camel(name)}Module = defineModule({
  id: '${name}',
  name: { key: 'module.${name}.name', ns: '${name}', fallback: '${pascal(name)}' },
  description: {
    key: 'module.${name}.description',
    ns: '${name}',
    fallback: 'A custom ${name} module.'
  },
  activate: (ctx) => {
    ctx.i18n.add('en-US', '${name}', enUS)
    ctx.i18n.add('zh-CN', '${name}', zhCN)

    ctx.views.register({
      id: '${name}.main',
      title: { key: '${name}.main.title', ns: '${name}' },
      icon: Sparkles,
      component: ${component}
    })

    ctx.commands.register({
      id: '${name}.open',
      title: { key: '${name}.open', ns: '${name}' },
      category: { key: 'menu.view' },
      icon: Sparkles,
      run: (runtime) => runtime.openView('${name}.main')
    })

    ctx.menus.add('view', { command: '${name}.open', order: 80 })

    // <generated:views>
    // </generated:views>

    // <generated:panels>
    // </generated:panels>

    // <generated:settings>
    // </generated:settings>
  }
})
`
  )

  await writeIfMissing(
    join(directory, `${component}.tsx`),
    `import { useTranslation } from 'react-i18next'
import type { ViewProps } from '@renderer/core/types'

export function ${component}(_props: ViewProps) {
  const { t } = useTranslation('${name}')
  return (
    <div className="module-view">
      <h1>{t('${name}.main.title')}</h1>
      <p>{t('${name}.main.description')}</p>
    </div>
  )
}
`
  )

  const en = {
    [`module.${name}.name`]: pascal(name),
    [`module.${name}.description`]: `A custom ${name} module.`,
    [`${name}.main.title`]: pascal(name),
    [`${name}.main.description`]: 'Replace this view with your own content.',
    [`${name}.open`]: `Open ${pascal(name)}`
  }
  const zh = {
    [`module.${name}.name`]: pascal(name),
    [`module.${name}.description`]: `${pascal(name)} 模块。`,
    [`${name}.main.title`]: pascal(name),
    [`${name}.main.description`]: '把这里替换成你自己的内容。',
    [`${name}.open`]: `打开 ${pascal(name)}`
  }
  await writeIfMissing(join(directory, 'locales/en-US.json'), `${JSON.stringify(en, null, 2)}\n`)
  await writeIfMissing(join(directory, 'locales/zh-CN.json'), `${JSON.stringify(zh, null, 2)}\n`)

  const registryFile = join(modulesDir, 'index.ts')
  await insertBefore(
    registryFile,
    '// <generated:imports>',
    `import { ${camel(name)}Module } from './${name}'`
  )
  await insertBefore(registryFile, '// <generated:modules>', `  modules.push(${camel(name)}Module)`)

  console.log(`Created module ${name}.`)
  console.log(`  src/renderer/src/modules/${name}/`)
  console.log('It is registered in src/renderer/src/modules/index.ts.')
}

async function generateView(args) {
  const fullName = args[0]
  if (!fullName || !fullName.includes('.')) {
    throw new Error('Usage: npm run gen:view -- <module>.<view> [--module <module>]')
  }
  const [moduleName, viewName] = fullName.split('.')
  validateName(moduleName)
  validateName(viewName)
  const directory = join(modulesDir, moduleName)
  const component = `${pascal(viewName)}View`
  const file = join(directory, `${component}.tsx`)
  await writeIfMissing(file, viewTemplate(moduleName, viewName))
  const registryFile = join(directory, 'index.tsx')
  const snippet = `    ctx.views.register({
      id: '${moduleName}.${viewName}',
      title: { key: '${moduleName}.${viewName}.title', ns: '${moduleName}' },
      component: ${component}
    })`
  try {
    await insertBefore(registryFile, '// <generated:views>', snippet)
  } catch (error) {
    console.log(`Created ${file}. Add this registration manually:\n${snippet}`)
    return
  }
  await addLocaleKeys(moduleName, {
    [`${moduleName}.${viewName}.title`]: pascal(viewName),
    [`${moduleName}.${viewName}.description`]: 'New view.'
  })
  console.log(`Created view ${fullName}.`)
}

async function generatePanel(args) {
  const fullName = args[0]
  if (!fullName || !fullName.includes('.')) {
    throw new Error('Usage: npm run gen:panel -- <module>.<panel>')
  }
  const [moduleName, panelName] = fullName.split('.')
  validateName(moduleName)
  validateName(panelName)
  const component = `${pascal(panelName)}Panel`
  const file = join(modulesDir, moduleName, `${component}.tsx`)
  await writeIfMissing(
    file,
    `import { useTranslation } from 'react-i18next'

export function ${component}() {
  const { t } = useTranslation('${moduleName}')
  return <div className="panel-stack"><p>{t('${moduleName}.${panelName}.title')}</p></div>
}
`
  )
  const snippet = `    ctx.panels.register({
      id: '${moduleName}.${panelName}',
      title: { key: '${moduleName}.${panelName}.title', ns: '${moduleName}' },
      icon: Sparkles,
      component: ${component}
    })`
  try {
    await insertBefore(join(modulesDir, moduleName, 'index.tsx'), '// <generated:panels>', snippet)
  } catch {
    console.log(`Created ${file}. Add this registration manually:\n${snippet}`)
    return
  }
  await addLocaleKeys(moduleName, { [`${moduleName}.${panelName}.title`]: pascal(panelName) })
  console.log(`Created panel ${fullName}.`)
}

async function generateSettings(args) {
  const fullName = args[0]
  if (!fullName || !fullName.includes('.')) {
    throw new Error('Usage: npm run gen:settings -- <module>.<section>')
  }
  const [moduleName, sectionName] = fullName.split('.')
  validateName(moduleName)
  validateName(sectionName)
  const component = `${pascal(sectionName)}Settings`
  const file = join(modulesDir, moduleName, `${component}.tsx`)
  await writeIfMissing(
    file,
    `import { useTranslation } from 'react-i18next'

export function ${component}() {
  const { t } = useTranslation('${moduleName}')
  return <p className="panel-hint">{t('${moduleName}.${sectionName}.title')}</p>
}
`
  )
  const snippet = `    ctx.settings.register({
      id: '${moduleName}.${sectionName}',
      title: { key: '${moduleName}.${sectionName}.title', ns: '${moduleName}' },
      component: ${component}
    })`
  try {
    await insertBefore(
      join(modulesDir, moduleName, 'index.tsx'),
      '// <generated:settings>',
      snippet
    )
  } catch {
    console.log(`Created ${file}. Add this registration manually:\n${snippet}`)
    return
  }
  await addLocaleKeys(moduleName, { [`${moduleName}.${sectionName}.title`]: pascal(sectionName) })
  console.log(`Created settings section ${fullName}.`)
}

const mode = process.argv[2]
const args = process.argv.slice(3)
const name = nextArg(args, '--name')
if (name) {
  args.unshift(name)
}

try {
  switch (mode) {
    case 'module':
      await generateModule(args)
      break
    case 'view':
      await generateView(args)
      break
    case 'panel':
      await generatePanel(args)
      break
    case 'settings':
      await generateSettings(args)
      break
    default:
      console.error('Usage: node scripts/generate.mjs <module|view|panel|settings> <name>')
      process.exitCode = 1
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
