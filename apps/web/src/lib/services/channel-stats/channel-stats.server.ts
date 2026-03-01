import { Result, TaggedError } from 'better-result'
import { env } from '$env/dynamic/private'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

const parseCount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

const pickThumbnail = (thumbnails: Record<string, unknown> | undefined) => {
  if (!thumbnails) return null
  for (const key of ['high', 'medium', 'default']) {
    const thumb = thumbnails[key] as Record<string, unknown> | undefined
    if (typeof thumb?.url === 'string' && thumb.url) return thumb.url
  }
  return null
}

export type ChannelStats = {
  channelId: string
  name: string
  handle: string | null
  avatarUrl: string | null
  subscriberCount: number
  viewCount: number
  videoCount: number
}

export namespace ChannelStatsService {
  export class MissingApiKeyError extends TaggedError('MissingApiKeyError')<{
    message: string
  }>() {}

  export class FetchError extends TaggedError('ChannelStatsFetchError')<{
    message: string
  }>() {}

  export class NotFoundError extends TaggedError(
    'ChannelStatsNotFoundError',
  )<{
    channelId: string
    message: string
  }>() {}

  export const getStats = async (
    _deps: Record<string, never>,
    input: { channelId: string },
  ) => {
    const apiKey = env.YT_API_KEY?.trim()
    if (!apiKey) {
      return Result.err(
        new MissingApiKeyError({ message: 'YT_API_KEY is required' }),
      )
    }

    const params = new URLSearchParams({
      key: apiKey,
      id: input.channelId,
      part: 'snippet,statistics',
      maxResults: '1',
    })

    const fetchResult = await Result.tryPromise({
      try: async () => {
        const response = await fetch(
          `${YOUTUBE_API_BASE}/channels?${params.toString()}`,
        )
        if (!response.ok) {
          const body = await response.text()
          throw new Error(
            `YouTube API request failed (${response.status}): ${body}`,
          )
        }
        return (await response.json()) as {
          items?: Record<string, unknown>[]
        }
      },
      catch: (cause) =>
        new FetchError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to fetch channel stats',
        }),
    })

    if (fetchResult.status === 'error') return fetchResult

    const item = fetchResult.value.items?.[0]
    if (!item) {
      return Result.err(
        new NotFoundError({
          channelId: input.channelId,
          message: `Channel ${input.channelId} not found`,
        }),
      )
    }

    const snippet = (item.snippet as Record<string, unknown> | undefined) ?? {}
    const statistics =
      (item.statistics as Record<string, unknown> | undefined) ?? {}
    const thumbnails =
      (snippet.thumbnails as Record<string, unknown> | undefined) ?? undefined

    return Result.ok({
      channelId: input.channelId,
      name: typeof snippet.title === 'string' ? snippet.title : '',
      handle:
        typeof snippet.customUrl === 'string' ? snippet.customUrl : null,
      avatarUrl: pickThumbnail(thumbnails),
      subscriberCount: parseCount(statistics.subscriberCount),
      viewCount: parseCount(statistics.viewCount),
      videoCount: parseCount(statistics.videoCount),
    } satisfies ChannelStats)
  }
}
