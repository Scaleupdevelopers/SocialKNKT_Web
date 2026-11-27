import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures'

test('shimmer replaces initial and pagination text without removing loaded connections', async ({
  page,
}, info) => {
  await mockApi(page)
  const pending = []
  await page.route('**/user/profile/connections?*', (route) => {
    pending.push(route)
  })
  await page.goto('/connections')
  const loading = page.getByRole('status', { name: 'Loading connections…' })
  await expect(loading).toBeVisible()
  await expect.poll(() => pending.length).toBeGreaterThan(0)
  const placeholder = loading.locator('.loading-skeleton-item').first()
  await expect
    .poll(() => placeholder.evaluate((node) => getComputedStyle(node, '::after').animationName))
    .toBe('app-loading-shimmer')
  expect(
    await loading
      .locator('.loading-skeleton-label')
      .evaluate((node) => getComputedStyle(node).clipPath),
  ).toBe('inset(50%)')
  await page.screenshot({ path: info.outputPath('shimmer-initial-after.png'), fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() => placeholder.evaluate((node) => getComputedStyle(node, '::after').animationName))
    .toBe('none')
  await Promise.all(
    pending.splice(0).map((route) =>
      route.fulfill({
        json: {
          status: true,
          data: Array.from({ length: 10 }, (_, index) => ({
            userId: `synthetic-${index}`,
            fname: 'Member',
            lname: String(index),
            personalConnection: true,
          })),
        },
      }),
    ),
  )
  await expect(page.getByText('Member 0', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load more', exact: true }).scrollIntoViewIfNeeded()
  await expect.poll(() => pending.length).toBeGreaterThan(0)
  await expect(loading).toBeVisible()
  await expect(page.getByText('Member 0', { exact: true })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: info.outputPath('shimmer-pagination-after.png'),
    fullPage: true,
  })
  await pending.shift().fulfill({ json: { status: true, data: [] } })
  await expect(loading).toBeHidden()
  await expect(page.getByText('Member 0', { exact: true })).toBeAttached()
})
