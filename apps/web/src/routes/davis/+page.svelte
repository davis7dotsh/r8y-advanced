<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import { parseDavisListSearch } from '@/features/davis/davis-search-params'
  import { getDavisVideos } from '@/remote/davis.remote'
  import { formatCompactNumber } from '@/utils/format'
  import { toHref } from '@/utils/url'

  const search = $derived(parseDavisListSearch(Object.fromEntries(page.url.searchParams)))
  const videosQuery = $derived(getDavisVideos(search))

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }
</script>

{#if videosQuery.error}
  <ErrorState title="Unable to load Davis videos" message={videosQuery.error.message ?? 'Unknown error'} />
{:else if !videosQuery.ready}
  <section
    class="space-y-6 border border-border bg-card p-5"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="space-y-2">
      <div class="h-4 w-52 animate-pulse bg-muted"></div>
      <div class="h-3 w-40 animate-pulse bg-muted/60"></div>
    </div>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {#each Array(8) as _}
        <article class="overflow-hidden border border-border bg-card">
          <div class="aspect-video w-full animate-pulse bg-muted"></div>
          <div class="space-y-2 p-4">
            <div class="h-3.5 w-5/6 animate-pulse bg-muted"></div>
            <div class="h-3.5 w-2/3 animate-pulse bg-muted/60"></div>
          </div>
        </article>
      {/each}
    </div>
  </section>
{:else if videosQuery.current.status === 'error'}
  <ErrorState title="Unable to load Davis videos" message={videosQuery.current.error.message} />
{:else}
  {@const items = videosQuery.current.data.items}
  {@const pagination = videosQuery.current.data.pagination}

  <section class="space-y-0">
    <div class="flex flex-wrap items-center justify-between gap-3 py-3">
      <p class="text-xs text-muted-foreground">
        <span class="font-medium text-foreground">{items.length}</span>
        of
        <span class="font-medium text-foreground">{pagination.total}</span>
        videos
        {#if search.q}
          <span class="ml-1 font-serif text-sm italic text-[#D62828] dark:text-red-400">"{search.q}"</span>
        {/if}
      </p>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        getHref={(p) => toHref('/davis', { page: p, q: search.q })}
      />
    </div>

    <div class="border-b border-border"></div>

    {#if items.length > 0}
      <div class="py-5">
        <a href={toHref(`/davis/video/${encodeURIComponent(items[0].videoId)}`, { commentsPage: 1 })} class="group grid grid-cols-1 gap-5 text-inherit no-underline sm:grid-cols-2">
          <div class="overflow-hidden">
            <img
              src={items[0].thumbnailUrl}
              alt=""
              class="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
          <div class="flex flex-col justify-center py-1">
            <h2 class="font-serif text-2xl font-semibold leading-snug transition-colors group-hover:text-[#D62828] dark:group-hover:text-red-400">
              {items[0].title}
            </h2>
            {#if items[0].sponsors.length > 0}
              <div class="mt-3 flex flex-wrap gap-1.5">
                {#each items[0].sponsors as sponsor}
                  <a
                    href={toHref(`/davis/sponsor/${encodeURIComponent(sponsor.slug)}`, { page: 1 })}
                    class="bg-[#D62828] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80 dark:bg-red-700"
                    onclick={(e) => e.stopPropagation()}
                  >
                    {sponsor.name}
                  </a>
                {/each}
              </div>
            {/if}
            <div class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">{formatCompactNumber(items[0].viewCount + (items[0].xPost?.views ?? 0))} views</span>
              <span class="text-border">|</span>
              <span class="text-red-500">{formatCompactNumber(items[0].viewCount)} YT</span>
              {#if items[0].xPost?.views != null}
                <span class="text-border">|</span>
                <span class="text-sky-500">{formatCompactNumber(items[0].xPost.views)} X</span>
              {/if}
              <span class="text-border">|</span>
              <span>{formatCompactNumber(items[0].likeCount)} likes</span>
            </div>
            {#if items[0].publishedAt}
              <span class="mt-2 text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                {formatDate(items[0].publishedAt)}
              </span>
            {/if}
          </div>
        </a>
      </div>

      <div class="border-b border-foreground shadow-[0_3px_0_var(--background),0_4px_0_var(--foreground)]"></div>
    {/if}

    <div class="grid grid-cols-2 gap-4 py-5 sm:grid-cols-3 md:grid-cols-4">
      {#each items.slice(1) as video}
        <a href={toHref(`/davis/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="group text-inherit no-underline">
          <div class="overflow-hidden">
            <img src={video.thumbnailUrl} alt="" class="aspect-video w-full object-cover" loading="lazy" />
          </div>
          <h3 class="mt-2 line-clamp-2 font-serif text-sm font-semibold leading-snug transition-colors group-hover:text-[#D62828] dark:group-hover:text-red-400">
            {video.title}
          </h3>
          {#if video.sponsors.length > 0}
            <div class="mt-1.5 flex flex-wrap gap-1">
              {#each video.sponsors as sponsor}
                <a
                  href={toHref(`/davis/sponsor/${encodeURIComponent(sponsor.slug)}`, { page: 1 })}
                  class="bg-red-50 px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[#D62828] transition-opacity hover:opacity-70 dark:bg-red-950 dark:text-red-400"
                  onclick={(e) => e.stopPropagation()}
                >
                  {sponsor.name}
                </a>
              {/each}
            </div>
          {/if}
          <div class="mt-1.5 flex gap-2 text-[0.65rem] text-muted-foreground">
            <span class="font-semibold text-foreground/70">{formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))}</span>
            <span class="text-red-500">{formatCompactNumber(video.viewCount)}</span>
            {#if video.xPost?.views != null}
              <span class="text-sky-500">{formatCompactNumber(video.xPost.views)}</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>

    <div class="border-b border-border"></div>
    <div class="flex justify-center pt-5">
      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        getHref={(p) => toHref('/davis', { page: p, q: search.q })}
      />
    </div>
  </section>
{/if}
