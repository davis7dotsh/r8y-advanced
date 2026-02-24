<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import VideoMetrics from '@/components/VideoMetrics.svelte'
  import { parseDavisSponsorSearch } from '@/features/davis/davis-search-params'
  import { getDavisSponsorDetails } from '@/remote/davis.remote'
  import { daysSince } from '@/utils/format'
  import { toHref } from '@/utils/url'

  const search = $derived(parseDavisSponsorSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')

  const sponsorQuery = $derived(
    getDavisSponsorDetails({
      slug: id,
      page: search.page,
      mentionsPage: search.mentionsPage,
    }),
  )
</script>

{#if sponsorQuery.error}
  <ErrorState title="Unable to load sponsor details" message={sponsorQuery.error.message ?? 'Unknown error'} />
{:else if !sponsorQuery.ready}
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
{:else if sponsorQuery.current.status === 'error'}
  <ErrorState title="Unable to load sponsor details" message={sponsorQuery.current.error.message} />
{:else}
  {@const data = sponsorQuery.current.data}
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
          toHref(`/davis/sponsor/${encodeURIComponent(id)}`, {
            page: nextPage,
            mentionsPage: search.mentionsPage,
          })}
      />
    </div>

    <div class="grid gap-3">
      {#each videos.items as video}
        <article
          class="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm md:grid-cols-[200px_1fr] dark:border-neutral-700 dark:bg-neutral-900"
        >
          <a
            href={toHref(`/davis/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })}
            class="block overflow-hidden rounded-lg"
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              class="h-full w-full object-cover transition duration-200 hover:scale-[1.02]"
              loading="lazy"
            />
          </a>

          <div class="space-y-2.5">
            <a
              href={toHref(`/davis/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })}
              class="font-medium text-neutral-900 transition-colors hover:text-violet-600 dark:text-neutral-100 dark:hover:text-violet-400"
            >
              {video.title}
            </a>

            <p class="text-xs text-neutral-400">{new Date(video.publishedAt).toLocaleString()}</p>

            <VideoMetrics
              viewCount={video.viewCount}
              likeCount={video.likeCount}
              commentCount={video.commentCount}
              xViews={video.xPost?.views}
            />
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
            toHref(`/davis/sponsor/${encodeURIComponent(id)}`, {
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
                  href={toHref(`/davis/video/${encodeURIComponent(comment.videoId)}`, { commentsPage: 1 })}
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
