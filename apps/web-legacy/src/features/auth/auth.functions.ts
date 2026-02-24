import { createServerFn } from '@tanstack/react-start'

type AuthStatusPayload = {
  status: 'ok'
  authenticated: boolean
}

type SignInPayload =
  | {
      status: 'ok'
    }
  | {
      status: 'error'
      reason: 'invalid_passcode' | 'missing_server_passcode'
    }

const AUTH_COOKIE_NAME = 'r8y_auth_passcode'
const AUTH_STORAGE_KEY = 'r8y_auth_passcode'
const TWENTY_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 20

const readServerPasscode = () => process.env.APP_SECRET_PASSCODE?.trim() ?? ''

export const authCookieConfig = {
  name: AUTH_COOKIE_NAME,
  maxAge: TWENTY_YEARS_IN_SECONDS,
}

export const resolveAuthStatus = ({
  serverPasscode,
  cookiePasscode,
}: {
  serverPasscode: string
  cookiePasscode?: string
}) =>
  ({
    status: 'ok',
    authenticated: Boolean(serverPasscode) && cookiePasscode === serverPasscode,
  }) satisfies AuthStatusPayload

export const resolveSignInResult = ({
  serverPasscode,
  passcode,
}: {
  serverPasscode: string
  passcode: string
}) => {
  if (!serverPasscode) {
    return {
      status: 'error',
      reason: 'missing_server_passcode',
    } satisfies SignInPayload
  }

  if (!passcode || passcode !== serverPasscode) {
    return {
      status: 'error',
      reason: 'invalid_passcode',
    } satisfies SignInPayload
  }

  return {
    status: 'ok',
  } satisfies SignInPayload
}

export const readAuthCookie = () => {
  if (typeof document === 'undefined') {
    return undefined
  }

  const match = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`))

  if (!match) {
    return undefined
  }

  const value = match.slice(`${AUTH_COOKIE_NAME}=`.length)
  return decodeURIComponent(value)
}

export const readAuthStorage = () => {
  if (typeof localStorage === 'undefined') {
    return undefined
  }

  const value = localStorage.getItem(AUTH_STORAGE_KEY)
  return value ?? undefined
}

export const readPersistedPasscode = () => readAuthCookie() ?? readAuthStorage()

export const persistAuthCookie = (passcode: string) => {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(passcode)}; Max-Age=${TWENTY_YEARS_IN_SECONDS}; Path=/; SameSite=Lax`
}

export const persistAuthStorage = (passcode: string) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(AUTH_STORAGE_KEY, passcode)
}

export const clearAuthCookie = () => {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
}

export const clearAuthStorage = () => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const persistAuthState = (passcode: string) => {
  persistAuthCookie(passcode)
  persistAuthStorage(passcode)
}

export const clearAuthState = () => {
  clearAuthCookie()
  clearAuthStorage()
}

export const getAuthStatus = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    return {
      cookiePasscode:
        typeof value.cookiePasscode === 'string' ? value.cookiePasscode : '',
    }
  })
  .handler(async ({ data }) => {
    return resolveAuthStatus({
      serverPasscode: readServerPasscode(),
      cookiePasscode: data.cookiePasscode,
    })
  })

export const signInWithPasscode = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    return {
      passcode: typeof value.passcode === 'string' ? value.passcode.trim() : '',
    }
  })
  .handler(async ({ data }) => {
    return resolveSignInResult({
      serverPasscode: readServerPasscode(),
      passcode: data.passcode,
    })
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  return {
    status: 'ok',
  } as const
})

export type AuthStatus = Awaited<ReturnType<typeof getAuthStatus>>
export type SignInWithPasscodePayload = Awaited<
  ReturnType<typeof signInWithPasscode>
>
export type SignOutPayload = Awaited<ReturnType<typeof signOut>>
