<script lang="ts">
  import { page } from '$app/state'
  import ChannelSponsorDetailContent from '@/components/channel/ChannelSponsorDetailContent.svelte'
  import { getShareSponsor } from '@/remote/share.remote'
  import { toHref } from '@/utils/url'

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
  const currentPage = $derived(Number(page.url.searchParams.get('page')) || 1)
  const sponsorQuery = $derived(getShareSponsor({ channel, slug: id, page: currentPage }))
</script>

<svelte:head>
  {#if sponsorQuery.ready && sponsorQuery.current.status === 'ok'}
    <title>{sponsorQuery.current.data.sponsor.name} — {channelLabel} Sponsor</title>
  {:else}
    <title>Sponsor Share</title>
  {/if}
</svelte:head>

<main class="min-h-screen bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6">
  <div class="mx-auto max-w-5xl">
    <ChannelSponsorDetailContent
      load={getShareSponsor({ channel, slug: id, page: currentPage })}
      sponsorLabel={`${channelLabel} Sponsor`}
      videoHref={(videoId) => `https://www.youtube.com/watch?v=${videoId}`}
      videoPageHref={(page) =>
        toHref(`/share/${encodeURIComponent(channel)}/sponsor/${encodeURIComponent(id)}`, {
          page,
        })}
      externalVideoLinks={true}
      showBottomVideoPagination={true}
    />
  </div>
</main>
