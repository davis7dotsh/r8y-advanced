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
import { MoonIcon, SearchIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import appCss from '../styles.css?url'
import { resolveAuthRedirect } from '@/features/auth/auth-redirect'
import {
  clearAuthState,
  getAuthStatus,
  readPersistedPasscode,
  signOut,
} from '@/features/auth/auth.functions'
import { GlobalCommand } from '@/components/global-command'
import { Button } from '@/components/ui/button'

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

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`

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

  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">
        {showNavigation ? (
          <nav className="border-b border-border bg-background px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link
                  to="/davis"
                  search={{ page: 1, q: undefined }}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold"
                >
                  Davis
                </Link>
                <Link
                  to="/theo"
                  search={{ page: 1, q: undefined }}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold"
                >
                  Theo
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="hidden items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
                >
                  <SearchIcon className="size-3.5" />
                  <span>Search</span>
                  <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                    ⌘K
                  </kbd>
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCommandOpen(true)}
                  className="flex sm:hidden"
                  aria-label="Open search"
                >
                  <SearchIcon className="size-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <SunIcon className="size-4" />
                  ) : (
                    <MoonIcon className="size-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </nav>
        ) : null}
        {children}
        <GlobalCommand open={commandOpen} onOpenChange={setCommandOpen} />
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
