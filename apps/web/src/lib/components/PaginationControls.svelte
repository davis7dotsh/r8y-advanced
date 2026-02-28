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
      class="border border-foreground bg-background px-3 py-1.5 text-foreground transition-colors hover:bg-[#D62828] hover:border-[#D62828] hover:text-white dark:hover:bg-red-700 dark:hover:border-red-700"
    >
      Previous
    </a>
  {:else}
    <span class="border border-border px-3 py-1.5 text-muted-foreground/40">
      Previous
    </span>
  {/if}

  <span class="text-muted-foreground">{page} / {totalPages}</span>

  {#if page < totalPages}
    <a
      href={getHref(page + 1)}
      class="border border-foreground bg-background px-3 py-1.5 text-foreground transition-colors hover:bg-[#D62828] hover:border-[#D62828] hover:text-white dark:hover:bg-red-700 dark:hover:border-red-700"
    >
      Next
    </a>
  {:else}
    <span class="border border-border px-3 py-1.5 text-muted-foreground/40">
      Next
    </span>
  {/if}
</div>
