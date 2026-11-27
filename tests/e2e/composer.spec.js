import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures'

test('question composer submits topic IDs and refreshes KNKT after success', async ({
  page,
}, info) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:5175)/, (route) => route.abort())
  const { calls } = await mockApi(page)
  await page.route('**/api/v1/user/threads/locations?*', (route) =>
    route.fulfill({
      json: { data: [{ _id: 'location-1', city: 'Mumbai', country: 'India' }] },
    }),
  )
  const runtimeErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (/^Failed to load resource:/.test(message.text())) return
    consoleErrors.push(message.text())
  })
  await page.goto('/knkt')
  await expect
    .poll(() => calls.filter((call) => call.path === 'user/threads').length)
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'New Post', exact: true }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: 'Create KNKT(n) Thread' }).click()
  const dialog = page.getByRole('dialog', { name: 'Ask or Share on KNKT(n)' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Question', { exact: true }).fill('How do we test this?')
  await dialog.getByLabel('Location', { exact: true }).fill('Mum')
  await dialog.getByRole('option', { name: 'Mumbai, India' }).click()
  await expect(dialog.getByLabel('Location', { exact: true })).toHaveValue('Mumbai, India')
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Categories' }).click()
  await dialog.getByRole('checkbox', { name: 'Technology' }).check()
  await expect(dialog.getByRole('button', { name: 'Remove Technology' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Remove Technology' }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('checkbox', { name: 'Technology' })).not.toBeChecked()
  await dialog.getByRole('checkbox', { name: 'Technology' }).check()
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  const bounds = await dialog.boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width)
  await page.screenshot({
    path: info.outputPath('question-composer-filled.png'),
    fullPage: true,
  })
  const readsBeforePost = calls.filter((call) => call.path === 'user/threads').length
  await dialog.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(
    calls.find((call) => call.path === 'user/thread' && call.method === 'POST').body,
  ).toEqual({
    type: 1,
    question: 'How do we test this?',
    location: 'Mumbai, India',
    topic: ['555555555555555555555555'],
  })
  await expect
    .poll(() => calls.filter((call) => call.path === 'user/threads').length)
    .toBe(readsBeforePost + 1)
  expect(runtimeErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
