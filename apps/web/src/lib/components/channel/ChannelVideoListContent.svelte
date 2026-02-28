<script lang="ts">
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import VideoCard from '@/components/channel/VideoCard.svelte'

  type ListPayload =
    | {
        status: 'ok'
        data: {
          items: Array<{
            videoId: string
            title: string
            thumbnailUrl: string
            viewCount: number
            likeCount: number
            xPost?: {
              views?: number | null
            } | null
            sponsors: Array<{
              slug: string
              name: string
            }>
          }>
          pagination: {
            page: number
            total: number
            totalPages: number
          }
        }
      }
    | {
        status: 'error'
        error: {
          message: string
        }
      }

  let {
    load,
    search,
    errorTitle,
    listHref,
    videoHref,
    sponsorHref,
  } = $props<{
    load: Promise<ListPayload>
    search: {
      q?: string
    }
    errorTitle: string
    listHref: (page: number) => string
    videoHref: (videoId: string) => string
    sponsorHref: (slug: string) => string
  }>()
</script>

<svelte:boundary>
  {#snippet pending()}
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
  {/snippet}

  {#snippet failed(error, _reset)}
    <ErrorState
      title={errorTitle}
      message={error instanceof Error ? error.message : 'Unknown error'}
    />
  {/snippet}

  {@const payload = await load}
  {#if payload.status === 'error'}
    <ErrorState title={errorTitle} message={payload.error.message} />
  {:else}
    {@const items = payload.data.items}
    {@const pagination = payload.data.pagination}

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
          getHref={listHref}
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {#each items as video}
          <VideoCard
            title={video.title}
            thumbnailUrl={video.thumbnailUrl}
            viewCount={video.viewCount}
            likeCount={video.likeCount}
            xViews={video.xPost?.views ?? null}
            videoHref={videoHref(video.videoId)}
            sponsorLinks={video.sponsors.map((sponsor) => ({
              href: sponsorHref(sponsor.slug),
              name: sponsor.name,
            }))}
          />
        {/each}
      </div>
    </section>
  {/if}
</svelte:boundary>
