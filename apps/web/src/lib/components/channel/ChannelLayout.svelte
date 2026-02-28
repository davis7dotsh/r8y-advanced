<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    allVideosHref,
    children,
  } = $props<{
    title: string
    allVideosHref: string
    children: Snippet
  }>()
</script>

<main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
  <header class="mb-8">
    <div class="border-b-[3px] border-foreground"></div>
    <div class="flex items-center justify-between py-3">
      <h1 class="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <a
        href={allVideosHref}
        class="text-xs font-600 uppercase tracking-[0.1em] text-[#D62828] transition-opacity hover:opacity-70 dark:text-red-400"
      >
        All Videos
      </a>
    </div>
    <div class="border-b-[3px] border-foreground"></div>
  </header>

  {@render children()}
</main>
