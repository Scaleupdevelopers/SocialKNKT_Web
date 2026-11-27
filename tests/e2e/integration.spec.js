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
    .poll(() =>
      calls.some((c) => c.path === 'user/profile/connections' && c.query.filter === '1'),
    )
    .toBeTruthy()
  await page.getByRole('button', { name: 'Add Professional' }).click()
  await expect(page.getByRole('button', { name: 'Request sent' })).toBeDisabled()
  expect(
    calls.find((c) => c.path === 'user/connection-request' && c.method === 'POST').body,
  ).toEqual({ connectUserId: other, connectionType: 'professional' })
  await expect(page.getByLabel('Messages', { exact: true })).toBeInViewport()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy()
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
  await expect(
    page.getByRole('complementary', { name: 'Connection requests' }),
  ).not.toBeVisible()
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

const notificationCommentId = '666666666666666666666666'
async function mockCommentNotifications(page) {
  await page.route('**/user/notifications?*', (route) =>
    route.fulfill({
      json: {
        status: true,
        data: [
          {
            _id: 'comment-notice',
            type: 'comment-like',
            entityId: notificationCommentId,
            user1: { fname: 'Sample', lname: 'Member' },
          },
          {
            _id: 'thread-notice',
            type: 'thread-like',
            entityId: '777777777777777777777777',
            user1: { fname: 'Thread', lname: 'Member' },
          },
        ],
      },
    }),
  )
  await page.goto('/connections')
  await page.getByLabel('Notifications', { exact: true }).click()
}

test('comment notification resolves parent post and labels thread accurately', async ({
  page,
}, info) => {
  await mockApi(page)
  let release
  let lookups = 0
  const pending = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/user/post/comment/' + notificationCommentId, async (route) => {
    lookups++
    expect(route.request().method()).toBe('GET')
    await pending
    await route.fulfill({
      json: { status: true, data: { id: notificationCommentId, postId, isBlocked: false } },
    })
  })
  await mockCommentNotifications(page)
  await expect(
    page.getByRole('button', { name: 'Thread Member liked your thread.' }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('notification-labels-after.png'),
    fullPage: true,
  })
  const row = page.getByRole('button', { name: 'Sample Member liked your comment.' })
  await row.click()
  await expect(row).toBeDisabled()
  await expect(page.getByRole('status', { name: 'Opening notification…' })).toHaveClass(
    /loading-skeleton/,
  )
  await page.screenshot({
    path: info.outputPath('notification-lookup-shimmer-after.png'),
    fullPage: true,
  })
  release()
  await expect(page).toHaveURL(new RegExp('postId=' + postId))
  await expect(page.getByText('Shared post detail', { exact: true })).toBeVisible()
  expect(lookups).toBe(1)
  await page.screenshot({
    path: info.outputPath('notification-parent-post-after.png'),
    fullPage: true,
  })
})

test('comment notification retries an HTTP lookup failure', async ({ page }, info) => {
  await mockApi(page)
  let attempts = 0
  await page.route('**/user/post/comment/' + notificationCommentId, (route) => {
    attempts++
    return route.fulfill(
      attempts === 1
        ? { status: 503, json: { status: false, message: 'Synthetic internal failure' } }
        : { json: { status: true, data: { postId } } },
    )
  })
  await mockCommentNotifications(page)
  const row = page.getByRole('button', { name: /Sample Member liked your comment/ })
  await row.click()
  await expect(page.getByRole('alert')).toHaveText(
    'Unable to open notification. Select it to retry.',
  )
  await expect(page).toHaveURL(/\/connections$/)
  await expect(row).toBeEnabled()
  await page.screenshot({
    path: info.outputPath('notification-retry-after.png'),
    fullPage: true,
  })
  await row.click()
  await expect(page.getByText('Shared post detail', { exact: true })).toBeVisible()
  expect(attempts).toBe(2)
})

test('comment notification keeps deleted content unavailable without navigating', async ({
  page,
}, info) => {
  await mockApi(page)
  await page.route('**/user/post/comment/' + notificationCommentId, (route) =>
    route.fulfill({ json: { status: true } }),
  )
  await mockCommentNotifications(page)
  const row = page.getByRole('button', { name: /Sample Member liked your comment/ })
  await row.click()
  await expect(row).toContainText('Content is no longer available.')
  await expect(row).toBeDisabled()
  await expect(page).toHaveURL(/\/connections$/)
  await page.screenshot({
    path: info.outputPath('notification-unavailable-after.png'),
    fullPage: true,
  })
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
test('contact form offers email composition with existing contact details', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/contact-us')
  await expect(page.getByText('Opens your email app.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open email app' })).toBeEnabled()
})

test('profile report keeps a failed draft and retries through the user-report endpoint', async ({
  page,
}, info) => {
  const { calls } = await mockApi(page)
  let attempts = 0
  await page.route('**/user/chat/report', async (route) => {
    attempts++
    if (attempts === 1) {
      await route.fulfill({ status: 500, json: { status: false } })
    } else {
      await route.fallback()
    }
  })
  await page.goto(`/profile?userId=${other}`)
  await page.getByRole('button', { name: 'More profile actions' }).click()
  await page.getByRole('button', { name: 'Report', exact: true }).click()
  await page.getByLabel('Report description').fill('Synthetic report for browser verification')
  await page.getByRole('dialog').getByRole('button', { name: 'Report', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Unable to report' })).toBeVisible()
  await expect(page.getByLabel('Report description')).toHaveValue(
    'Synthetic report for browser verification',
  )
  await page.screenshot({ path: info.outputPath('report-retry-after.png'), fullPage: true })
  await page.getByRole('dialog').getByRole('button', { name: 'Report', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(calls.find((call) => call.path === 'user/chat/report').body).toEqual({
    userId: other,
    description: 'Synthetic report for browser verification',
  })
})

test('pronunciation editor saves and clears using the mobile contract', async ({
  page,
}, info) => {
  const { calls } = await mockApi(page)
  await page.goto('/edit-profile')
  await page.getByRole('button', { name: 'Name Pronunciation', exact: true }).click()
  await page.getByLabel('Phonetic spelling', { exact: true }).fill('Test')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  await page.getByLabel('Phonetic spelling', { exact: true }).clear()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect
    .poll(() => calls.filter((call) => call.path === 'user/complete-profile').length)
    .toBe(2)
  expect(calls.filter((call) => call.path === 'user/complete-profile').at(-1).body).toEqual({
    phonetic_spelling: '',
    record_name: '',
  })
  await page.screenshot({
    path: info.outputPath('pronunciation-editor-after.png'),
    fullPage: true,
  })
})

test('onboarding media saves profile photo and banner without publishing feed content', async ({
  page,
}, info) => {
  const { calls } = await mockApi(page)
  let uploads = 0
  await page.route('**/upload/sign?*', (route) =>
    route.fulfill({
      json: {
        status: true,
        data: 'http://127.0.0.1:5175/synthetic-upload/image.png?signature=test',
      },
    }),
  )
  await page.route('**/synthetic-upload/**', (route) => {
    if (route.request().method() === 'PUT') uploads++
    return route.fulfill({ status: 200, body: '' })
  })
  await page.goto('/add-media')
  const file = {
    name: 'profile.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  }
  await page.getByLabel('Profile Picture', { exact: true }).setInputFiles(file)
  await page
    .getByLabel('Banner', { exact: true })
    .setInputFiles({ ...file, name: 'banner.png' })
  await expect(page.getByLabel('Content photos')).toBeDisabled()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy()
  await page.screenshot({ path: info.outputPath('onboarding-media-after.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  expect(uploads).toBe(2)
  expect(
    calls.find((call) => call.path === 'user/profile' && call.method === 'PUT').body,
  ).toMatchObject({
    image: 'http://127.0.0.1:5175/synthetic-upload/image.png',
    bio: 'Original bio',
  })
  expect(calls.find((call) => call.path === 'user/update-banner-image').body).toEqual({
    banner_image: 'http://127.0.0.1:5175/synthetic-upload/image.png',
  })
  expect(calls.some((call) => call.path === 'user/post' && call.method === 'POST')).toBe(false)
})
