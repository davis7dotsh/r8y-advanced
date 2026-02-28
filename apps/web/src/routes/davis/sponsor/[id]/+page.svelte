<script lang="ts">
  import { page } from '$app/state'
  import ChannelSponsorDetailContent from '@/components/channel/ChannelSponsorDetailContent.svelte'
  import { parseDavisSponsorSearch } from '@/features/davis/davis-search-params'
  import { getDavisSponsorDetails } from '@/remote/davis.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseDavisSponsorSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')
</script>

<ChannelSponsorDetailContent
  load={getDavisSponsorDetails({
    slug: id,
    page: search.page,
    mentionsPage: search.mentionsPage,
  })}
  sponsorLabel="Sponsor"
  videoHref={(videoId) => toHref(`/davis/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 })}
  videoPageHref={(page) =>
    toHref(`/davis/sponsor/${encodeURIComponent(id)}`, {
      page,
      mentionsPage: search.mentionsPage,
    })}
  mentionsPageHref={(mentionsPage) =>
    toHref(`/davis/sponsor/${encodeURIComponent(id)}`, {
      page: search.page,
      mentionsPage,
    })}
/>
