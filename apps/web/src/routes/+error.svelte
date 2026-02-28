<script lang="ts">
  import { page } from '$app/state'
</script>

<main class="mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
  <p class="text-7xl font-bold tracking-tight text-muted-foreground/40">{page.status}</p>
  <h1 class="mt-4 text-xl font-semibold tracking-tight">
    {page.status === 404 ? 'Page not found' : 'Something went wrong'}
  </h1>
  <p class="mt-2 text-sm text-muted-foreground">
    {page.error?.message ?? 'An unexpected error occurred.'}
  </p>
  <a
    href="/theo?page=1"
    class="mt-8 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
  >
    Go home
  </a>
</main>
