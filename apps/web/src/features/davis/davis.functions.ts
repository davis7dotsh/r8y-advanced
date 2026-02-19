import { createServerFn } from '@tanstack/react-start'
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
} from './davis-search-params'

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

const toError = (error: { _tag: string; message: string }): ServerError => ({
  tag: error._tag,
  message: error.message,
})

export const getDavisVideos = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => parseDavisListSearch(input))
  .handler(async ({ data }) => {
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

export const getDavisVideoDetails = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}
    const { commentsPage, commentsSort, commentsFilter } =
      parseDavisVideoSearch(value)

    return {
      videoId: typeof value.videoId === 'string' ? value.videoId : '',
      commentsPage,
      commentsSort,
      commentsFilter,
    }
  })
  .handler(async ({ data }) => {
    const { DavisVideoService } =
      await import('@/services/davis/davis-video.server')
    const result = await DavisVideoService.getById({}, data)

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
  })

export const linkDavisVideoToXPost = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    return {
      videoId: typeof value.videoId === 'string' ? value.videoId.trim() : '',
      xPostUrl: typeof value.xPostUrl === 'string' ? value.xPostUrl.trim() : '',
    }
  })
  .handler(async ({ data }) => {
    const { DavisVideoService } =
      await import('@/services/davis/davis-video.server')
    const result = await DavisVideoService.linkXPost({}, data)

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
  })

export const getDavisSponsorDetails = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    const { page, mentionsPage } = parseDavisSponsorSearch(value)
    return {
      slug: typeof value.slug === 'string' ? value.slug : '',
      page,
      mentionsPage,
    }
  })
  .handler(async ({ data }) => {
    const { DavisSponsorService } =
      await import('@/services/davis/davis-sponsor.server')
    const result = await DavisSponsorService.getBySlug({}, data)

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
  })

export const getDavisSearchSuggestions = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    return {
      q: typeof value.q === 'string' ? value.q : '',
    }
  })
  .handler(async ({ data }) => {
    const { DavisSearchService } =
      await import('@/services/davis/davis-search.server')
    const result = await DavisSearchService.suggest({}, data)

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
