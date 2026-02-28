<script lang="ts">
  import { page } from '$app/state'
  import ChannelVideoListContent from '@/components/channel/ChannelVideoListContent.svelte'
  import { parseDavisListSearch } from '@/features/davis/davis-search-params'
  import { getDavisVideos } from '@/remote/davis.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseDavisListSearch(Object.fromEntries(page.url.searchParams)))
</script>

<ChannelVideoListContent
  load={getDavisVideos(search)}
  {search}
  errorTitle="Unable to load Davis videos"
  listHref={(page) => toHref('/davis', { page, q: search.q })}
  videoHref={(videoId) => toHref(`/davis/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 })}
  sponsorHref={(slug) => toHref(`/davis/sponsor/${encodeURIComponent(slug)}`, { page: 1 })}
/>
