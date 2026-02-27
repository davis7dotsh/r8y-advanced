const PUBLIC_PREFIXES = ['/unlock', '/share']

const isPublicPath = (pathname: string) =>
  PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

export const resolveAuthRedirect = ({
  pathname,
  authenticated,
}: {
  pathname: string
  authenticated: boolean
}) => {
  if (!authenticated && !isPublicPath(pathname)) {
    return '/unlock'
  }

  if (authenticated && pathname === '/unlock') {
    return '/theo'
  }

  return null
}
