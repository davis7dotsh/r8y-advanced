<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { getDavisSearchSuggestions } from '@/remote/davis.remote'
  import { getTheoSearchSuggestions } from '@/remote/theo.remote'
  import { toHref } from '@/utils/url'

  type SearchResults = {
    videos: { videoId: string; title: string }[]
    sponsors: { sponsorId: string; name: string; slug: string }[]
  }

  type Suggestion =
    | {
        type: 'video'
        key: string
        label: string
        videoId: string
      }
    | {
        type: 'sponsor'
        key: string
        label: string
        slug: string
      }

  const emptyResults: SearchResults = {
    videos: [],
    sponsors: [],
  }

  let { open, onOpenChange } = $props<{
    open: boolean
    onOpenChange: (open: boolean) => void
  }>()

  let query = $state('')
  let debouncedQuery = $state('')
  let isLoading = $state(false)
  let errorMessage = $state('')
  let activeIndex = $state(-1)
  let results = $state<SearchResults>(emptyResults)
  let searchInput = $state<HTMLInputElement | null>(null)

  const channel = $derived(
    page.url.pathname.startsWith('/davis')
      ? 'davis'
      : page.url.pathname.startsWith('/theo')
        ? 'theo'
        : null,
  )

  const flattened = $derived(
    [
      ...results.videos.map(
        (video) =>
          ({
            type: 'video',
            key: `video:${video.videoId}`,
            label: video.title,
            videoId: video.videoId,
          }) satisfies Suggestion,
      ),
      ...results.sponsors.map(
        (sponsor) =>
          ({
            type: 'sponsor',
            key: `sponsor:${sponsor.sponsorId}`,
            label: sponsor.name,
            slug: sponsor.slug,
          }) satisfies Suggestion,
      ),
    ] as Suggestion[],
  )

  const close = () => {
    onOpenChange(false)
    query = ''
    debouncedQuery = ''
    errorMessage = ''
    activeIndex = -1
    results = emptyResults
  }

  const openChannel = async (next: 'theo' | 'davis') => {
    await goto(toHref(`/${next}`, { page: 1 }))
    close()
  }

  const goToSuggestion = async (suggestion: Suggestion) => {
    if (suggestion.type === 'video') {
      await goto(toHref(`/${channel}/video/${encodeURIComponent(suggestion.videoId)}`, {
        commentsPage: 1,
      }))
      close()
      return
    }

    await goto(toHref(`/${channel}/sponsor/${encodeURIComponent(suggestion.slug)}`, { page: 1 }))
    close()
  }

  $effect(() => {
    const timer = setTimeout(() => {
      debouncedQuery = query
    }, 180)

    return () => clearTimeout(timer)
  })

  $effect(() => {
    if (!open) {
      return
    }

    const timer = setTimeout(() => searchInput?.focus(), 0)
    return () => clearTimeout(timer)
  })

  $effect(() => {
    const q = debouncedQuery.trim()

    if (!open || !channel || q.length < 2) {
      isLoading = false
      errorMessage = ''
      results = emptyResults
      activeIndex = -1
      return
    }

    let cancelled = false
    isLoading = true
    errorMessage = ''

    const searchFn = channel === 'davis' ? getDavisSearchSuggestions : getTheoSearchSuggestions

    searchFn({ q })
      .then((result) => {
        if (cancelled) {
          return
        }

        if (result.status === 'ok') {
          results = result.data
          errorMessage = ''
          activeIndex = -1
          return
        }

        errorMessage = result.error.message || 'Unable to load search results.'
        results = emptyResults
        activeIndex = -1
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        errorMessage = 'Unable to load search results.'
        results = emptyResults
        activeIndex = -1
      })
      .finally(() => {
        if (!cancelled) {
          isLoading = false
        }
      })

    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    if (!open) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh]" role="dialog" aria-modal="true">
    <div class="w-full max-w-xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
      <div class="border-b border-neutral-200 px-3 dark:border-neutral-700">
        <input
          bind:this={searchInput}
          type="search"
          value={query}
          oninput={(event) => {
            query = event.currentTarget.value
          }}
          onkeydown={async (event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              activeIndex = Math.min(activeIndex + 1, flattened.length - 1)
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              activeIndex = Math.max(activeIndex - 1, 0)
            }

            if (event.key === 'Enter' && activeIndex >= 0) {
              event.preventDefault()
              const current = flattened[activeIndex]
              if (current) {
                await goToSuggestion(current)
              }
            }
          }}
          placeholder="Search videos, sponsors..."
          class="h-12 w-full border-none bg-transparent px-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          aria-label="Search videos and sponsors"
        />
      </div>

      <div class="max-h-[420px] overflow-y-auto p-1.5">
        {#if query.length === 0}
          <div class="p-1.5">
            <div class="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Channels
            </div>
            <button
              type="button"
              class="w-full rounded-md px-2.5 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onclick={() => openChannel('theo')}
            >
              Theo's Channel
            </button>
            <button
              type="button"
              class="w-full rounded-md px-2.5 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onclick={() => openChannel('davis')}
            >
              Davis's Channel
            </button>
          </div>
        {:else if isLoading}
          <div class="px-4 py-3 text-sm text-neutral-400">Searching...</div>
        {:else if errorMessage}
          <div class="px-4 py-3 text-sm text-red-500 dark:text-red-400">{errorMessage}</div>
        {:else if flattened.length === 0}
          <div class="px-4 py-3 text-sm text-neutral-400">No results found.</div>
        {:else}
          {#if results.videos.length > 0}
            <div class="border-b border-neutral-100 p-1.5 dark:border-neutral-800">
              <div class="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Videos
              </div>
              {#each results.videos as video}
                {@const key = `video:${video.videoId}`}
                {@const index = flattened.findIndex((item) => item.key === key)}
                <button
                  type="button"
                  onmousedown={(event) => event.preventDefault()}
                  onclick={() =>
                    goToSuggestion({
                      type: 'video',
                      key,
                      label: video.title,
                      videoId: video.videoId,
                    })}
                  class={`w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                    index === activeIndex
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {video.title}
                </button>
              {/each}
            </div>
          {/if}

          {#if results.sponsors.length > 0}
            <div class="p-1.5">
              <div class="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Sponsors
              </div>
              {#each results.sponsors as sponsor}
                {@const key = `sponsor:${sponsor.sponsorId}`}
                {@const index = flattened.findIndex((item) => item.key === key)}
                <button
                  type="button"
                  onmousedown={(event) => event.preventDefault()}
                  onclick={() =>
                    goToSuggestion({
                      type: 'sponsor',
                      key,
                      label: sponsor.name,
                      slug: sponsor.slug,
                    })}
                  class={`w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                    index === activeIndex
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {sponsor.name}
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <button
      type="button"
      class="fixed inset-0 -z-10"
      aria-label="Close search"
      onclick={close}
    ></button>
  </div>
{/if}
