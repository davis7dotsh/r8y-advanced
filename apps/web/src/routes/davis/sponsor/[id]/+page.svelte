<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import { parseDavisSponsorSearch } from '@/features/davis/davis-search-params'
  import { getDavisSponsorDetails } from '@/remote/davis.remote'
  import { daysSince, formatCompactNumber } from '@/utils/format'
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
    class="space-y-3 border border-border bg-card p-5"
    aria-live="polite"
    aria-busy="true"
  >
    <p class="text-sm text-muted-foreground">Loading...</p>
    <div class="space-y-2.5">
      <div class="h-4 w-2/3 animate-pulse bg-muted"></div>
      <div class="h-4 w-full animate-pulse bg-muted"></div>
      <div class="h-4 w-5/6 animate-pulse bg-muted"></div>
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
    <article class="border border-border bg-card p-5">
      <p class="text-xs font-semibold uppercase tracking-[0.15em] text-[#D62828] dark:text-red-400">Sponsor</p>
      <h2 class="mt-1.5 font-serif text-2xl font-bold tracking-tight text-foreground">{sponsor.name}</h2>
      <p class="mt-1 text-sm text-muted-foreground">Created {new Date(sponsor.createdAt).toLocaleDateString()}</p>

      <dl class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="border border-red-100 bg-red-50 p-3.5 dark:border-red-900 dark:bg-red-950">
          <dt class="text-xs font-medium uppercase tracking-wide text-red-400">Total YT views</dt>
          <dd class="mt-1 text-lg font-semibold text-red-700 dark:text-red-400">{stats.totalViews.toLocaleString()}</dd>
        </div>
        <div class="border border-border bg-muted/50 p-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average views</dt>
          <dd class="mt-1 text-lg font-semibold text-foreground">{stats.averageViews.toLocaleString()}</dd>
        </div>
        <div class="border border-sky-100 bg-sky-50 p-3.5 dark:border-sky-900 dark:bg-sky-950">
          <dt class="text-xs font-medium uppercase tracking-wide text-sky-500">Total X views</dt>
          <dd class="mt-1 text-lg font-semibold text-sky-700 dark:text-sky-400">
            {stats.totalXViews > 0 ? stats.totalXViews.toLocaleString() : 'N/A'}
          </dd>
        </div>
        <div class="border border-border bg-muted/50 p-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last published</dt>
          <dd class="mt-1 text-sm font-semibold text-foreground">{daysSince(stats.lastPublishedAt)}</dd>
        </div>
        <div class="border border-border bg-muted/50 p-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best performing</dt>
          <dd class="mt-1 text-sm font-semibold text-foreground">
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
      <p class="text-sm text-muted-foreground">
        Showing
        <span class="font-medium text-foreground">{videos.items.length}</span>
        of
        <span class="font-medium text-foreground">{videos.pagination.total}</span>
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

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {#each videos.items as video}
        <article class="overflow-hidden border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <a href={toHref(`/davis/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="block overflow-hidden">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              class="aspect-video w-full object-cover transition duration-200 hover:scale-[1.02]"
              loading="lazy"
            />
          </a>

          <div class="p-4 pt-3.5">
            <a
              href={toHref(`/davis/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })}
              class="block truncate text-sm font-medium transition-colors hover:text-[#D62828] dark:hover:text-red-400"
            >
              {video.title}
            </a>

            <p class="mt-1 text-xs text-muted-foreground">
              {new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              ({daysSince(video.publishedAt)})
            </p>

            <div class="mt-3 flex items-center gap-3.5 text-xs text-muted-foreground">
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

    <section class="border border-border bg-card p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-serif text-lg font-semibold text-foreground">Sponsor mentions</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">
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
        <p class="text-sm text-muted-foreground">No sponsor mentions found.</p>
      {:else}
        <div class="space-y-2">
          {#each mentions.items as comment}
            <article class="border border-border bg-muted/50 p-3.5">
              <div class="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span class="font-medium text-foreground">{comment.author}</span>
                <span class="text-border">&middot;</span>
                <a
                  href={toHref(`/davis/video/${encodeURIComponent(comment.videoId)}`, { commentsPage: 1 })}
                  class="text-[#D62828] hover:underline dark:text-red-400"
                >
                  {comment.videoTitle}
                </a>
                <span class="text-border">&middot;</span>
                <span>{new Date(comment.publishedAt).toLocaleString()}</span>
                <span class="text-border">&middot;</span>
                <span>{comment.likeCount.toLocaleString()} likes</span>
                <span class="text-border">&middot;</span>
                <span>{comment.replyCount.toLocaleString()} replies</span>
              </div>
              <p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{comment.text}</p>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </section>
{/if}
