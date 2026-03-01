import { command, query } from '$app/server'
import type {
  TheoSearchSuggestions,
  TheoSponsorDetails,
  TheoVideoDetails,
  VideoSummary,
} from '@/services/theo/theo.types'
import {
  parseTheoListSearch,
  parseTheoSponsorSearch,
  parseTheoVideoSearch,
} from '@/features/theo/theo-search-params'

type ServerError = {
  tag: string
  message: string
}

type ServerPayload<T> =
  | {
      status: 'ok'
      data: T
    }
  | {
      status: 'error'
      error: ServerError
    }

const toError = (error: { _tag: string; message: string }) => ({
  tag: error._tag,
  message: error.message,
})

const toObject = (input: unknown) =>
  input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

export const getTheoVideos = query('unchecked', async (input: unknown) => {
  const data = parseTheoListSearch(input)
  const { TheoVideosService } =
    await import('@/services/theo/theo-videos.server')
  const result = await TheoVideosService.list({}, data)

  if (result.status === 'error') {
    return {
      status: 'error',
      error: toError(result.error),
    } satisfies ServerPayload<{
      items: VideoSummary[]
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
      q: string
    }>
  }

  return {
    status: 'ok',
    data: result.value,
  } satisfies ServerPayload<typeof result.value>
})

export const getTheoVideoDetails = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { commentsPage, commentsSort, commentsFilter } =
      parseTheoVideoSearch(value)

    const { TheoVideoService } =
      await import('@/services/theo/theo-video.server')
    const result = await TheoVideoService.getById(
      {},
      {
        videoId: typeof value.videoId === 'string' ? value.videoId : '',
        commentsPage,
        commentsSort,
        commentsFilter,
      },
    )

    if (result.status === 'error') {
      return {
        status: 'error',
        error: toError(result.error),
      } satisfies ServerPayload<TheoVideoDetails>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<TheoVideoDetails>
  },
)

export const linkTheoVideoToXPost = command(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { TheoVideoService } =
      await import('@/services/theo/theo-video.server')
    const result = await TheoVideoService.linkXPost(
      {},
      {
        videoId: typeof value.videoId === 'string' ? value.videoId.trim() : '',
        xPostUrl:
          typeof value.xPostUrl === 'string' ? value.xPostUrl.trim() : '',
      },
    )

    if (result.status === 'error') {
      return {
        status: 'error',
        error: toError(result.error),
      } satisfies ServerPayload<{
        xPost: NonNullable<TheoVideoDetails['video']['xPost']>
      }>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<{
      xPost: NonNullable<TheoVideoDetails['video']['xPost']>
    }>
  },
)

export const getTheoSponsorDetails = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { page, mentionsPage } = parseTheoSponsorSearch(value)

    const { TheoSponsorService } =
      await import('@/services/theo/theo-sponsor.server')
    const result = await TheoSponsorService.getBySlug(
      {},
      {
        slug: typeof value.slug === 'string' ? value.slug : '',
        page,
        mentionsPage,
      },
    )

    if (result.status === 'error') {
      return {
        status: 'error',
        error: toError(result.error),
      } satisfies ServerPayload<TheoSponsorDetails>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<TheoSponsorDetails>
  },
)

export const getTheoSearchSuggestions = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const q = typeof value.q === 'string' ? value.q : ''

    const { TheoSearchService } =
      await import('@/services/theo/theo-search.server')
    const result = await TheoSearchService.suggest({}, { q })

    if (result.status === 'error') {
      return {
        status: 'error',
        error: toError(result.error),
      } satisfies ServerPayload<TheoSearchSuggestions>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<TheoSearchSuggestions>
  },
)

export const getTheoChannelStats = query('unchecked', async () => {
  const { ChannelStatsService } = await import(
    '@/services/channel-stats/channel-stats.server'
  )
  const { THEO_CHANNEL_INFO } = await import('@r8y/theo-data/channel-info')
  const { videos } = await import('@r8y/theo-data/schema')
  const { db } = await import('@/db/client.server')
  const result = await ChannelStatsService.getStats(
    { db, videosTable: videos },
    { channelId: THEO_CHANNEL_INFO.channelId },
  )

  if (result.status === 'error') {
    return {
      status: 'error',
      error: toError(result.error),
    } as ServerPayload<never>
  }

  return {
    status: 'ok',
    data: result.value,
  } satisfies ServerPayload<typeof result.value>
})

export type TheoVideosPayload = Awaited<ReturnType<typeof getTheoVideos>>
export type TheoVideoPayload = Awaited<ReturnType<typeof getTheoVideoDetails>>
export type TheoSponsorPayload = Awaited<
  ReturnType<typeof getTheoSponsorDetails>
>
export type TheoSearchPayload = Awaited<
  ReturnType<typeof getTheoSearchSuggestions>
>
export type LinkTheoVideoToXPostPayload = Awaited<
  ReturnType<typeof linkTheoVideoToXPost>
>
export type TheoChannelStatsPayload = Awaited<
  ReturnType<typeof getTheoChannelStats>
>
