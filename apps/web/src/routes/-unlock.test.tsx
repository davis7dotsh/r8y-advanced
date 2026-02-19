/** @vitest-environment jsdom */
import { expect, test, vi } from 'vitest'
import { submitUnlockAttempt } from './unlock'

test('renders passcode field and submit button intent via successful submit flow', async () => {
  const signIn = vi.fn().mockResolvedValue({ status: 'ok' })
  const persistCookie = vi.fn()
  const navigate = vi.fn()
  const onError = vi.fn()

  const result = await submitUnlockAttempt({
    passcode: 'letmein',
    signIn,
    persistCookie,
    navigate,
    onError,
  })

  expect(result).toBe(true)
  expect(signIn).toHaveBeenCalledWith({ data: { passcode: 'letmein' } })
})

test('shows invalid message on failed sign-in', async () => {
  const signIn = vi.fn().mockResolvedValue({
    status: 'error',
    reason: 'invalid_passcode',
  })
  const persistCookie = vi.fn()
  const navigate = vi.fn()
  const onError = vi.fn()

  const result = await submitUnlockAttempt({
    passcode: 'wrong',
    signIn,
    persistCookie,
    navigate,
    onError,
  })

  expect(result).toBe(false)
  expect(onError).toHaveBeenCalledWith('Wrong passcode. Try again.')
  expect(navigate).not.toHaveBeenCalled()
})

test('navigates to /theo on successful sign-in', async () => {
  const signIn = vi.fn().mockResolvedValue({ status: 'ok' })
  const persistCookie = vi.fn()
  const navigate = vi.fn()
  const onError = vi.fn()

  const result = await submitUnlockAttempt({
    passcode: 'letmein',
    signIn,
    persistCookie,
    navigate,
    onError,
  })

  expect(result).toBe(true)
  expect(persistCookie).toHaveBeenCalledWith('letmein')
  expect(navigate).toHaveBeenCalledWith({
    to: '/theo',
    search: {
      page: 1,
      q: undefined,
    },
  })
})
