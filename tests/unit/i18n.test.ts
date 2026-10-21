import { beforeAll, describe, expect, it } from 'vitest'
import { initI18n, translateText } from '../../src/renderer/src/core/i18n'
import coreEn from '../../src/renderer/src/core/i18n/locales/en-US.json'
import coreZh from '../../src/renderer/src/core/i18n/locales/zh-CN.json'
import coreModuleEn from '../../src/renderer/src/modules/core/locales/en-US.json'
import coreModuleZh from '../../src/renderer/src/modules/core/locales/zh-CN.json'
import tasksEn from '../../src/renderer/src/modules/tasks/locales/en-US.json'
import tasksZh from '../../src/renderer/src/modules/tasks/locales/zh-CN.json'
import workspaceEn from '../../src/renderer/src/modules/workspace/locales/en-US.json'
import workspaceZh from '../../src/renderer/src/modules/workspace/locales/zh-CN.json'

function keysOf(value: Record<string, string>): string[] {
  return Object.keys(value).sort()
}

describe('i18n resources', () => {
  beforeAll(async () => {
    await initI18n('en-US')
  })

  it('keeps English and Chinese core keys in sync', () => {
    expect(keysOf(coreZh)).toEqual(keysOf(coreEn))
  })

  it('keeps module keys in sync', () => {
    expect(keysOf(coreModuleZh)).toEqual(keysOf(coreModuleEn))
    expect(keysOf(workspaceZh)).toEqual(keysOf(workspaceEn))
    expect(keysOf(tasksZh)).toEqual(keysOf(tasksEn))
  })

  it('falls back to the provided text for missing keys', () => {
    expect(translateText({ key: 'missing.key', fallback: 'Fallback' })).toBe('Fallback')
    expect(translateText('plain text')).toBe('plain text')
  })
})
