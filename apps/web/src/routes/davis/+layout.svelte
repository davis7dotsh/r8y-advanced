<script lang="ts">
  let { children } = $props()
</script>

<main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
  <header class="mb-10">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-violet-600">Davis Data</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Davis Explorer</h1>
      </div>
      <a
        href="/davis?page=1"
        class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Browse all videos
      </a>
    </div>
  </header>

  {@render children()}
</main>
