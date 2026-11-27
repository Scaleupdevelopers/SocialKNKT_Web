import { expect, it } from 'vitest'
import { contactDetails, contactMailto } from './contact'
it('extracts support text and email without rendering remote HTML', () => {
  expect(
    contactDetails(
      '<script>bad()</script><p>Email <a href="mailto:support@example.com">Support</a></p>',
    ),
  ).toEqual({ text: 'Email Support', email: 'support@example.com' })
  expect(contactDetails('<img onerror="bad()" src="x">Hello')).toEqual({ text: 'Hello', email: '' })
})
it('encodes message and reply address in an email draft', () => {
  const url = contactMailto('support@example.com', 'Test & Co', 'test@example.com', 'Help? &next=1')
  expect(url).toContain('mailto:support%40example.com?subject=')
  expect(new URL(url).searchParams.get('body')).toBe(
    'Name: Test & Co\nEmail: test@example.com\n\nHelp? &next=1',
  )
})
