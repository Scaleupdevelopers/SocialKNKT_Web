import { test, expect } from '@playwright/test'
import { mockApi, me, other, postId } from './fixtures'

async function deferredPage(page, endpoint, rows) {
  const pending = []
  await page.route(`**/${endpoint}?*`, async (route) => {
    const number = Number(new URL(route.request().url()).searchParams.get('page'))
    if (number > 0) pending.push(route)
    else
      await route.fulfill({
        json: { status: true, data: rows, totalCount: rows.length + 1 },
      })
  })
  return async (data = []) => {
    await expect.poll(() => pending.length).toBeGreaterThan(0)
    await Promise.all(
      pending.splice(0).map((route) =>
        route.fulfill({
          json: { status: true, data, totalCount: rows.length + data.length },
        }),
      ),
    )
  }
}

async function visibleShimmer(loading) {
  await loading.scrollIntoViewIfNeeded()
  await expect(loading).toBeVisible()
  const bounds = await loading.boundingBox()
  expect(bounds.width).toBeGreaterThan(0)
  expect(bounds.height).toBeGreaterThan(0)
  await test.info().attach('shimmer-bounds', {
    body: JSON.stringify({ url: loading.page().url(), bounds }),
    contentType: 'application/json',
  })
  await expect(loading).toBeInViewport()
}

const rows = (make, count = 10) => Array.from({ length: count }, (_, index) => make(index))
const post = (index) => ({
  _id: `post-${index}`,
  userId: other,
  fname: 'Synthetic',
  description: `Post ${index}`,
  mediaType: 'text',
  createdAt: 1700000000000,
})

test('Add Media initial shimmer stays compact and clears after profile resolves', async ({
  page,
}, info) => {
  await mockApi(page)
  const pending = []
  await page.route('**/user/profile/get-my-profile', (route) => pending.push(route))
  await page.goto('/add-media')
  const loading = page.getByRole('status', { name: 'Loading profile…' })
  await visibleShimmer(loading)
  const tile = await loading.locator('.loading-skeleton-item').boundingBox()
  expect(tile.width).toBeLessThanOrEqual(240)
  expect(tile.height).toBeLessThanOrEqual(340)
  await page.screenshot({
    path: info.outputPath('add-media-initial-shimmer-after.png'),
    fullPage: true,
  })
  await expect.poll(() => pending.length).toBeGreaterThan(0)
  await Promise.all(
    pending.splice(0).map((route) =>
      route.fulfill({
        json: { status: true, data: { id: me, fname: 'Synthetic', lname: 'Member' } },
      }),
    ),
  )
  await expect(loading).toBeHidden()
  await expect(page.getByLabel('Profile Picture', { exact: true })).toBeAttached()
})

test('profile posts and media retain loaded entries during pagination', async ({ page }) => {
  await mockApi(page)
  const finishPosts = await deferredPage(page, 'user/post/get-my-all-post', rows(post))
  await page.goto('/profile')
  await expect(page.getByText('Post 0', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Load more posts', exact: true })
    .scrollIntoViewIfNeeded()
  await visibleShimmer(page.getByRole('status', { name: 'Loading posts…' }))
  await expect(page.getByText('Post 0', { exact: true })).toBeAttached()
  await finishPosts([post(10)])
  await expect(page.getByText('Post 10', { exact: true })).toBeAttached()
  const finishMedia = await deferredPage(
    page,
    'user/post/get-all-my-feed',
    rows((index) => ({
      _id: `media-${index}`,
      mediaType: 'image',
      media: '/assets/logo_icons/profile_alt.avif',
    })),
  )
  await page.getByRole('button', { name: 'Media', exact: true }).click()
  await page.getByRole('button', { name: 'Load more feed media', exact: true }).click()
  const loading = page.getByRole('status', { name: 'Loading feed media…' })
  await visibleShimmer(loading)
  await expect(page.getByAltText('Feed media 1', { exact: true })).toBeAttached()
  await finishMedia()
  await expect(loading).toBeHidden()
})

test('flicks and saved flicks keep their cards while the next page loads', async ({ page }) => {
  await mockApi(page)
  for (const saved of [false, true]) {
    const endpoint = saved ? 'user/post/get-saved-posts' : 'user/flick'
    const finish = await deferredPage(
      page,
      endpoint,
      rows((index) => ({
        ...post(index),
        mediaType: 'flicks',
        media: '/synthetic-video.mp4',
      })),
    )
    await page.goto(`/flicks?saved=${saved}`)
    await expect(page.getByText('Post 0', { exact: true })).toBeAttached()
    await page.getByRole('button', { name: 'Load more flicks' }).scrollIntoViewIfNeeded()
    const loading = page.getByRole('status', { name: 'Loading more flicks…' })
    await visibleShimmer(loading)
    await expect(page.getByText('Post 0', { exact: true })).toBeAttached()
    await expect
      .poll(async () => (await page.locator('.site-header').boundingBox()).y)
      .toBeGreaterThanOrEqual(0)
    const feedBounds = await page.locator('.flicks-feed').boundingBox()
    expect(feedBounds.height).toBeGreaterThan(page.viewportSize().height / 2)
    expect(feedBounds.y + feedBounds.height).toBeLessThanOrEqual(page.viewportSize().height + 1)
    if (saved) await expect(page.getByRole('link', { name: 'All Flicks' })).toBeInViewport()
    await page.screenshot({
      path: test.info().outputPath(`flicks-${saved}-pagination-after.png`),
    })
    await finish()
    await expect(loading).toBeHidden()
  }
})

test('search keeps existing results during the next page', async ({ page }) => {
  await mockApi(page)
  const finish = await deferredPage(
    page,
    'user/search',
    rows((index) => ({
      _id: `person-${index}`,
      fname: 'Person',
      lname: String(index),
    })),
  )
  await page.goto('/search?q=Person&type=people')
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  const loading = page.getByRole('status', { name: 'Loading results…' })
  await visibleShimmer(loading)
  await expect(page.getByRole('link', { name: 'Person 0', exact: true })).toBeAttached()
  await finish([{ _id: 'last-person', fname: 'Last', lname: 'Person' }])
  await expect(loading).toBeHidden()
  await expect(page.getByRole('link', { name: 'Last Person', exact: true })).toBeVisible()
})

test('chat retains history while older messages load', async ({ page }) => {
  await mockApi(page)
  const finish = await deferredPage(
    page,
    'user/chat/messages',
    rows(
      (index) => ({
        id: `message-${index}`,
        roomId: 'room',
        userId: other,
        message: `History ${index}`,
        createdAt: 1700000000000 + index,
      }),
      20,
    ),
  )
  await page.goto('/chat')
  await page.getByRole('button', { name: /Sample Member/ }).click()
  await page.getByRole('button', { name: 'Load older messages' }).click()
  const loading = page.getByRole('status', { name: 'Loading messages…' })
  await visibleShimmer(loading)
  await expect(page.getByText('History 0', { exact: true })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Load older messages' })).toBeDisabled()
  await finish([
    { id: 'oldest', userId: other, message: 'Oldest message', createdAt: 1600000000000 },
  ])
  await expect(loading).toBeHidden()
  await expect(page.getByText('Oldest message')).toBeAttached()
})

test('comments and replies retain loaded rows during pagination', async ({ page }) => {
  await mockApi(page)
  const comment = (index) => ({
    id: `comment-${index}`,
    userId: other,
    username: 'Member',
    comment: `Comment ${index}`,
    commentReplies: 11,
  })
  const finishComments = await deferredPage(page, 'user/post/comment', rows(comment))
  const finishReplies = await deferredPage(
    page,
    'user/post/comment/reply',
    rows((index) => ({
      ...comment(index),
      id: `reply-${index}`,
      comment: `Reply ${index}`,
    })),
  )
  await page.goto(`/home?postId=${postId}`)
  await page.getByRole('button', { name: /\d+ Comments/ }).click()
  await page.getByRole('button', { name: 'Load more comments' }).scrollIntoViewIfNeeded()
  const loading = page.getByRole('status', { name: 'Loading more comments...' })
  await visibleShimmer(loading)
  await expect(page.getByText('Comment 0', { exact: true })).toBeAttached()
  await finishComments()
  await expect(loading).toBeHidden()
  await page.getByRole('button', { name: 'View 11 Replies' }).first().click()
  await page.getByRole('button', { name: 'Load more replies' }).click()
  const replyLoading = page.getByRole('status', { name: 'Loading replies…' })
  await visibleShimmer(replyLoading)
  await expect(page.getByText('Reply 0', { exact: true })).toBeAttached()
  await finishReplies()
  await expect(replyLoading).toBeHidden()
})

test('notification and request panels retain their rows while loading more', async ({
  page,
}) => {
  await mockApi(page)
  for (const kind of ['notifications', 'requests']) {
    const notifications = kind === 'notifications'
    const endpoint = notifications ? 'user/notifications' : 'user/connection-request'
    const finish = await deferredPage(
      page,
      endpoint,
      rows((index) => ({
        _id: `row-${index}`,
        userId: other,
        fname: `Panel ${index}`,
        type: 'like',
        entityId: postId,
        user1: { fname: `Panel ${index}` },
      })),
    )
    await page.goto('/connections')
    await page
      .getByLabel(notifications ? 'Notifications' : 'Connections', { exact: true })
      .click()
    const panel = page.getByRole('complementary', {
      name: notifications ? 'Notifications' : 'Connection requests',
    })
    await panel.getByRole('button', { name: 'Load more', exact: true }).click()
    const loading = panel.getByRole('status', { name: `Loading more ${kind}…` })
    await visibleShimmer(loading)
    await expect(panel.getByText(/Panel 0 /)).toBeAttached()
    await finish()
    await expect(loading).toBeHidden()
  }
})

test('KNKT keeps threads while its scroll pagination is pending', async ({ page }) => {
  await mockApi(page)
  const finish = await deferredPage(
    page,
    'user/threads',
    rows((index) => ({
      _id: `thread-${index}`,
      userId: other,
      fname: 'Member',
      type: 1,
      question: `Synthetic question ${index}`,
      description: 'Thread body',
      createdAt: 1700000000000,
    })),
  )
  await page.goto('/knkt')
  await expect(page.getByText('Synthetic question 0', { exact: true })).toBeAttached()
  await page.getByText('Synthetic question 9', { exact: true }).scrollIntoViewIfNeeded()
  const loading = page.getByLabel('Loading more threads', { exact: true })
  await visibleShimmer(loading)
  await expect(page.getByText('Synthetic question 0', { exact: true })).toBeAttached()
  await finish(
    [0, 10].map((index) => ({
      _id: `thread-${index}`,
      userId: other,
      fname: 'Member',
      type: 1,
      question: `Synthetic question ${index}`,
      createdAt: 1700000000000,
    })),
  )
  await expect(loading).toBeHidden()
  await expect(page.getByText('Synthetic question 0', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Synthetic question 10', { exact: true })).toHaveCount(1)
})

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
  await page.screenshot({
    path: info.outputPath('shimmer-initial-after.png'),
    fullPage: true,
  })
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
  await visibleShimmer(loading)
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
