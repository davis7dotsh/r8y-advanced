<script lang="ts">
  import { page } from '$app/state'
  import ChannelSponsorDetailContent from '@/components/channel/ChannelSponsorDetailContent.svelte'
  import { parseTheoSponsorSearch } from '@/features/theo/theo-search-params'
  import { getTheoSponsorDetails } from '@/remote/theo.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseTheoSponsorSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')
</script>

<ChannelSponsorDetailContent
  load={getTheoSponsorDetails({
    slug: id,
    page: search.page,
    mentionsPage: search.mentionsPage,
  })}
  sponsorLabel="Sponsor"
  videoHref={(videoId) => toHref(`/theo/video/${encodeURIComponent(videoId)}`, { commentsPage: 1 })}
  videoPageHref={(page) =>
    toHref(`/theo/sponsor/${encodeURIComponent(id)}`, {
      page,
      mentionsPage: search.mentionsPage,
    })}
  mentionsPageHref={(mentionsPage) =>
    toHref(`/theo/sponsor/${encodeURIComponent(id)}`, {
      page: search.page,
      mentionsPage,
    })}
/>
