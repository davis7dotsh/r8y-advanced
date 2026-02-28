<script lang="ts">
  import { page } from '$app/state'
</script>

<div class="flex flex-1 flex-col items-center justify-center py-24">
  <p class="font-serif text-7xl font-bold tracking-tight text-muted-foreground/30">{page.status}</p>
  <h2 class="mt-4 font-serif text-xl font-semibold tracking-tight">
    {page.status === 404 ? 'Page not found' : 'Something went wrong'}
  </h2>
  <p class="mt-2 text-sm text-muted-foreground">
    {page.error?.message ?? 'An unexpected error occurred.'}
  </p>
  <a
    href="/davis?page=1"
    class="mt-6 text-sm font-medium text-[#D62828] transition-colors hover:text-[#D62828]/70 dark:text-red-400 dark:hover:text-red-300"
  >
    &larr; Back to Davis videos
  </a>
</div>
