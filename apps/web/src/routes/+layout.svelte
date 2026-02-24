<script lang="ts">
  import '../app.css'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { onMount } from 'svelte'
  import GlobalCommand from '@/components/GlobalCommand.svelte'
  import { clearAuthStorage } from '@/features/auth/auth'
  import { signOut } from '@/remote/auth.remote'
  import { toHref } from '@/utils/url'

  let { children } = $props()

  let theme = $state<'light' | 'dark'>('light')
  let commandOpen = $state(false)

  const showNavigation = $derived(
    !page.url.pathname.startsWith('/unlock') && !page.url.pathname.startsWith('/share'),
  )

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    theme = next

    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore storage errors
    }
  }

  const handleSignOut = async () => {
    await signOut()
    clearAuthStorage()
    await goto('/unlock')
  }

  onMount(() => {
    const persisted = localStorage.getItem('theme')
    const next = persisted === 'dark' ? 'dark' : 'light'

    theme = next

    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        commandOpen = !commandOpen
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })
</script>

<svelte:head>
  <title>R8Y Theo Explorer</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

{#if showNavigation}
  <nav class="border-b border-border bg-background px-4 sm:px-6 lg:px-8">
    <div class="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <a
          href={toHref('/davis', { page: 1 })}
          class={`text-sm transition-colors hover:text-foreground ${
            page.url.pathname.startsWith('/davis')
              ? 'font-semibold text-foreground'
              : 'font-medium text-muted-foreground'
          }`}
        >
          Davis
        </a>
        <a
          href={toHref('/theo', { page: 1 })}
          class={`text-sm transition-colors hover:text-foreground ${
            page.url.pathname.startsWith('/theo')
              ? 'font-semibold text-foreground'
              : 'font-medium text-muted-foreground'
          }`}
        >
          Theo
        </a>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => {
            commandOpen = true
          }}
          class="hidden items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        >
          <span>Search</span>
          <kbd class="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onclick={toggleTheme}
          class="inline-flex size-9 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          type="button"
          onclick={handleSignOut}
          class="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  </nav>
{/if}

{@render children()}

<GlobalCommand
  open={commandOpen}
  onOpenChange={(next) => {
    commandOpen = next
  }}
/>
