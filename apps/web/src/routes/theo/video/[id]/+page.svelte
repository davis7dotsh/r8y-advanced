<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import VideoMetrics from '@/components/VideoMetrics.svelte'
  import {
    parseTheoVideoSearch,
    type CommentsFilter,
    type CommentsSort,
  } from '@/features/theo/theo-search-params'
  import { getTheoVideoDetails, linkTheoVideoToXPost } from '@/remote/theo.remote'
  import { formatMetric } from '@/utils/format'
  import { toHref } from '@/utils/url'

  const FILTER_OPTIONS: { value: CommentsFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'isQuestion', label: 'Questions' },
    { value: 'isPositiveComment', label: 'Positive' },
    { value: 'isSponsorMention', label: 'Sponsor mentions' },
    { value: 'isEditingMistake', label: 'Editing mistakes' },
  ]

  const SORT_OPTIONS: { value: CommentsSort; label: string }[] = [
    { value: 'likeCount', label: 'Most liked' },
    { value: 'publishedAt', label: 'Newest' },
  ]

  const URL_REGEX = /https?:\/\/[^\s)>]+/g

  const search = $derived(parseTheoVideoSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')

  const videoQuery = $derived(
    getTheoVideoDetails({
      videoId: id,
      commentsPage: search.commentsPage,
      commentsSort: search.commentsSort,
      commentsFilter: search.commentsFilter,
    }),
  )

  let xPostUrlInput = $state('')
  let xPostSaveError = $state<string | null>(null)

  const linkified = $derived.by(() => {
    if (!videoQuery.ready || videoQuery.error) {
      return [] as Array<{ type: 'text' | 'link'; value: string }>
    }

    const text = videoQuery.current.status === 'ok' ? videoQuery.current.data.video.description : ''
    const parts: Array<{ type: 'text' | 'link'; value: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    URL_REGEX.lastIndex = 0

    while ((match = URL_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          value: text.slice(lastIndex, match.index),
        })
      }

      const url = match[0]
      parts.push({
        type: 'link',
        value: url,
      })

      lastIndex = match.index + url.length
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        value: text.slice(lastIndex),
      })
    }

    return parts
  })

  $effect(() => {
    if (!videoQuery.ready || videoQuery.error || videoQuery.current.status !== 'ok') {
      return
    }

    xPostUrlInput = videoQuery.current.data.video.xPost?.url ?? ''
    xPostSaveError = null
  })

  const syncXPost = async (xPostUrl: string) => {
    xPostSaveError = null

    const result = await linkTheoVideoToXPost({
      videoId: id,
      xPostUrl,
    }).updates(videoQuery)

    if (result.status === 'error') {
      xPostSaveError = result.error.message
    }
  }
</script>

{#if videoQuery.error}
  <ErrorState title="Unable to load video details" message={videoQuery.error.message ?? 'Unknown error'} />
{:else if !videoQuery.ready}
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
{:else if videoQuery.current.status === 'error'}
  <ErrorState title="Unable to load video details" message={videoQuery.current.error.message} />
{:else}
  {@const data = videoQuery.current.data}
  {@const video = data.video}
  {@const comments = data.comments}

  <section class="space-y-6">
    <article class="grid gap-6 border border-border bg-card p-5 lg:grid-cols-[320px_1fr]">
      <img src={video.thumbnailUrl} alt={video.title} class="aspect-video w-full object-cover" />

      <div class="space-y-4">
        <div>
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-[#D62828] hover:underline dark:hover:text-red-400"
              >
                {video.title}
              </a>
            </h2>
            <a
              href={`/share/theo/${encodeURIComponent(video.videoId)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Share"
              class="mt-1 shrink-0 p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </a>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">Published {new Date(video.publishedAt).toLocaleString()}</p>
        </div>

        <VideoMetrics
          viewCount={video.viewCount}
          likeCount={video.likeCount}
          commentCount={video.commentCount}
          xViews={video.xPost?.views}
        />

        <form
          class="space-y-2 border border-border p-3"
          onsubmit={async (event) => {
            event.preventDefault()
            await syncXPost(xPostUrlInput)
          }}
        >
          <label for="theo-x-post-url" class="block text-sm font-medium text-foreground">
            Link X Post
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <input
              id="theo-x-post-url"
              type="url"
              bind:value={xPostUrlInput}
              placeholder="https://x.com/.../status/123"
              class="min-w-[220px] flex-1 border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-1 focus:ring-foreground/20"
            />
            <button
              type="submit"
              disabled={linkTheoVideoToXPost.pending > 0}
              class="border border-foreground bg-foreground px-3 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {linkTheoVideoToXPost.pending > 0 ? 'Saving...' : 'Save'}
            </button>
            {#if video.xPost?.url}
              <button
                type="button"
                disabled={linkTheoVideoToXPost.pending > 0}
                onclick={() => syncXPost(video.xPost?.url ?? '')}
                class="border border-sky-400 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/60"
              >
                {linkTheoVideoToXPost.pending > 0 ? 'Refreshing...' : 'Refresh data'}
              </button>
            {/if}
          </div>
          {#if xPostSaveError}
            <p class="text-xs text-red-600">{xPostSaveError}</p>
          {/if}
        </form>

        {#if video.xPost}
          <div class="border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
            <p class="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">Linked X Post</p>
            <a
              href={video.xPost.url}
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 block break-all text-sm text-sky-700 hover:underline dark:text-sky-400"
            >
              {video.xPost.url}
            </a>
            <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-sky-900 dark:text-sky-200">
              <span>Views: {formatMetric(video.xPost.views)}</span>
              <span>Likes: {formatMetric(video.xPost.likes)}</span>
              <span>Reposts: {formatMetric(video.xPost.reposts)}</span>
              <span>Comments: {formatMetric(video.xPost.comments)}</span>
            </div>
          </div>
        {/if}

        <div class="flex flex-wrap gap-1.5">
          {#if video.sponsors.length > 0}
            {#each video.sponsors as sponsor}
              <a
                href={toHref(`/theo/sponsor/${encodeURIComponent(sponsor.slug)}`, { page: 1 })}
                class="border border-[#D62828]/20 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#D62828] transition-colors hover:bg-red-100 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
              >
                {sponsor.name}
              </a>
            {/each}
          {:else}
            <span class="border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              No sponsor
            </span>
          {/if}
        </div>

        <p class="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {#each linkified as part}
            {#if part.type === 'link'}
              <a
                href={part.value}
                target="_blank"
                rel="noopener noreferrer"
                class="break-all text-[#D62828] hover:underline dark:text-red-400"
              >
                {part.value}
              </a>
            {:else}
              {part.value}
            {/if}
          {/each}
        </p>
      </div>
    </article>

    <section class="border border-border bg-card p-5">
      <div class="mb-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-serif text-lg font-semibold text-foreground">Comments</h3>

          <div class="flex items-center gap-1 border border-border p-0.5">
            {#each SORT_OPTIONS as option}
              <a
                href={toHref(`/theo/video/${encodeURIComponent(id)}`, {
                  commentsPage: 1,
                  commentsSort: option.value,
                  commentsFilter: search.commentsFilter,
                })}
                class={`px-3 py-1 text-xs font-medium transition-colors ${
                  search.commentsSort === option.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </a>
            {/each}
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">
          {#each FILTER_OPTIONS as option}
            <a
              href={toHref(`/theo/video/${encodeURIComponent(id)}`, {
                commentsPage: 1,
                commentsSort: search.commentsSort,
                commentsFilter: option.value,
              })}
              class={`border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                search.commentsFilter === option.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {option.label}
            </a>
          {/each}
        </div>
      </div>

      <PaginationControls
        page={comments.pagination.page}
        totalPages={comments.pagination.totalPages}
        className="mb-4 flex items-center justify-end gap-2 text-sm"
        getHref={(nextPage) =>
          toHref(`/theo/video/${encodeURIComponent(id)}`, {
            commentsPage: nextPage,
            commentsSort: search.commentsSort,
            commentsFilter: search.commentsFilter,
          })}
      />

      <div class="space-y-2">
        {#each comments.items as comment}
          <article class="border border-border bg-muted/50 p-3.5">
            <div class="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span class="font-medium text-foreground">{comment.author}</span>
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
    </section>
  </section>
{/if}
