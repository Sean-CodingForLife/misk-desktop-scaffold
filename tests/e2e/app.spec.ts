import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './launch'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

test('boots to Home and opens a view from the command palette', async () => {
  const { app, page, userData } = await launchApp()
  try {
    await expect(page.locator('.home h1')).toHaveText('Make yourself at home')
    await page.keyboard.press('Control+Shift+P')
    await expect(page.locator('.palette')).toBeVisible()
    await page.locator('.palette-input').fill('settings')
    await page
      .locator('.palette-item', {
        has: page.locator('.palette-item-title', { hasText: /^Settings$/ })
      })
      .first()
      .click()
    await expect(page.locator('.settings-view')).toBeVisible()
    await expect(page.locator('.settings-nav')).toContainText('Appearance')
  } finally {
    await closeApp(app, userData)
  }
})

test('persists tasks and theme across restarts', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'misk-e2e-persist-'))
  let launched = await launchApp({ userData })
  try {
    await launched.page.getByRole('button', { name: 'New Task' }).click()
    await launched.page.getByPlaceholder('What needs doing?').fill('Persisted task')
    await launched.page.getByRole('button', { name: 'Add' }).click()
    await expect(launched.page.locator('.task-card')).toContainText('Persisted task')

    await launched.page.locator('.activity-item[aria-label="Settings"]').click()
    await launched.page.locator('#settings-theme').selectOption('dark')
    await expect
      .poll(() => launched.page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('dark')
    await launched.page.waitForTimeout(500)
  } finally {
    await launched.app.close()
  }

  launched = await launchApp({ userData })
  try {
    await expect
      .poll(() => launched.page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('dark')
    const boardTab = launched.page.locator('.tab', { hasText: 'Task Board' }).first()
    if (await boardTab.count()) {
      await boardTab.click()
    } else {
      await launched.page.getByRole('button', { name: 'New Task' }).click()
    }
    await expect(launched.page.locator('.task-card')).toContainText('Persisted task')
  } finally {
    await closeApp(launched.app, userData)
  }
})

test('opens a view from a deep link', async () => {
  const { app, page, userData } = await launchApp()
  try {
    await app.evaluate(({ app: electronApp }) => {
      electronApp.emit('open-url', { preventDefault() {} }, 'misk://view/tasks.board')
    })
    await expect(page.locator('.tab', { hasText: 'Task Board' })).toBeVisible()
  } finally {
    await closeApp(app, userData)
  }
})

test('opens a workspace and previews a file', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'misk-e2e-workspace-'))
  await mkdir(workspace, { recursive: true })
  await writeFile(join(workspace, 'hello.md'), '# Hello\n\nWorkspace preview.\n')
  const { app, page, userData } = await launchApp({ workspace })
  try {
    await page.locator('.home-actions button', { hasText: 'Open Folder' }).click()
    await expect(page.locator('.tree-row', { hasText: 'hello.md' })).toBeVisible()
    await page.locator('.tree-row', { hasText: 'hello.md' }).click()
    await expect(page.locator('.preview-text')).toContainText('# Hello')
  } finally {
    await closeApp(app, userData)
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined)
  }
})
