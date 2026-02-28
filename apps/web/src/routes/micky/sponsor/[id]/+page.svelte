<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import { parseMickySponsorSearch } from '@/features/micky/micky-search-params'
  import { getMickySponsorDetails } from '@/remote/micky.remote'
  import { daysSince, formatCompactNumber } from '@/utils/format'
  import { toHref, toVercelImageHref } from '@/utils/url'

  const search = $derived(parseMickySponsorSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')
</script>

<svelte:boundary>
  {#snippet pending()}
    <section
      class="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
      aria-live="polite"
      aria-busy="true"
    >
      <p class="text-sm text-neutral-500">Loading...</p>
      <div class="space-y-2.5">
        <div class="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
        <div class="h-4 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800"></div>
        <div class="h-4 w-5/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800"></div>
      </div>
    </section>
  {/snippet}

  {#snippet failed(error, _reset)}
    <ErrorState
      title="Unable to load sponsor details"
      message={error instanceof Error ? error.message : 'Unknown error'}
    />
  {/snippet}

  {@const payload = await getMickySponsorDetails({
    slug: id,
    page: search.page,
    mentionsPage: search.mentionsPage,
  })}
  {#if payload.status === 'error'}
    <ErrorState title="Unable to load sponsor details" message={payload.error.message} />
  {:else}
    {@const data = payload.data}
    {@const sponsor = data.sponsor}
    {@const stats = data.stats}
    {@const videos = data.videos}
    {@const mentions = data.sponsorMentions}

    <section class="space-y-6">
      <article class="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-violet-600">Sponsor</p>
        <h2 class="mt-1.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{sponsor.name}</h2>
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
        <p class="text-sm text-neutral-500">
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
            toHref(`/micky/sponsor/${encodeURIComponent(id)}`, {
              page: nextPage,
              mentionsPage: search.mentionsPage,
            })}
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {#each videos.items as video}
          <article class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
            <a href={toHref(`/micky/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="block overflow-hidden">
              <img
                src={toVercelImageHref(video.thumbnailUrl, { width: 640 })}
                alt={video.title}
                class="aspect-video w-full object-cover transition duration-200 hover:scale-[1.02]"
                loading="lazy"
              />
            </a>

            <div class="p-4 pt-3.5">
              <a
                href={toHref(`/micky/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })}
                class="block truncate text-sm font-medium transition-colors hover:text-violet-600"
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

      <section class="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Sponsor mentions</h3>
            <p class="mt-0.5 text-xs text-neutral-400">
              {mentions.pagination.total.toLocaleString()} comments mentioning this sponsor, sorted by most liked
            </p>
          </div>

          <PaginationControls
            page={mentions.pagination.page}
            totalPages={mentions.pagination.totalPages}
            getHref={(nextPage) =>
              toHref(`/micky/sponsor/${encodeURIComponent(id)}`, {
                page: search.page,
                mentionsPage: nextPage,
              })}
          />
        </div>

        {#if mentions.items.length === 0}
          <p class="text-sm text-neutral-400">No sponsor mentions found.</p>
        {:else}
          <div class="space-y-2">
            {#each mentions.items as comment}
              <article class="rounded-lg border border-neutral-100 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
                <div class="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  <span class="font-medium text-neutral-700 dark:text-neutral-300">{comment.author}</span>
                  <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <a
                    href={toHref(`/micky/video/${encodeURIComponent(comment.videoId)}`, { commentsPage: 1 })}
                    class="text-violet-600 hover:underline"
                  >
                    {comment.videoTitle}
                  </a>
                  <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>{new Date(comment.publishedAt).toLocaleString()}</span>
                  <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>{comment.likeCount.toLocaleString()} likes</span>
                  <span class="text-neutral-300 dark:text-neutral-600">&middot;</span>
                  <span>{comment.replyCount.toLocaleString()} replies</span>
                </div>
                <p class="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{comment.text}</p>
              </article>
            {/each}
          </div>
        {/if}
      </section>
    </section>
  {/if}
</svelte:boundary>
