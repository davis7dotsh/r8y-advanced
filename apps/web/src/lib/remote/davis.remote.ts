import { command, query } from '$app/server'
import type {
  DavisSearchSuggestions,
  DavisSponsorDetails,
  DavisVideoDetails,
  VideoSummary,
} from '@/services/davis/davis.types'
import {
  parseDavisListSearch,
  parseDavisSponsorSearch,
  parseDavisVideoSearch,
} from '@/features/davis/davis-search-params'

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

export const getDavisVideos = query('unchecked', async (input: unknown) => {
  const data = parseDavisListSearch(input)
  const { DavisVideosService } =
    await import('@/services/davis/davis-videos.server')
  const result = await DavisVideosService.list({}, data)

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

export const getDavisVideoDetails = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { commentsPage, commentsSort, commentsFilter } =
      parseDavisVideoSearch(value)

    const { DavisVideoService } =
      await import('@/services/davis/davis-video.server')
    const result = await DavisVideoService.getById(
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
      } satisfies ServerPayload<DavisVideoDetails>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<DavisVideoDetails>
  },
)

export const linkDavisVideoToXPost = command(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { DavisVideoService } =
      await import('@/services/davis/davis-video.server')
    const result = await DavisVideoService.linkXPost(
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
        xPost: NonNullable<DavisVideoDetails['video']['xPost']>
      }>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<{
      xPost: NonNullable<DavisVideoDetails['video']['xPost']>
    }>
  },
)

export const getDavisSponsorDetails = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { page, mentionsPage } = parseDavisSponsorSearch(value)

    const { DavisSponsorService } =
      await import('@/services/davis/davis-sponsor.server')
    const result = await DavisSponsorService.getBySlug(
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
      } satisfies ServerPayload<DavisSponsorDetails>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<DavisSponsorDetails>
  },
)

export const getDavisSearchSuggestions = query(
  'unchecked',
  async (input: unknown) => {
    const value = toObject(input)
    const { DavisSearchService } =
      await import('@/services/davis/davis-search.server')
    const result = await DavisSearchService.suggest(
      {},
      {
        q: typeof value.q === 'string' ? value.q : '',
      },
    )

    if (result.status === 'error') {
      return {
        status: 'error',
        error: toError(result.error),
      } satisfies ServerPayload<DavisSearchSuggestions>
    }

    return {
      status: 'ok',
      data: result.value,
    } satisfies ServerPayload<DavisSearchSuggestions>
  },
)

export const getDavisChannelStats = query('unchecked', async () => {
  const { ChannelStatsService } = await import(
    '@/services/channel-stats/channel-stats.server'
  )
  const { BEN_CHANNEL_INFO } = await import('@r8y/davis-sync/channel-info')
  const { videos } = await import('@r8y/davis-sync/schema')
  const { davisDb } = await import('@/db/davis.client.server')
  const result = await ChannelStatsService.getStats(
    { db: davisDb, videosTable: videos },
    { channelId: BEN_CHANNEL_INFO.channelId },
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

export type DavisVideosPayload = Awaited<ReturnType<typeof getDavisVideos>>
export type DavisVideoPayload = Awaited<ReturnType<typeof getDavisVideoDetails>>
export type DavisSponsorPayload = Awaited<
  ReturnType<typeof getDavisSponsorDetails>
>
export type DavisSearchPayload = Awaited<
  ReturnType<typeof getDavisSearchSuggestions>
>
export type LinkDavisVideoToXPostPayload = Awaited<
  ReturnType<typeof linkDavisVideoToXPost>
>
export type DavisChannelStatsPayload = Awaited<
  ReturnType<typeof getDavisChannelStats>
>
