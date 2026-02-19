import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'
import appCss from '../styles.css?url'
import { resolveAuthRedirect } from '@/features/auth/auth-redirect'
import {
  clearAuthState,
  getAuthStatus,
  readPersistedPasscode,
  signOut,
} from '@/features/auth/auth.functions'

const getRedirectTarget = async (pathname: string) => {
  const auth = await getAuthStatus({
    data: {
      cookiePasscode: readPersistedPasscode() ?? '',
    },
  })

  return resolveAuthRedirect({
    pathname,
    authenticated: auth.authenticated,
  })
}

const redirectTo = (target: '/unlock' | '/theo') => {
  if (target === '/unlock') {
    throw redirect({
      to: '/unlock',
      replace: true,
    })
  }

  throw redirect({
    to: '/theo',
    search: {
      page: 1,
      q: undefined,
    },
    replace: true,
  })
}

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (typeof window === 'undefined') {
      return
    }

    const redirectTarget = await getRedirectTarget(location.pathname)
    if (redirectTarget) {
      redirectTo(redirectTarget)
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'R8Y Theo Explorer',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const navigate = useNavigate()
  const showNavigation = pathname !== '/unlock'

  useEffect(() => {
    let isMounted = true

    const enforceAuth = async () => {
      const redirectTarget = await getRedirectTarget(pathname)
      if (!isMounted || !redirectTarget) {
        return
      }

      if (redirectTarget === '/unlock') {
        await navigate({
          to: '/unlock',
          replace: true,
        })
        return
      }

      await navigate({
        to: '/theo',
        search: {
          page: 1,
          q: undefined,
        },
        replace: true,
      })
    }

    void enforceAuth()

    return () => {
      isMounted = false
    }
  }, [navigate, pathname])

  const handleSignOut = async () => {
    await signOut()
    clearAuthState()
    await navigate({
      to: '/unlock',
      replace: true,
    })
  }

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        {showNavigation ? (
          <nav className="border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <Link
                  to="/davis"
                  search={{ page: 1, q: undefined }}
                  className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 [&.active]:text-neutral-900 [&.active]:font-semibold"
                >
                  Davis
                </Link>
                <Link
                  to="/theo"
                  search={{ page: 1, q: undefined }}
                  className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 [&.active]:text-neutral-900 [&.active]:font-semibold"
                >
                  Theo
                </Link>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
              >
                Sign out
              </button>
            </div>
          </nav>
        ) : null}
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
