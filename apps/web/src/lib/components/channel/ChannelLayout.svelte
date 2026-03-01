<script lang="ts">
  import type { Snippet } from 'svelte'
  import { formatCompactNumber } from '@/utils/format'

  type ChannelStatsPayload =
    | {
        status: 'ok'
        data: {
          avatarUrl: string | null
          handle: string | null
          subscriberCount: number
          last30Days: {
            videoCount: number
            viewCount: number
            likeCount: number
          }
        }
      }
    | {
        status: 'error'
        error: { message: string }
      }

  let {
    title,
    allVideosHref,
    statsLoad = null,
    children,
  } = $props<{
    title: string
    allVideosHref: string
    statsLoad?: Promise<ChannelStatsPayload> | null
    children: Snippet
  }>()
</script>

<main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
  <header class="mb-8">
    <div class="border-b-[3px] border-foreground"></div>
    <div class="flex items-center justify-between py-3">
      <div class="flex items-center gap-3.5">
        {#if statsLoad}
          {#await statsLoad then stats}
            {#if stats.status === 'ok' && stats.data.avatarUrl}
              <img
                src={stats.data.avatarUrl}
                alt={title}
                class="size-10 shrink-0 rounded-full object-cover sm:size-12"
              />
            {/if}
          {/await}
        {/if}

        <div>
          <h1 class="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>

          {#if statsLoad}
            {#await statsLoad}
              <div class="mt-1 flex gap-3">
                <div class="h-3.5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
                <div class="h-3.5 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
              </div>
            {:then stats}
              {#if stats.status === 'ok'}
                {@const hasPrefix = !!stats.data.handle || stats.data.subscriberCount > 0}
                <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {#if stats.data.handle}
                    <a
                      href={`https://youtube.com/${stats.data.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-medium text-neutral-500 transition-colors hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                    >
                      {stats.data.handle}
                    </a>
                  {/if}
                  {#if stats.data.subscriberCount > 0}
                    {#if stats.data.handle}
                      <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                    {/if}
                    <span>
                      <span class="font-semibold text-foreground">{formatCompactNumber(stats.data.subscriberCount)}</span>
                      subs
                    </span>
                  {/if}
                  {#if hasPrefix}
                    <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  {/if}
                  <span>
                    <span class="font-semibold text-foreground">{stats.data.last30Days.videoCount}</span>
                    vids
                  </span>
                  <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>
                    <span class="font-semibold text-foreground">{formatCompactNumber(stats.data.last30Days.viewCount)}</span>
                    views
                  </span>
                  <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>
                    <span class="font-semibold text-foreground">{formatCompactNumber(stats.data.last30Days.likeCount)}</span>
                    likes
                  </span>
                  <span class="text-neutral-400 dark:text-neutral-500">/ 30d</span>
                </div>
              {/if}
            {:catch}
              <!-- silently ignore stats fetch failures -->
            {/await}
          {/if}
        </div>
      </div>

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
