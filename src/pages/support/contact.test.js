import { createElement } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContactUs } from './ContactUs'
import { getContactDetails } from '../../action/action'
import { expect, it, vi } from 'vitest'
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

vi.mock('../../action/action', () => ({ getContactDetails: vi.fn() }))

it('shows a contact shimmer without remounting the message draft', async () => {
  let resolveContact
  getContactDetails.mockReturnValueOnce(new Promise((resolve) => { resolveContact = resolve }))
  render(createElement(MemoryRouter, null, createElement(ContactUs)))
  const message = screen.getByLabelText('Message')
  fireEvent.change(message, { target: { value: 'Keep my message' } })
  const skeleton = screen.getByRole('status', { name: 'Loading contact details…' })
  expect(skeleton).toHaveClass('loading-skeleton-rows')
  await act(async () => resolveContact({ data: { contactHTML: 'Contact support@example.com' } }))
  expect(skeleton).not.toBeInTheDocument()
  expect(screen.getByLabelText('Message')).toBe(message)
  expect(message).toHaveValue('Keep my message')
})
