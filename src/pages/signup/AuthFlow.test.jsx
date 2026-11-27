import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SignUp } from './SignUp'
import { VerifyAccount } from '../verification/VerifyAccount'
import { VerifyCode } from '../verification/VerifyCode'
import { ForgotPassword } from '../password/ForgotPassword'
import ResetPassword from '../password/ResetPassword'
import { SignIn } from '../signin/SignIn'
import { consumeSignup, rememberSignup } from '../../utils/helper'
import { toast } from 'react-toastify'
import {
  signUp,
  checkUser,
  verifyOtp,
  sendForgotPasswordOtp,
  changePassword,
  login,
  ssoCheck,
} from '../../action/action'
import { getAdditionalUserInfo, signInWithPopup } from 'firebase/auth'

vi.mock('../../action/action', () => ({
  signUp: vi.fn(),
  checkUser: vi.fn(),
  verifyOtp: vi.fn(),
  resendOtp: vi.fn(),
  sendForgotPasswordOtp: vi.fn(),
  changePassword: vi.fn(),
  login: vi.fn(),
  ssoCheck: vi.fn(),
}))
vi.mock('../../config/firebase', () => ({
  firebaseAuth: {},
  googleProvider: {},
  appleProvider: {},
}))
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn(), getAdditionalUserInfo: vi.fn() }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const user = {
  id: 'test-user',
  email: 'test@example.com',
  username: 'test',
  token: 'pending-test-token',
  isEmailVerified: false,
}
function Destination() {
  const { state } = useLocation()
  return <p>Destination {state?.email}</p>
}
function flow(entry = '/sign-up') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/verify-account" element={<VerifyAccount />} />
        <Route path="/account-created" element={<p>Account ready</p>} />
        <Route path="/signin" element={<p>Sign in recovery</p>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password-success" element={<p>Password updated</p>} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/home" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
}
function enterCode(prefix) {
  for (let i = 1; i <= 6; i++)
    fireEvent.change(screen.getByLabelText(`${prefix} ${i}`), { target: { value: String(i) } })
}
beforeEach(() => {
  vi.clearAllMocks()
  rememberSignup(null)
  checkUser.mockResolvedValue({ status: true })
})

it.each(['Apple', 'Google'])(
  'preserves verified %s login session fallbacks',
  async (provider) => {
    signInWithPopup.mockResolvedValue({
      user: {
        uid: 'synthetic-uid',
        email: ' Member@Example.COM ',
        displayName: 'Test Member',
        photoURL: 'https://example.com/avatar.png',
      },
    })
    getAdditionalUserInfo.mockReturnValue({ profile: {} })
    ssoCheck.mockResolvedValue({
      status: true,
      data: { id: 'social-user', token: 'synthetic-social-token', isEmailVerified: true },
    })
    flow('/login')
    fireEvent.click(screen.getByRole('button', { name: `Sign in with ${provider}` }))
    await screen.findByText('Destination')
    expect(ssoCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'member@example.com',
        fname: 'Test',
        lname: 'Member',
        ssoAccount: provider.toLowerCase(),
        identityToken: 'synthetic-uid',
      }),
    )
    expect(JSON.parse(localStorage.getItem('socialknkt_auth'))).toEqual({
      token: 'synthetic-social-token',
      user: {
        id: 'social-user',
        username: '',
        phone: '',
        email: provider === 'Apple' ? 'member@example.com' : ' Member@Example.COM ',
        image: provider === 'Apple' ? '' : 'https://example.com/avatar.png',
        bannerImage: '',
      },
    })
  },
)

it.each(['Apple', 'Google'])(
  'keeps unverified %s sessions out of storage and prefills signup',
  async (provider) => {
    signInWithPopup.mockResolvedValue({
      user: { uid: 'synthetic-uid', email: 'member@example.com', displayName: null },
    })
    getAdditionalUserInfo.mockReturnValue({
      profile: { firstName: 'Apple', lastName: 'Member' },
    })
    ssoCheck.mockResolvedValue({
      status: true,
      data: { token: 'unverified-test-token', isEmailVerified: false },
    })
    flow('/login')
    fireEvent.click(screen.getByRole('button', { name: `Sign in with ${provider}` }))
    await screen.findByText('Go ahead and sign up')
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('member@example.com')
    expect(screen.getByPlaceholderText('Enter your First Name')).toHaveValue(
      provider === 'Apple' ? 'Apple' : '',
    )
    expect(screen.queryByPlaceholderText('Password')).toBeNull()
    expect(localStorage.getItem('socialknkt_auth')).toBeNull()
  },
)

it.each([true, false])(
  'holds signup token until OTP succeeds (response includes email: %s)',
  async (includesEmail) => {
    signUp.mockResolvedValue({
      status: true,
      data: { ...user, email: includesEmail ? user.email : undefined },
    })
    verifyOtp
      .mockRejectedValueOnce(new Error('Incorrect OTP'))
      .mockResolvedValueOnce({ status: true })
    const { container } = flow()
    for (const [name, value] of Object.entries({
      fname: 'Test',
      lname: 'Member',
      username: 'test',
      email: ' Test@Example.COM ',
      dob: '1998-08-21',
      password: 'Example-password1!',
      confirmPassword: 'Example-password1!',
    })) {
      fireEvent.change(container.querySelector(`input[name="${name}"]`), { target: { value } })
    }
    fireEvent.change(screen.getByPlaceholderText('Enter your number'), {
      target: { value: '+12025550123' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up', exact: true }))
    await screen.findByText('Verify Your Account')
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }))
    expect(localStorage.getItem('socialknkt_auth')).toBeNull()
    expect(sessionStorage.length).toBe(0)
    enterCode('Verification code digit')
    fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Verify Code' })).not.toBeDisabled(),
    )
    expect(localStorage.getItem('socialknkt_auth')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }))
    await screen.findByText('Account ready')
    expect(verifyOtp).toHaveBeenLastCalledWith({
      otp: '123456',
      email: 'test@example.com',
      needToken: false,
    })
    expect(JSON.parse(localStorage.getItem('socialknkt_auth'))).toMatchObject({
      token: user.token,
      user: { id: user.id, email: user.email },
    })
    expect(localStorage.getItem('socialknkt_auth')).not.toContain('Example-password')
  },
)

function pendingVerification() {
  let resolve, reject
  verifyOtp.mockImplementationOnce(
    () =>
      new Promise((done, fail) => {
        resolve = done
        reject = fail
      }),
  )
  rememberSignup(user)
  const view = flow({ pathname: '/verify-account', state: { email: user.email } })
  enterCode('Verification code digit')
  const form = screen.getByRole('button', { name: 'Verify Code' }).closest('form')
  fireEvent.submit(form)
  return { ...view, form, resolve: (value) => resolve(value), reject: (error) => reject(error) }
}

it('locks synchronous duplicate OTP submissions before consuming the pending session', async () => {
  const pending = pendingVerification()
  fireEvent.submit(pending.form)
  fireEvent.submit(pending.form)
  expect(verifyOtp).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve({ status: true }))
  expect(screen.getByText('Account ready')).toBeTruthy()
  expect(screen.queryByText('Sign in recovery')).toBeNull()
  expect(JSON.parse(localStorage.getItem('socialknkt_auth')).token).toBe(user.token)
})

it('ignores successful verification after unmount without consuming pending credentials', async () => {
  const pending = pendingVerification()
  pending.unmount()
  await act(async () => pending.resolve({ status: true }))
  expect(localStorage.getItem('socialknkt_auth')).toBeNull()
  expect(toast.success).not.toHaveBeenCalled()
  expect(consumeSignup(user.email)?.token).toBe(user.token)
})

it('does not overwrite an account switched during OTP verification', async () => {
  const pending = pendingVerification()
  const otherSession = JSON.stringify({ token: 'other-account', user: { id: 'other' } })
  localStorage.setItem('socialknkt_auth', otherSession)
  window.dispatchEvent(new Event('auth-change'))
  await act(async () => pending.resolve({ status: true }))
  expect(localStorage.getItem('socialknkt_auth')).toBe(otherSession)
  expect(screen.getByText('Verify Your Account')).toBeTruthy()
  expect(toast.success).not.toHaveBeenCalled()
  expect(consumeSignup(user.email)?.token).toBe(user.token)
})

it('ignores stale success after a cross-tab login then logout returns storage to its original value', async () => {
  const pending = pendingVerification()
  window.dispatchEvent(
    new StorageEvent('storage', { key: 'socialknkt_auth', newValue: 'another-session' }),
  )
  window.dispatchEvent(new StorageEvent('storage', { key: 'socialknkt_auth', newValue: null }))
  await act(async () => pending.resolve({ status: true }))
  expect(localStorage.getItem('socialknkt_auth')).toBeNull()
  expect(toast.success).not.toHaveBeenCalled()
})

it('does not consume a newer signup for the same email when an older OTP request finishes', async () => {
  const pending = pendingVerification()
  rememberSignup({ ...user, token: 'new-pending-token' })
  await act(async () => pending.resolve({ status: true }))
  expect(localStorage.getItem('socialknkt_auth')).toBeNull()
  expect(consumeSignup(user.email)?.token).toBe('new-pending-token')
})

it('suppresses stale verification errors after unmount', async () => {
  const pending = pendingVerification()
  pending.unmount()
  await act(async () => pending.reject(new Error('Late error')))
  expect(toast.error).not.toHaveBeenCalled()
})

it.each([null, { ...user, email: 'someone-else@example.com' }])(
  'never activates a missing or mismatched pending session',
  async (pending) => {
    rememberSignup(pending)
    verifyOtp.mockResolvedValue({ status: true })
    flow({ pathname: '/verify-account', state: { email: ' Test@Example.COM ' } })
    enterCode('Verification code digit')
    fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }))
    await screen.findByText('Sign in recovery')
    expect(localStorage.getItem('socialknkt_auth')).toBeNull()
  },
)

it('opens the verified Terms URL without selecting consent', () => {
  flow()
  const link = screen.getByRole('link', { name: 'Terms and conditions.' })
  expect(link).toHaveAttribute('href', 'https://socialknkt.com/terms')
  expect(link).toHaveAttribute('target', '_blank')
  fireEvent.click(link)
  expect(screen.getByRole('checkbox')).not.toBeChecked()
})

it('normalizes forgot-password email through verify and reset contracts', async () => {
  sendForgotPasswordOtp.mockResolvedValue({ status: true })
  verifyOtp.mockResolvedValue({ status: true, data: 'reset-test-token' })
  changePassword.mockResolvedValue({ status: true })
  flow('/forgot-password')
  fireEvent.change(screen.getByLabelText('Email Id'), {
    target: { value: ' Test@Example.COM ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  await screen.findByLabelText('OTP digit 1')
  expect(sendForgotPasswordOtp).toHaveBeenCalledWith({ email: 'test@example.com' })
  enterCode('OTP digit')
  fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }))
  await screen.findByText('Create New Password')
  expect(verifyOtp).toHaveBeenCalledWith({
    email: 'test@example.com',
    otp: '123456',
    needToken: true,
  })
  fireEvent.change(screen.getByPlaceholderText('New Password'), {
    target: { value: 'New-password1!' },
  })
  fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), {
    target: { value: 'New-password1!' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Set Password' }))
  await screen.findByText('Password updated')
  expect(changePassword).toHaveBeenCalledWith({
    email: 'test@example.com',
    token: 'reset-test-token',
    password: 'New-password1!',
  })
})

it('normalizes email at password login', async () => {
  login.mockResolvedValue({ status: true, data: { ...user, isEmailVerified: true } })
  const { container } = flow('/login')
  fireEvent.change(screen.getByLabelText('Email Id'), {
    target: { value: ' Test@Example.COM ' },
  })
  fireEvent.change(container.querySelector('input[type=password]'), {
    target: { value: 'Example-password1!' },
  })
  fireEvent.submit(container.querySelector('form'))
  await screen.findByText('Destination')
  expect(login).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'Example-password1!',
  })
})
