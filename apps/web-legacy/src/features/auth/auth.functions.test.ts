/** @vitest-environment jsdom */
import { beforeEach, expect, test } from 'vitest'
import {
  clearAuthState,
  persistAuthState,
  readAuthStorage,
  readPersistedPasscode,
  resolveAuthStatus,
  resolveSignInResult,
} from './auth.functions'

beforeEach(() => {
  document.cookie = 'r8y_auth_passcode=; Max-Age=0; Path=/; SameSite=Lax'
  localStorage.removeItem('r8y_auth_passcode')
})

test('returns unauthenticated when cookie missing', () => {
  const result = resolveAuthStatus({
    serverPasscode: 'letmein',
    cookiePasscode: undefined,
  })

  expect(result).toEqual({
    status: 'ok',
    authenticated: false,
  })
})

test('returns unauthenticated when env passcode is missing', () => {
  const result = resolveAuthStatus({
    serverPasscode: '',
    cookiePasscode: 'letmein',
  })

  expect(result).toEqual({
    status: 'ok',
    authenticated: false,
  })
})

test('returns authenticated when cookie matches env passcode', () => {
  const result = resolveAuthStatus({
    serverPasscode: 'letmein',
    cookiePasscode: 'letmein',
  })

  expect(result).toEqual({
    status: 'ok',
    authenticated: true,
  })
})

test('sign-in success returns ok and persists browser auth state', () => {
  const result = resolveSignInResult({
    serverPasscode: 'letmein',
    passcode: 'letmein',
  })

  expect(result).toEqual({ status: 'ok' })

  persistAuthState('letmein')
  expect(readAuthStorage()).toBe('letmein')
  expect(readPersistedPasscode()).toBe('letmein')
})

test('sign-in invalid passcode returns error', () => {
  const result = resolveSignInResult({
    serverPasscode: 'letmein',
    passcode: 'wrong',
  })

  expect(result).toEqual({
    status: 'error',
    reason: 'invalid_passcode',
  })
})

test('sign-out clears persisted auth state', () => {
  persistAuthState('letmein')
  clearAuthState()

  expect(readPersistedPasscode()).toBeUndefined()
  expect(readAuthStorage()).toBeUndefined()
})
