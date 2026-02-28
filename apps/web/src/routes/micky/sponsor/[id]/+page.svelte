<script lang="ts">
  import { page } from '$app/state'
  import ChannelSponsorDetailContent from '@/components/channel/ChannelSponsorDetailContent.svelte'
  import { parseMickySponsorSearch } from '@/features/micky/micky-search-params'
  import { getMickySponsorDetails } from '@/remote/micky.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseMickySponsorSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')
</script>

<ChannelSponsorDetailContent
  load={getMickySponsorDetails({
    slug: id,
    page: search.page,
    mentionsPage: search.mentionsPage,
  })}
  sponsorLabel="Sponsor"
  videoHref={(videoId) => toHref(`/micky/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 })}
  videoPageHref={(page) =>
    toHref(`/micky/sponsor/${encodeURIComponent(id)}`, {
      page,
      mentionsPage: search.mentionsPage,
    })}
  mentionsPageHref={(mentionsPage) =>
    toHref(`/micky/sponsor/${encodeURIComponent(id)}`, {
      page: search.page,
      mentionsPage,
    })}
/>
