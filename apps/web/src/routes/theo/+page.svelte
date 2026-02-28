<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import { parseTheoListSearch } from '@/features/theo/theo-search-params'
  import { getTheoVideos } from '@/remote/theo.remote'
  import { formatCompactNumber } from '@/utils/format'
  import { toHref } from '@/utils/url'

  const search = $derived(parseTheoListSearch(Object.fromEntries(page.url.searchParams)))
  const videosQuery = $derived(getTheoVideos(search))
</script>

{#if videosQuery.error}
  <ErrorState title="Unable to load Theo videos" message={videosQuery.error.message ?? 'Unknown error'} />
{:else if !videosQuery.ready}
  <section
    class="space-y-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="space-y-2">
      <div class="h-4 w-52 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
      <div class="h-3 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800"></div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {#each Array(6) as _}
        <article class="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <div class="aspect-video w-full animate-pulse bg-neutral-200 dark:bg-neutral-800"></div>
          <div class="space-y-2 p-4">
            <div class="h-3.5 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
            <div class="h-3.5 w-2/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800"></div>
          </div>
        </article>
      {/each}
    </div>
  </section>
{:else if videosQuery.current.status === 'error'}
  <ErrorState title="Unable to load Theo videos" message={videosQuery.current.error.message} />
{:else}
  {@const items = videosQuery.current.data.items}
  {@const pagination = videosQuery.current.data.pagination}

  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">
        Showing
        <span class="font-medium text-foreground">{items.length}</span>
        of
        <span class="font-medium text-foreground">{pagination.total}</span>
        videos
        {#if search.q}
          for
          <span class="font-medium text-violet-600">"{search.q}"</span>
        {/if}
      </p>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        getHref={(p) => toHref('/theo', { page: p, q: search.q })}
      />
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {#each items as video}
        <article class="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
          <a href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="block overflow-hidden">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              class="aspect-video w-full object-cover transition duration-200 hover:scale-[1.02]"
              loading="lazy"
            />
          </a>

          <div class="p-4 pt-3.5">
            <a
              href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })}
              class="block truncate text-sm font-medium transition-colors hover:text-violet-600"
            >
              {video.title}
            </a>

            <div class="mt-1.5 flex flex-wrap gap-1">
              {#if video.sponsors.length > 0}
                {#each video.sponsors as sponsor}
                  <a
                    href={toHref(`/theo/sponsor/${encodeURIComponent(sponsor.slug)}`, { page: 1 })}
                    class="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-900/60"
                  >
                    {sponsor.name}
                  </a>
                {/each}
              {/if}
            </div>

            <div class="mt-4 flex items-center gap-3.5 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <span class="font-medium text-foreground">
                  {formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))}
                </span>
              </span>
              <span class="flex items-center gap-1 text-red-500">
                <span class="font-medium">{formatCompactNumber(video.viewCount)}</span>
              </span>
              {#if video.xPost?.views != null}
                <span class="flex items-center gap-1 text-sky-500">
                  <span class="text-[10px] font-bold leading-none">X</span>
                  <span class="font-medium">{formatCompactNumber(video.xPost.views)}</span>
                </span>
              {/if}
              <span class="flex items-center gap-1">
                <span class="font-medium text-foreground">{formatCompactNumber(video.likeCount)}</span>
              </span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
{/if}
