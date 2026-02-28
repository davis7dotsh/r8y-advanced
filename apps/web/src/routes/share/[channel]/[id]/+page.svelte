<script lang="ts">
  import { page } from '$app/state'
  import { getShareVideo } from '@/remote/share.remote'
  import { daysSince, formatMetric } from '@/utils/format'
  import { toVercelImageHref } from '@/utils/url'

  const params = $derived(page.params as Record<string, string>)
  const channel = $derived(params.channel ?? '')
  const id = $derived(params.id ?? '')
  const channelLabel = $derived(
    channel === 'davis'
      ? 'Davis'
      : channel === 'theo'
        ? 'Theo'
        : channel === 'micky'
          ? 'Micky'
          : channel,
  )

  const videoQuery = $derived(getShareVideo({ channel, videoId: id }))
</script>

<svelte:head>
  {#if videoQuery.ready && videoQuery.current.status === 'ok'}
    <title>{videoQuery.current.data.title}</title>
  {:else}
    <title>Video Share</title>
  {/if}
</svelte:head>

<main class="min-h-screen bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6">
  <div class="mx-auto max-w-xl">
    {#if videoQuery.error}
      <div class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Unable to load video.
      </div>
    {:else if !videoQuery.ready}
      <div class="space-y-4">
        <div class="aspect-video w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
        <div class="h-5 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"></div>
        <div class="h-4 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-neutral-700"></div>
      </div>
    {:else if videoQuery.current.status === 'error'}
      <div class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {videoQuery.current.error.message}
      </div>
    {:else}
      {@const video = videoQuery.current.data}

      <article class="space-y-5">
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          class="group block"
        >
          <img
            src={toVercelImageHref(video.thumbnailUrl, { width: 1200 })}
            alt={video.title}
            class="aspect-video w-full rounded-xl object-cover shadow-sm transition-opacity group-hover:opacity-90"
          />
        </a>

        <div class="space-y-1">
          <p class="text-xs font-medium uppercase tracking-wide text-neutral-400">{channelLabel}</p>
          <h1 class="text-xl font-bold leading-snug tracking-tight text-neutral-900 dark:text-neutral-100">
            {video.title}
          </h1>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm text-neutral-400">
              {new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              • Posted {daysSince(video.publishedAt)}
            </p>
            {#each video.sponsors as sponsor}
              <a
                href={`/share/${encodeURIComponent(channel)}/sponsor/${encodeURIComponent(sponsor.slug)}`}
                class="border border-[#D62828]/20 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#D62828] transition-colors hover:bg-red-100 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
              >
                {sponsor.name}
              </a>
            {/each}
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {(video.viewCount + (video.xPost?.views ?? 0)).toLocaleString()}
            </span>
            <span class="text-sm text-neutral-400">total views</span>
          </div>

          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
                <svg class="size-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400">YouTube</p>
                <div class="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm">
                  <span>
                    <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.viewCount)}</span>
                    <span class="ml-1 text-neutral-400">views</span>
                  </span>
                  <span>
                    <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.likeCount)}</span>
                    <span class="ml-1 text-neutral-400">likes</span>
                  </span>
                  <span>
                    <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.commentCount)}</span>
                    <span class="ml-1 text-neutral-400">comments</span>
                  </span>
                </div>
              </div>
            </div>
            <svg class="size-4 shrink-0 text-neutral-300 dark:text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17L17 7M17 7H7M17 7v10" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>

          {#if video.xPost}
            <a
              href={video.xPost.url}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              <div class="flex items-center gap-3">
                <div class="flex size-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <svg class="size-4 text-neutral-800 dark:text-neutral-200" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400">X (Twitter)</p>
                  <div class="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm">
                    <span>
                      <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.xPost.views)}</span>
                      <span class="ml-1 text-neutral-400">views</span>
                    </span>
                    <span>
                      <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.xPost.likes)}</span>
                      <span class="ml-1 text-neutral-400">likes</span>
                    </span>
                    <span>
                      <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.xPost.reposts)}</span>
                      <span class="ml-1 text-neutral-400">reposts</span>
                    </span>
                    <span>
                      <span class="font-semibold text-neutral-900 dark:text-neutral-100">{formatMetric(video.xPost.comments)}</span>
                      <span class="ml-1 text-neutral-400">replies</span>
                    </span>
                  </div>
                </div>
              </div>
              <svg class="size-4 shrink-0 text-neutral-300 dark:text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 17L17 7M17 7H7M17 7v10" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          {/if}
        </div>
      </article>
    {/if}
  </div>
</main>
