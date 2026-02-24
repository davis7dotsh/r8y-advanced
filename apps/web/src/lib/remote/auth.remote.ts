import { command, getRequestEvent, query } from '$app/server'
import { authCookieConfig, resolveAuthStatus, resolveSignInResult } from '@/features/auth/auth'
import { readServerPasscode } from '@/features/auth/auth.server'

const toObject = (input: unknown) =>
  input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

export const getAuthStatus = query('unchecked', async (input: unknown) => {
  const value = toObject(input)

  return resolveAuthStatus({
    serverPasscode: readServerPasscode(),
    cookiePasscode:
      typeof value.cookiePasscode === 'string' ? value.cookiePasscode : '',
  })
})

export const signInWithPasscode = command(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const passcode =
      typeof value.passcode === 'string' ? value.passcode.trim() : ''

    const result = resolveSignInResult({
      serverPasscode: readServerPasscode(),
      passcode,
    })

    if (result.status === 'ok') {
      const event = getRequestEvent()
      event.cookies.set(authCookieConfig.name, passcode, {
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: event.url.protocol === 'https:',
        maxAge: authCookieConfig.maxAge,
      })
    }

    return result
  },
)

export const signOut = command(async () => {
  const event = getRequestEvent()
  event.cookies.delete(authCookieConfig.name, {
    path: '/',
  })

  return {
    status: 'ok' as const,
  }
})

export type AuthStatus = Awaited<ReturnType<typeof getAuthStatus>>
export type SignInWithPasscodePayload = Awaited<
  ReturnType<typeof signInWithPasscode>
>
export type SignOutPayload = Awaited<ReturnType<typeof signOut>>
