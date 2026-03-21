<script lang="ts">
  import '../app.css'
  import { goto } from '$app/navigation'
  import { navigating, page } from '$app/state'
  import GlobalCommand from '@/components/GlobalCommand.svelte'
  import { clearAuthStorage } from '@/features/auth/auth'
  import { signOut } from '@/remote/auth.remote'
  import { toHref } from '@/utils/url'

  type Theme = 'light' | 'dark'
  type ThemePreference = Theme | null

  const getSearchShortcutLabel = () => {
    if (typeof navigator === 'undefined') {
      return '⌘K'
    }

    const platform = (
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform ??
      navigator.platform ??
      ''
    ).toLowerCase()

    const isAppleDevice =
      platform.includes('mac') ||
      platform.includes('iphone') ||
      platform.includes('ipad') ||
      platform.includes('ipod') ||
      platform.includes('ios')

    return isAppleDevice ? '⌘K' : 'Ctrl K'
  }

  const getStoredThemePreference = (): ThemePreference => {
    if (typeof localStorage === 'undefined') {
      return null
    }

    try {
      const storedTheme = localStorage.getItem('theme')
      return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : null
    } catch {
      return null
    }
  }

  const getSystemTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }

    return 'light'
  }

  let { children } = $props()

  let themePreference = $state<ThemePreference>(getStoredThemePreference())
  let systemTheme = $state<Theme>(getSystemTheme())
  let commandOpen = $state(false)
  const searchShortcutLabel = getSearchShortcutLabel()
  const theme = $derived(themePreference ?? systemTheme)

  const showNavigation = $derived(
    !page.url.pathname.startsWith('/unlock') &&
      !page.url.pathname.startsWith('/share'),
  )

  const toggleTheme = () => {
    themePreference = theme === 'dark' ? 'light' : 'dark'
  }

  const handleSignOut = async () => {
    await signOut()
    clearAuthStorage()
    await goto('/unlock')
  }

  const handleGlobalKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      commandOpen = !commandOpen
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== 'theme') {
      return
    }

    themePreference =
      event.newValue === 'dark' || event.newValue === 'light'
        ? event.newValue
        : null
  }

  $effect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    try {
      if (themePreference) {
        localStorage.setItem('theme', themePreference)
      } else {
        localStorage.removeItem('theme')
      }
    } catch {
      // ignore storage errors
    }
  })

  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateSystemTheme = (event?: MediaQueryListEvent) => {
      const prefersDark = event?.matches ?? mediaQuery.matches
      systemTheme = prefersDark ? 'dark' : 'light'
    }

    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme)
    }
  })
</script>

<svelte:head>
  <title>R8Y</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<svelte:window onkeydown={handleGlobalKeydown} onstorage={handleStorage} />

{#if navigating.to}
  <div
    class="fixed right-4 top-3 z-50 inline-flex items-center gap-1.5 border border-border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
  >
    <span class="size-1.5 animate-pulse bg-muted-foreground"></span>
    Loading
  </div>
{/if}

{#if showNavigation}
  <nav class="border-b border-border bg-background px-4 sm:px-6 lg:px-8">
    <div class="mx-auto flex h-11 max-w-5xl items-center justify-between gap-4">
      <div class="flex items-center gap-5">
        <a
          href={toHref('/davis', { page: 1 })}
          class={`text-sm tracking-wide transition-colors hover:text-foreground ${
            page.url.pathname.startsWith('/davis')
              ? 'font-semibold text-foreground'
              : 'font-medium text-muted-foreground'
          }`}
        >
          Davis
        </a>
        <a
          href={toHref('/theo', { page: 1 })}
          class={`text-sm tracking-wide transition-colors hover:text-foreground ${
            page.url.pathname.startsWith('/theo')
              ? 'font-semibold text-foreground'
              : 'font-medium text-muted-foreground'
          }`}
        >
          Theo
        </a>
        <a
          href={toHref('/micky', { page: 1 })}
          class={`text-sm tracking-wide transition-colors hover:text-foreground ${
            page.url.pathname.startsWith('/micky')
              ? 'font-semibold text-foreground'
              : 'font-medium text-muted-foreground'
          }`}
        >
          Micky
        </a>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => {
            commandOpen = true
          }}
          class="inline-flex items-center gap-2 border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span>Search</span>
          <kbd
            class="ml-1 border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono"
          >
            {searchShortcutLabel}
          </kbd>
        </button>

        <button
          type="button"
          onclick={toggleTheme}
          class="inline-flex size-9 items-center justify-center text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          type="button"
          onclick={handleSignOut}
          class="inline-flex h-8 items-center justify-center px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  </nav>
{/if}

{@render children()}

<GlobalCommand bind:open={commandOpen} />
