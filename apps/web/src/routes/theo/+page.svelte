<script lang="ts">
  import { page } from '$app/state'
  import ChannelVideoListContent from '@/components/channel/ChannelVideoListContent.svelte'
  import { parseTheoListSearch } from '@/features/theo/theo-search-params'
  import { getTheoVideos } from '@/remote/theo.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseTheoListSearch(Object.fromEntries(page.url.searchParams)))
</script>

<ChannelVideoListContent
  load={getTheoVideos(search)}
  {search}
  errorTitle="Unable to load Theo videos"
  listHref={(page) => toHref('/theo', { page, q: search.q })}
  videoHref={(videoId) => toHref(`/theo/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 })}
  sponsorHref={(slug) => toHref(`/theo/sponsor/${encodeURIComponent(slug)}`, { page: 1 })}
/>
