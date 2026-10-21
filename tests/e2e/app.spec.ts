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

test('switches settings sections after opening a specific section', async () => {
  const { app, page, userData } = await launchApp()
  try {
    await page.keyboard.press('Control+Shift+P')
    await page.locator('.palette-input').fill('about')
    await page
      .locator('.palette-item', {
        has: page.locator('.palette-item-title', { hasText: /^About$/ })
      })
      .first()
      .click()
    await expect(page.locator('.settings-view')).toBeVisible()
    await expect(page.locator('.settings-nav-item.active')).toHaveText('About')

    await page.locator('.settings-nav-item', { hasText: 'Appearance' }).click()
    await expect(page.locator('.settings-nav-item.active')).toHaveText('Appearance')
  } finally {
    await closeApp(app, userData)
  }
})

test('applies concurrent settings patches without losing either change', async () => {
  const { app, page, userData } = await launchApp()
  try {
    const result = await page.evaluate(async () => {
      const settled = await Promise.allSettled([
        window.misk.settings.patch({ appearance: { theme: 'dark' } }),
        window.misk.settings.patch({ appearance: { accent: 'cyan' } })
      ])
      const settings = await window.misk.settings.get()
      return {
        statuses: settled.map((entry) => entry.status),
        theme: settings.appearance.theme,
        accent: settings.appearance.accent
      }
    })
    expect(result.statuses).toEqual(['fulfilled', 'fulfilled'])
    expect(result.theme).toBe('dark')
    expect(result.accent).toBe('cyan')
  } finally {
    await closeApp(app, userData)
  }
})

test('opens a view from a cold-start deep link', async () => {
  const { app, page, userData } = await launchApp({ argv: ['misk://view/tasks.board'] })
  try {
    await expect(page.locator('.tab', { hasText: 'Task Board' })).toBeVisible()
  } finally {
    await closeApp(app, userData)
  }
})

test('persists the sidebar width after dragging', async () => {
  const { app, page, userData } = await launchApp()
  try {
    const initial = await page.evaluate(async () => {
      const settings = await window.misk.settings.get()
      return settings.layout.sidebarWidth
    })
    const box = await page.locator('.sidebar-resize').boundingBox()
    expect(box).not.toBeNull()
    if (!box) {
      return
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const settings = await window.misk.settings.get()
          return settings.layout.sidebarWidth
        })
      )
      .toBeGreaterThan(initial)
  } finally {
    await closeApp(app, userData)
  }
})

test('does not run shortcuts while recording a keybinding', async () => {
  const { app, page, userData } = await launchApp()
  try {
    await page.locator('.activity-item[aria-label="Settings"]').click()
    await page.locator('.settings-nav-item', { hasText: 'Keyboard shortcuts' }).click()
    await expect(page.locator('.keybinding-list')).toBeVisible()

    await page.locator('.keybinding-button').first().click()
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+P')

    await expect(page.locator('.palette')).toHaveCount(0)
    await expect
      .poll(async () =>
        page.evaluate(
          async () => Object.keys((await window.misk.settings.get()).keybindings).length
        )
      )
      .toBeGreaterThan(0)
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
