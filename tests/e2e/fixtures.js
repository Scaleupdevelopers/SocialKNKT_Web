export const me = '111111111111111111111111'
export const other = '222222222222222222222222'
export const relationId = '333333333333333333333333'
export const postId = '444444444444444444444444'
export async function mockApi(page) {
  const calls = []
  let profile = {
    id: me,
    fname: 'Test',
    lname: 'Member',
    username: 'test_member',
    email: 'test@example.com',
    gender: 'Male',
    bio: 'Original bio',
    website: 'https://example.com',
    workExperiences: [],
    educations: [],
    places: [],
    headshot: [],
    certificates_or_licences: [],
  }
  let requests = [
    { _id: relationId, userId: other, fname: 'Sample', lname: 'Member', username: 'sample' },
  ]
  const connection = {
    userId: other,
    connectionId: relationId,
    fname: 'Sample',
    lname: 'Member',
    username: 'sample',
    jobTitle: 'Product Designer',
    totalNoOfConnections: 24,
    cityName: 'Indore',
    countryName: 'India',
    personalConnection: true,
  }
  await page.addInitScript(
    ({ me }) =>
      localStorage.setItem(
        'socialknkt_auth',
        JSON.stringify({ token: 'synthetic-test-token', user: { id: me } }),
      ),
    { me },
  )
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace('/api/v1/', ''),
      method = req.method()
    const body = req.postDataJSON()
    calls.push({ path, method, body, query: Object.fromEntries(url.searchParams) })
    let data = []
    if (path === 'user/profile/get-my-profile') data = profile
    else if (
      (path === 'user/profile' && method === 'PUT') ||
      (path === 'user/complete-profile' && method === 'POST')
    ) {
      profile = { ...profile, ...body }
      data = profile
    } else if (path === 'user/profile/get-other-user-profile')
      data = {
        id: other,
        fname: 'Sample',
        lname: 'Member',
        personalConnection: relationId,
        connectionId: relationId,
      }
    else if (path === 'user/topics' || path === 'user/popular/topics')
      data = [{ id: '555555555555555555555555', topic: 'Technology' }]
    else if (path === 'user/profile/connections') data = [connection]
    else if (path === 'user/connection-request' && method === 'GET') data = requests
    else if (path === 'user/connection-request' && method === 'PUT') {
      requests = []
      data = {}
    } else if (path.endsWith('/count')) data = 1
    else if (path === 'user/notifications')
      data = [
        {
          _id: 'notification',
          type: 'like',
          entityId: postId,
          user1: { fname: 'Sample', lname: 'Member' },
          connectionExists: true,
        },
      ]
    else if (path === 'user/search')
      data = [{ _id: other, fname: 'Search', lname: 'Result', username: 'result' }]
    else if (path === 'user/post/' + postId)
      data = {
        _id: postId,
        userId: other,
        fname: 'Sample',
        description: 'Shared post detail',
        mediaType: 'text',
        createdAt: Date.now(),
      }
    else if (path === 'user/chat/room')
      data = [
        {
          id: 'room',
          user: { id: other, fname: 'Sample', lname: 'Member', username: 'sample' },
          lastMessage: 'Hello',
        },
      ]
    else if (path === 'user/chat/messages')
      data = [
        {
          id: 'message',
          roomId: 'room',
          userId: other,
          message: 'Hello from history',
          createdAt: Date.now(),
        },
      ]
    else if (path === 'user/profile/admin')
      data = {
        contactHTML:
          '<p>Email <a href="mailto:support@example.com">support@example.com</a></p>',
      }
    await route.fulfill({ json: { status: true, data } })
  })
  return { calls }
}
