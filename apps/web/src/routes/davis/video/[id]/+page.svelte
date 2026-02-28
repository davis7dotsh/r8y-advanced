<script lang="ts">
  import { page } from '$app/state'
  import ChannelVideoDetailContent from '@/components/channel/ChannelVideoDetailContent.svelte'
  import { parseDavisVideoSearch } from '@/features/davis/davis-search-params'
  import { getDavisVideoDetails, linkDavisVideoToXPost } from '@/remote/davis.remote'
  import { toHref } from '@/utils/url'

  const search = $derived(parseDavisVideoSearch(Object.fromEntries(page.url.searchParams)))
  const id = $derived(page.params.id ?? '')

  const videoQuery = $derived(
    getDavisVideoDetails({
      videoId: id,
      commentsPage: search.commentsPage,
      commentsSort: search.commentsSort,
      commentsFilter: search.commentsFilter,
    }),
  )

  const saveXPost = async (xPostUrl: string) => {
    const result = await linkDavisVideoToXPost({
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
  shareHref={`/share/davis/${encodeURIComponent(id)}`}
  sponsorHref={(slug) => toHref(`/davis/sponsor/${encodeURIComponent(slug)}`, { page: 1 })}
  detailHref={(params) => toHref(`/davis/video/${encodeURIComponent(id)}`, params)}
  xPostInputId="davis-x-post-url"
  xPostPending={linkDavisVideoToXPost.pending}
  saveXPost={saveXPost}
/>
