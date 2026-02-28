<script lang="ts">
  import { page } from '$app/state'
  import ChannelVideoDetailContent from '@/components/channel/ChannelVideoDetailContent.svelte'
  import { parseTheoVideoSearch } from '@/features/theo/theo-search-params'
  import { getTheoVideoDetails, linkTheoVideoToXPost } from '@/remote/theo.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseTheoVideoSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')

  const videoQuery = $derived(
    getTheoVideoDetails({
      videoId: id,
      commentsPage: search.commentsPage,
      commentsSort: search.commentsSort,
      commentsFilter: search.commentsFilter,
    }),
  )

  const saveXPost = async (xPostUrl: string) => {
    const result = await linkTheoVideoToXPost({
      videoId: id,
      xPostUrl,
    }).updates(videoQuery)

    return result.status === 'error' ? result.error.message : null
  }
</script>

<ChannelVideoDetailContent
  videoId={id}
  search={search}
  {videoQuery}
  shareHref={`/share/theo/${encodeURIComponent(id)}`}
  sponsorHref={(slug) => toHref(`/theo/sponsor/${encodeURIComponent(slug)}`, { page: 1 })}
  detailHref={(params) => toHref(`/theo/video/${encodeURIComponent(id)}`, params)}
  xPostInputId="theo-x-post-url"
  xPostPending={linkTheoVideoToXPost.pending}
  saveXPost={saveXPost}
/>
