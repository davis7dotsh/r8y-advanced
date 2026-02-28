<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { persistAuthStorage } from '@/features/auth/auth'
  import { signInWithPasscode } from '@/remote/auth.remote'

  let passcode = $state('')
  let errorMessage = $state('')
  let isSubmitting = $state(false)
  let passcodeInput = $state<HTMLInputElement | null>(null)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    errorMessage = ''
    isSubmitting = true

    try {
      const result = await signInWithPasscode({ passcode })

      if (result.status === 'error') {
        errorMessage =
          result.reason === 'missing_server_passcode'
            ? 'APP_SECRET_PASSCODE is not configured on the server.'
            : 'Wrong passcode. Try again.'
        isSubmitting = false
        return
      }

      persistAuthStorage(passcode)
      await goto('/theo?page=1')
    } catch {
      errorMessage = 'Unable to sign in right now.'
      isSubmitting = false
    }
  }

  onMount(() => {
    passcodeInput?.focus()
  })
</script>

<main class="flex min-h-screen items-center justify-center px-4">
  <div class="w-full max-w-sm border border-border bg-card p-6 shadow-sm">
    <h1 class="font-serif text-xl font-semibold text-foreground">Enter passcode</h1>
    <p class="mt-1 text-sm text-muted-foreground">This app is protected.</p>

    <form class="mt-5 space-y-3" onsubmit={submit}>
      <input
        bind:this={passcodeInput}
        type="password"
        bind:value={passcode}
        placeholder="Passcode"
        class="w-full border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
      />

      {#if errorMessage}
        <p class="text-sm text-red-600 dark:text-red-400" role="alert">{errorMessage}</p>
      {/if}

      <button
        type="submit"
        disabled={isSubmitting}
        class="w-full bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:bg-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Checking…' : 'Unlock'}
      </button>
    </form>
  </div>
</main>
