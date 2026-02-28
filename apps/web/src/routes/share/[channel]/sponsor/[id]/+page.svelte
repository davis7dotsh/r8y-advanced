<script lang="ts">
  import { page } from '$app/state'
  import { getShareSponsor } from '@/remote/share.remote'
  import { formatCompactNumber, daysSince } from '@/utils/format'
  import { toHref, toVercelImageHref } from '@/utils/url'
  import PaginationControls from '@/components/PaginationControls.svelte'

  const params = $derived(page.params as Record<string, string>)
  const channel = $derived(params.channel ?? '')
  const id = $derived(params.id ?? '')
  const channelLabel = $derived(channel === 'davis' ? 'Davis' : channel === 'theo' ? 'Theo' : channel)
  const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1)

  const sponsorQuery = $derived(getShareSponsor({ channel, slug: id, page: currentPage }))
</script>

<svelte:head>
  {#if sponsorQuery.ready && sponsorQuery.current.status === 'ok'}
    <title>{sponsorQuery.current.data.sponsor.name} — {channelLabel} Sponsor</title>
  {:else}
    <title>Sponsor Share</title>
  {/if}
</svelte:head>

<main class="min-h-screen bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6">
  <div class="mx-auto max-w-5xl">
    {#if sponsorQuery.error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Unable to load sponsor.
      </div>
    {:else if !sponsorQuery.ready}
      <div class="space-y-4">
        <div class="h-8 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"></div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {#each Array(5) as _}
            <div class="h-20 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"></div>
          {/each}
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {#each Array(6) as _}
            <div class="aspect-video animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
          {/each}
        </div>
      </div>
    {:else if sponsorQuery.current.status === 'error'}
      <div class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {sponsorQuery.current.error.message}
      </div>
    {:else}
      {@const data = sponsorQuery.current.data}
      {@const sponsor = data.sponsor}
      {@const stats = data.stats}
      {@const videos = data.videos}

      <section class="space-y-6">
        <article class="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
          <p class="text-xs font-semibold uppercase tracking-[0.15em] text-violet-600">{channelLabel} Sponsor</p>
          <h1 class="mt-1.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{sponsor.name}</h1>
          <p class="mt-1 text-sm text-neutral-400">Created {new Date(sponsor.createdAt).toLocaleDateString()}</p>

          <dl class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div class="rounded-lg border border-red-100 bg-red-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
              <dt class="text-xs font-medium uppercase tracking-wide text-red-400 dark:text-red-400">Total YT views</dt>
              <dd class="mt-1 text-lg font-semibold text-red-700 dark:text-red-400">{stats.totalViews.toLocaleString()}</dd>
            </div>
            <div class="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-400">Average views</dt>
              <dd class="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{stats.averageViews.toLocaleString()}</dd>
            </div>
            <div class="rounded-lg border border-sky-100 bg-sky-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
              <dt class="text-xs font-medium uppercase tracking-wide text-sky-500">Total X views</dt>
              <dd class="mt-1 text-lg font-semibold text-sky-700 dark:text-sky-400">
                {stats.totalXViews > 0 ? stats.totalXViews.toLocaleString() : 'N/A'}
              </dd>
            </div>
            <div class="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-400">Last published</dt>
              <dd class="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{daysSince(stats.lastPublishedAt)}</dd>
            </div>
            <div class="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
              <dt class="text-xs font-medium uppercase tracking-wide text-neutral-400">Best performing</dt>
              <dd class="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {#if stats.bestPerformingVideo}
                  {stats.bestPerformingVideo.viewCount.toLocaleString()} &mdash; {stats.bestPerformingVideo.title}
                {:else}
                  N/A
                {/if}
              </dd>
            </div>
          </dl>
        </article>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Showing
            <span class="font-medium text-neutral-900 dark:text-neutral-100">{videos.items.length}</span>
            of
            <span class="font-medium text-neutral-900 dark:text-neutral-100">{videos.pagination.total}</span>
            sponsor videos
          </p>

          <PaginationControls
            page={videos.pagination.page}
            totalPages={videos.pagination.totalPages}
            getHref={(nextPage) =>
              toHref(`/share/${encodeURIComponent(channel)}/sponsor/${encodeURIComponent(id)}`, {
                page: nextPage,
              })}
          />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {#each videos.items as video}
            <article class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                class="block overflow-hidden"
              >
                <img
                  src={toVercelImageHref(video.thumbnailUrl, { width: 640 })}
                  alt={video.title}
                  class="aspect-video w-full object-cover transition duration-200 hover:scale-[1.02]"
                  loading="lazy"
                />
              </a>

              <div class="p-4 pt-3.5">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block truncate text-sm font-medium text-neutral-900 transition-colors hover:text-violet-600 dark:text-neutral-100 dark:hover:text-violet-400"
                >
                  {video.title}
                </a>

                <p class="mt-1 text-xs text-neutral-400">
                  {new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  ({daysSince(video.publishedAt)})
                </p>

                <div class="mt-3 flex items-center gap-3.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span class="flex items-center gap-1">
                    <span class="font-medium text-neutral-900 dark:text-neutral-100">
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
                    <span class="font-medium text-neutral-900 dark:text-neutral-100">{formatCompactNumber(video.likeCount)}</span>
                  </span>
                </div>
              </div>
            </article>
          {/each}
        </div>

        {#if videos.pagination.totalPages > 1}
          <div class="flex justify-center">
            <PaginationControls
              page={videos.pagination.page}
              totalPages={videos.pagination.totalPages}
              getHref={(nextPage) =>
                toHref(`/share/${encodeURIComponent(channel)}/sponsor/${encodeURIComponent(id)}`, {
                  page: nextPage,
                })}
            />
          </div>
        {/if}
      </section>
    {/if}
  </div>
</main>
