import { expect, test } from 'vitest'
import { resolveAuthRedirect } from '@/features/auth/auth-redirect'

test('unauthenticated access to /theo redirects to /unlock', () => {
  expect(
    resolveAuthRedirect({
      pathname: '/theo',
      authenticated: false,
    }),
  ).toBe('/unlock')
})

test('authenticated access to /unlock redirects to /theo', () => {
  expect(
    resolveAuthRedirect({
      pathname: '/unlock',
      authenticated: true,
    }),
  ).toBe('/theo')
})

test('unauthenticated access to /unlock is allowed', () => {
  expect(
    resolveAuthRedirect({
      pathname: '/unlock',
      authenticated: false,
    }),
  ).toBeNull()
})
