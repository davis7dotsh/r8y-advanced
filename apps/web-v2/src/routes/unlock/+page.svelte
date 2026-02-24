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
  <div class="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
    <h1 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Enter passcode</h1>
    <p class="mt-1 text-sm text-neutral-500">This app is protected.</p>

    <form class="mt-5 space-y-3" onsubmit={submit}>
      <input
        bind:this={passcodeInput}
        type="password"
        bind:value={passcode}
        placeholder="Passcode"
        class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-violet-500/30 transition focus:border-violet-500 focus:ring dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />

      {#if errorMessage}
        <p class="text-sm text-red-600 dark:text-red-400" role="alert">{errorMessage}</p>
      {/if}

      <button
        type="submit"
        disabled={isSubmitting}
        class="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isSubmitting ? 'Checking…' : 'Unlock'}
      </button>
    </form>
  </div>
</main>
