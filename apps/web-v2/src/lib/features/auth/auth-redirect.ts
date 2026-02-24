export const resolveAuthRedirect = ({
  pathname,
  authenticated,
}: {
  pathname: string
  authenticated: boolean
}) => {
  if (!authenticated && pathname !== '/unlock') {
    return '/unlock'
  }

  if (authenticated && pathname === '/unlock') {
    return '/theo'
  }

  return null
}
