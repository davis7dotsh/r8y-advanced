<script lang="ts">
  import { page } from '$app/state'
  import ChannelVideoListContent from '@/components/channel/ChannelVideoListContent.svelte'
  import { parseMickyListSearch } from '@/features/micky/micky-search-params'
  import { getMickyVideos } from '@/remote/micky.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseMickyListSearch(Object.fromEntries(page.url.searchParams)))
</script>

<ChannelVideoListContent
  load={getMickyVideos(search)}
  {search}
  errorTitle="Unable to load Micky videos"
  listHref={(page) => toHref('/micky', { page, q: search.q })}
  videoHref={(videoId) => toHref(`/micky/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 })}
  sponsorHref={(slug) => toHref(`/micky/sponsor/${encodeURIComponent(slug)}`, { page: 1 })}
/>
