import { redirect } from '@sveltejs/kit'
import { resolveAuthRedirect } from '@/features/auth/auth-redirect'
import { authCookieConfig } from '@/features/auth/auth'
import { readServerPasscode } from '@/features/auth/auth.server'

export const load = ({ url, cookies }) => {
  const serverPasscode = readServerPasscode()
  const cookiePasscode = cookies.get(authCookieConfig.name)

  const redirectTarget = resolveAuthRedirect({
    pathname: url.pathname,
    authenticated:
      Boolean(serverPasscode) &&
      typeof cookiePasscode === 'string' &&
      cookiePasscode === serverPasscode,
  })

  if (redirectTarget === '/unlock') {
    redirect(307, '/unlock')
  }

  if (redirectTarget === '/theo') {
    redirect(307, '/theo?page=1')
  }

  return {}
}
