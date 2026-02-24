const AUTH_COOKIE_NAME = 'r8y_auth_passcode'
const AUTH_STORAGE_KEY = 'r8y_auth_passcode'
const TWENTY_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 20

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
}) => ({
  status: 'ok' as const,
  authenticated: Boolean(serverPasscode) && cookiePasscode === serverPasscode,
})

export const resolveSignInResult = ({
  serverPasscode,
  passcode,
}: {
  serverPasscode: string
  passcode: string
}) => {
  if (!serverPasscode) {
    return {
      status: 'error' as const,
      reason: 'missing_server_passcode' as const,
    }
  }

  if (!passcode || passcode !== serverPasscode) {
    return {
      status: 'error' as const,
      reason: 'invalid_passcode' as const,
    }
  }

  return {
    status: 'ok' as const,
  }
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

  return decodeURIComponent(match.slice(`${AUTH_COOKIE_NAME}=`.length))
}

export const readAuthStorage = () => {
  if (typeof localStorage === 'undefined') {
    return undefined
  }

  const value = localStorage.getItem(AUTH_STORAGE_KEY)
  return value ?? undefined
}

export const readPersistedPasscode = () => readAuthCookie() ?? readAuthStorage()

export const persistAuthStorage = (passcode: string) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(AUTH_STORAGE_KEY, passcode)
}

export const clearAuthStorage = () => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(AUTH_STORAGE_KEY)
}
