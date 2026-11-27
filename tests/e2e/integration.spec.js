import { test, expect } from '@playwright/test'
import { mockApi, other, relationId, postId } from './fixtures'
test('connections persist requests, filter correctly and stay responsive', async ({
  page,
}, info) => {
  const { calls } = await mockApi(page)
  await page.goto('/connections')
  await expect(page.getByText('Sample Member', { exact: true })).toBeVisible()
  await page.getByLabel('Filter connections').click()
  await page.getByRole('button', { name: 'Professional', exact: true }).click()
  await expect
    .poll(() => calls.some((c) => c.path === 'user/profile/connections' && c.query.filter === '1'))
    .toBeTruthy()
  await page.getByRole('button', { name: 'Add Professional' }).click()
  await expect(page.getByRole('button', { name: 'Request sent' })).toBeDisabled()
  expect(
    calls.find((c) => c.path === 'user/connection-request' && c.method === 'POST').body,
  ).toEqual({ connectUserId: other, connectionType: 'professional' })
  await expect(page.getByLabel('Messages', { exact: true })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: info.outputPath('connections-after.png'), fullPage: true })
})
test('connection requests accept and reset the panel', async ({ page }) => {
  const { calls } = await mockApi(page)
  await page.goto('/connections')
  await page.getByLabel('Connections', { exact: true }).click()
  await page.getByRole('button', { name: 'Accept', exact: true }).click()
  await page.getByRole('button', { name: 'Both', exact: true }).click()
  await expect(page.getByText('No pending requests.')).toBeVisible()
  expect(
    calls.find((c) => c.path === 'user/connection-request' && c.method === 'PUT').body,
  ).toEqual({ connectionId: relationId, status: 3 })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary', { name: 'Connection requests' })).not.toBeVisible()
})
test('edit profile loads real values, saves and preserves unrelated data', async ({
  page,
}, info) => {
  const { calls } = await mockApi(page)
  await page.goto('/edit-profile')
  await expect(page.getByLabel('First Name', { exact: true })).toHaveValue('Test')
  await page.getByLabel('First Name', { exact: true }).fill('Updated')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  const payload = calls.find((c) => c.path === 'user/profile' && c.method === 'PUT').body
  expect(payload).toMatchObject({
    fname: 'Updated',
    bio: 'Original bio',
    website: 'https://example.com',
  })
  await page.reload()
  await expect(page.getByLabel('First Name', { exact: true })).toHaveValue('Updated')
  await page.screenshot({ path: info.outputPath('profile-after.png'), fullPage: true })
})
test('search is reachable and editable through real route', async ({ page }, info) => {
  await mockApi(page)
  await page.goto('/connections')
  await page.getByLabel('Search', { exact: true }).click()
  await page.getByLabel('Search people, posts and threads').fill('Sample')
  await page.getByRole('search').getByRole('button').click()
  await page.getByRole('button', { name: 'People', exact: true }).last().click()
  await expect(page.getByRole('link', { name: 'Search Result', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('search-after.png'), fullPage: true })
})
test('notifications open a real post detail link', async ({ page }) => {
  await mockApi(page)
  await page.goto('/connections')
  await page.getByLabel('Notifications', { exact: true }).click()
  await page.getByRole('button', { name: /Sample Member liked/ }).click()
  await expect(page).toHaveURL(new RegExp('postId=' + postId))
  await expect(page.getByText('Shared post detail', { exact: true })).toBeVisible()
})
test('chat history and offline recovery render', async ({ page }, info) => {
  await mockApi(page)
  await page.goto('/chat')
  await page.getByRole('button', { name: /Sample Member/ }).click()
  await expect(page.getByText('Hello from history')).toBeVisible()
  await expect(page.getByLabel('Send message', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('chat-after.png'), fullPage: true })
})
test('contact form offers email composition with existing contact details', async ({ page }) => {
  await mockApi(page)
  await page.goto('/contact-us')
  await expect(page.getByText('Opens your email app.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open email app' })).toBeEnabled()
})
