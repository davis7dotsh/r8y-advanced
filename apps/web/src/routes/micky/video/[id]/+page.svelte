<script lang="ts">
  import { page } from '$app/state'
  import ChannelVideoDetailContent from '@/components/channel/ChannelVideoDetailContent.svelte'
  import { parseMickyVideoSearch } from '@/features/micky/micky-search-params'
  import { getMickyVideoDetails, linkMickyVideoToXPost } from '@/remote/micky.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseMickyVideoSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')

  const videoQuery = $derived(
    getMickyVideoDetails({
      videoId: id,
      commentsPage: search.commentsPage,
      commentsSort: search.commentsSort,
      commentsFilter: search.commentsFilter,
    }),
  )

  const saveXPost = async (xPostUrl: string) => {
    const result = await linkMickyVideoToXPost({
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
  shareHref={`/share/micky/${encodeURIComponent(id)}`}
  sponsorHref={(slug) => toHref(`/micky/sponsor/${encodeURIComponent(slug)}`, { page: 1 })}
  detailHref={(params) => toHref(`/micky/video/${encodeURIComponent(id)}`, params)}
  xPostInputId="micky-x-post-url"
  xPostPending={linkMickyVideoToXPost.pending}
  saveXPost={saveXPost}
/>
