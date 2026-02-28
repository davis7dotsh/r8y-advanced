<script lang="ts">
  import { page } from '$app/state'
</script>

<div class="flex flex-1 flex-col items-center justify-center py-24">
  <p class="text-6xl font-bold tracking-tight text-muted-foreground/40">{page.status}</p>
  <h2 class="mt-4 text-lg font-semibold tracking-tight">
    {page.status === 404 ? 'Page not found' : 'Something went wrong'}
  </h2>
  <p class="mt-2 text-sm text-muted-foreground">
    {page.error?.message ?? 'An unexpected error occurred.'}
  </p>
  <a
    href="/davis?page=1"
    class="mt-6 text-sm font-medium text-violet-600 transition-colors hover:text-violet-700"
  >
    &larr; Back to Davis videos
  </a>
</div>
