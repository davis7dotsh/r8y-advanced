import { createServerFn } from '@tanstack/react-start'
import type {
  TheoSearchSuggestions,
  TheoSponsorDetails,
  TheoVideoDetails,
  VideoSummary,
} from '@/services/theo/theo.types'
import { parseTheoListSearch } from './theo-search-params'

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

export const getTheoVideos = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => parseTheoListSearch(input))
  .handler(async ({ data }) => {
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

export const getTheoVideoDetails = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    return {
      videoId: typeof value.videoId === 'string' ? value.videoId : '',
      commentsPage:
        typeof value.commentsPage === 'number'
          ? value.commentsPage
          : typeof value.commentsPage === 'string'
            ? Number.parseInt(value.commentsPage, 10)
            : 1,
    }
  })
  .handler(async ({ data }) => {
    const { TheoVideoService } =
      await import('@/services/theo/theo-video.server')
    const result = await TheoVideoService.getById({}, data)

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
  })

export const getTheoSponsorDetails = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const value =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {}

    return {
      slug: typeof value.slug === 'string' ? value.slug : '',
      page:
        typeof value.page === 'number'
          ? value.page
          : typeof value.page === 'string'
            ? Number.parseInt(value.page, 10)
            : 1,
    }
  })
  .handler(async ({ data }) => {
    const { TheoSponsorService } =
      await import('@/services/theo/theo-sponsor.server')
    const result = await TheoSponsorService.getBySlug({}, data)

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
  })

export const getTheoSearchSuggestions = createServerFn({ method: 'GET' })
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
    const { TheoSearchService } =
      await import('@/services/theo/theo-search.server')
    const result = await TheoSearchService.suggest({}, data)

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
  })

export type TheoVideosPayload = Awaited<ReturnType<typeof getTheoVideos>>
export type TheoVideoPayload = Awaited<ReturnType<typeof getTheoVideoDetails>>
export type TheoSponsorPayload = Awaited<
  ReturnType<typeof getTheoSponsorDetails>
>
export type TheoSearchPayload = Awaited<
  ReturnType<typeof getTheoSearchSuggestions>
>
