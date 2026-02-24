<script lang="ts">
  let {
    page,
    totalPages,
    getHref,
    className = 'flex items-center gap-2 text-sm',
  } = $props<{
    page: number
    totalPages: number
    getHref: (page: number) => string
    className?: string
  }>()
</script>

<div class={className}>
  {#if page > 1}
    <a
      href={getHref(page - 1)}
      class="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
    >
      Previous
    </a>
  {:else}
    <span class="rounded-lg border border-neutral-100 px-3 py-1.5 text-neutral-300 dark:border-neutral-800 dark:text-neutral-600">
      Previous
    </span>
  {/if}

  <span class="text-neutral-500">{page} / {totalPages}</span>

  {#if page < totalPages}
    <a
      href={getHref(page + 1)}
      class="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
    >
      Next
    </a>
  {:else}
    <span class="rounded-lg border border-neutral-100 px-3 py-1.5 text-neutral-300 dark:border-neutral-800 dark:text-neutral-600">
      Next
    </span>
  {/if}
</div>
