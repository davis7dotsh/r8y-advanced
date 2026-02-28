<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
  import PlayIcon from '@lucide/svelte/icons/play'
  import MegaphoneIcon from '@lucide/svelte/icons/megaphone'
  import { getDavisSearchSuggestions } from '@/remote/davis.remote'
  import { getTheoSearchSuggestions } from '@/remote/theo.remote'
  import { toHref } from '@/utils/url'
  import * as Command from '@/components/ui/command/index.js'

  type SearchResults = {
    videos: { videoId: string; title: string }[]
    sponsors: { sponsorId: string; name: string; slug: string }[]
  }

  const emptyResults: SearchResults = { videos: [], sponsors: [] }

  let { open = $bindable(false) } = $props<{ open: boolean }>()

  let inputValue = $state('')
  let debouncedQuery = $state('')
  let isLoading = $state(false)
  let results = $state<SearchResults>(emptyResults)

  const channel = $derived(
    page.url.pathname.startsWith('/davis')
      ? 'davis'
      : page.url.pathname.startsWith('/theo')
        ? 'theo'
        : null,
  )

  const showChannelPicker = $derived(inputValue.trim().length === 0)
  const hasResults = $derived(
    results.videos.length > 0 || results.sponsors.length > 0,
  )

  const openChannel = async (next: 'theo' | 'davis') => {
    await goto(toHref(`/${next}`, { page: 1 }))
    open = false
    inputValue = ''
  }

  const goToVideo = async (videoId: string) => {
    await goto(toHref(`/${channel}/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 }))
    open = false
    inputValue = ''
  }

  const goToSponsor = async (slug: string) => {
    await goto(toHref(`/${channel}/sponsor/${encodeURIComponent(slug)}`, { page: 1 }))
    open = false
    inputValue = ''
  }

  $effect(() => {
    const nextQuery = inputValue
    const timer = setTimeout(() => {
      debouncedQuery = nextQuery
    }, 180)
    return () => clearTimeout(timer)
  })

  $effect(() => {
    const q = debouncedQuery.trim()

    if (!open || !channel || q.length < 2) {
      results = emptyResults
      isLoading = false
      return
    }

    let cancelled = false
    isLoading = true

    const searchFn = channel === 'davis' ? getDavisSearchSuggestions : getTheoSearchSuggestions

    searchFn({ q })
      .then((result) => {
        if (cancelled) return
        if (result.status === 'ok') {
          results = result.data
        } else {
          results = emptyResults
        }
      })
      .catch(() => {
        if (!cancelled) results = emptyResults
      })
      .finally(() => {
        if (!cancelled) isLoading = false
      })

    return () => {
      cancelled = true
    }
  })
</script>

<Command.Dialog
  bind:open
  shouldFilter={false}
  onOpenChange={(next) => {
    open = next
    if (!next) {
      inputValue = ''
      debouncedQuery = ''
      results = emptyResults
      isLoading = false
    }
  }}
  title="Search"
  description="Search videos and sponsors"
>
  <Command.Input
    value={inputValue}
    oninput={(event: Event) => {
      inputValue = (event.currentTarget as HTMLInputElement | null)?.value ?? ''
    }}
    placeholder="Search videos, sponsors..."
  />
  <Command.List class="min-h-[300px]">
    {#if showChannelPicker}
      <Command.Group heading="Channels">
        <Command.Item onSelect={() => openChannel('theo')}>
          <ArrowRightIcon />
          <span>Theo's Channel</span>
        </Command.Item>
        <Command.Item onSelect={() => openChannel('davis')}>
          <ArrowRightIcon />
          <span>Davis's Channel</span>
        </Command.Item>
      </Command.Group>
    {:else if !hasResults && !isLoading}
      <Command.Empty>No results found.</Command.Empty>
    {:else}
      {#if results.videos.length > 0}
        <Command.Group heading="Videos">
          {#each results.videos as video (video.videoId)}
            <Command.Item value={video.videoId} onSelect={() => goToVideo(video.videoId)}>
              <PlayIcon />
              <span>{video.title}</span>
            </Command.Item>
          {/each}
        </Command.Group>
      {/if}
      {#if results.sponsors.length > 0}
        <Command.Separator />
        <Command.Group heading="Sponsors">
          {#each results.sponsors as sponsor (sponsor.sponsorId)}
            <Command.Item value={sponsor.sponsorId} onSelect={() => goToSponsor(sponsor.slug)}>
              <MegaphoneIcon />
              <span>{sponsor.name}</span>
            </Command.Item>
          {/each}
        </Command.Group>
      {/if}
    {/if}
  </Command.List>
</Command.Dialog>
