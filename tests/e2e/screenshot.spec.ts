import { test } from '@playwright/test'
import { closeApp, launchApp } from './launch'

test('captures the README screenshots', async () => {
  const { app, page, userData } = await launchApp()
  try {
    await page.evaluate(() => window.misk.settings.patch({ appearance: { theme: 'dark' } }))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'docs/screenshot.png' })

    await page.getByRole('button', { name: 'New Task' }).click()
    const composer = page.getByPlaceholder('What needs doing?')
    await composer.fill('Design the scaffold')
    await page.getByRole('button', { name: 'Add' }).click()
    await composer.fill('Write the documentation')
    await page.getByRole('button', { name: 'Add' }).click()
    await composer.fill('Ship v2')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'docs/screenshot-tasks.png' })
  } finally {
    await closeApp(app, userData)
  }
})
