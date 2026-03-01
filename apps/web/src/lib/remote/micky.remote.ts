import { command, query } from '$app/server'
import type {
  MickySearchSuggestions,
  MickySponsorDetails,
  MickyVideoDetails,
  VideoSummary,
} from '@/services/micky/micky.types'
import {
  parseMickyListSearch,
  parseMickySponsorSearch,
  parseMickyVideoSearch,
} from '@/features/micky/micky-search-params'

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

export const getMickyVideos = query('unchecked', async (input: unknown) => {
  const data = parseMickyListSearch(input)
  const { MickyVideosService } =
    await import('@/services/micky/micky-videos.server')
  const result = await MickyVideosService.list({}, data)

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

export const getMickyVideoDetails = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { commentsPage, commentsSort, commentsFilter } =
      parseMickyVideoSearch(value)

    const { MickyVideoService } =
      await import('@/services/micky/micky-video.server')
    const result = await MickyVideoService.getById(
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
      } satisfies ServerPayload<MickyVideoDetails>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<MickyVideoDetails>
  },
)

export const linkMickyVideoToXPost = command(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { MickyVideoService } =
      await import('@/services/micky/micky-video.server')
    const result = await MickyVideoService.linkXPost(
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
        xPost: NonNullable<MickyVideoDetails['video']['xPost']>
      }>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<{
      xPost: NonNullable<MickyVideoDetails['video']['xPost']>
    }>
  },
)

export const getMickySponsorDetails = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { page, mentionsPage } = parseMickySponsorSearch(value)

    const { MickySponsorService } =
      await import('@/services/micky/micky-sponsor.server')
    const result = await MickySponsorService.getBySlug(
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
      } satisfies ServerPayload<MickySponsorDetails>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<MickySponsorDetails>
  },
)

export const getMickySearchSuggestions = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const q = typeof value.q === 'string' ? value.q : ''

    const { MickySearchService } =
      await import('@/services/micky/micky-search.server')
    const result = await MickySearchService.suggest({}, { q })

    if (result.status === 'error') {
      return {
        status: 'error',
        error: toError(result.error),
      } satisfies ServerPayload<MickySearchSuggestions>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<MickySearchSuggestions>
  },
)

export const getMickyChannelStats = query('unchecked', async () => {
  const { ChannelStatsService } = await import(
    '@/services/channel-stats/channel-stats.server'
  )
  const { MICKY_CHANNEL_INFO } = await import('@r8y/micky-data/channel-info')
  const result = await ChannelStatsService.getStats(
    {},
    { channelId: MICKY_CHANNEL_INFO.channelId },
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

export type MickyVideosPayload = Awaited<ReturnType<typeof getMickyVideos>>
export type MickyVideoPayload = Awaited<ReturnType<typeof getMickyVideoDetails>>
export type MickySponsorPayload = Awaited<
  ReturnType<typeof getMickySponsorDetails>
>
export type MickySearchPayload = Awaited<
  ReturnType<typeof getMickySearchSuggestions>
>
export type LinkMickyVideoToXPostPayload = Awaited<
  ReturnType<typeof linkMickyVideoToXPost>
>
export type MickyChannelStatsPayload = Awaited<
  ReturnType<typeof getMickyChannelStats>
>
