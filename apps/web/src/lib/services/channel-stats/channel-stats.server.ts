import { Result, TaggedError } from 'better-result'
import { sql, gte } from 'drizzle-orm'
import { env } from '$env/dynamic/private'
import type { PgTableWithColumns } from 'drizzle-orm/pg-core'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

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

type VideosTable = PgTableWithColumns<{
  name: string
  schema: string | undefined
  dialect: 'pg'
  columns: {
    publishedAt: any
    viewCount: any
    likeCount: any
  }
}>

export type ChannelStats = {
  channelId: string
  name: string
  handle: string | null
  avatarUrl: string | null
  subscriberCount: number
  last30Days: {
    videoCount: number
    viewCount: number
    likeCount: number
  }
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

  export class QueryError extends TaggedError('ChannelStatsQueryError')<{
    message: string
  }>() {}

  const fetchYouTubeProfile = async (channelId: string) => {
    const apiKey = env.YT_API_KEY?.trim()
    if (!apiKey) {
      return Result.err(
        new MissingApiKeyError({ message: 'YT_API_KEY is required' }),
      )
    }

    const params = new URLSearchParams({
      key: apiKey,
      id: channelId,
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
          channelId,
          message: `Channel ${channelId} not found`,
        }),
      )
    }

    const snippet =
      (item.snippet as Record<string, unknown> | undefined) ?? {}
    const statistics =
      (item.statistics as Record<string, unknown> | undefined) ?? {}
    const thumbnails =
      (snippet.thumbnails as Record<string, unknown> | undefined) ?? undefined

    return Result.ok({
      name: typeof snippet.title === 'string' ? snippet.title : '',
      handle:
        typeof snippet.customUrl === 'string' ? snippet.customUrl : null,
      avatarUrl: pickThumbnail(thumbnails),
      subscriberCount: parseCount(statistics.subscriberCount),
    })
  }

  const queryLast30Days = async (
    db: { select: (...args: any[]) => any },
    videosTable: VideosTable,
  ) => {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS)

    return Result.tryPromise({
      try: async () => {
        const rows = (await db
          .select({
            videoCount: sql<number>`count(*)`,
            viewCount: sql<number>`coalesce(sum(${videosTable.viewCount}), 0)`,
            likeCount: sql<number>`coalesce(sum(${videosTable.likeCount}), 0)`,
          })
          .from(videosTable)
          .where(gte(videosTable.publishedAt, cutoff))) as Array<{
          videoCount: number
          viewCount: number
          likeCount: number
        }>

        const row = rows[0]
        return {
          videoCount: Number(row?.videoCount ?? 0),
          viewCount: Number(row?.viewCount ?? 0),
          likeCount: Number(row?.likeCount ?? 0),
        }
      },
      catch: (cause) =>
        new QueryError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to query 30-day video stats',
        }),
    })
  }

  export const getStats = async (
    deps: {
      db: { select: (...args: any[]) => any }
      videosTable: VideosTable
    },
    input: { channelId: string },
  ) => {
    const [profileResult, last30Result] = await Promise.all([
      fetchYouTubeProfile(input.channelId),
      queryLast30Days(deps.db, deps.videosTable),
    ])

    if (last30Result.status === 'error') return last30Result

    const profile =
      profileResult.status === 'ok'
        ? profileResult.value
        : { name: '', handle: null, avatarUrl: null, subscriberCount: 0 }

    return Result.ok({
      channelId: input.channelId,
      ...profile,
      last30Days: last30Result.value,
    } satisfies ChannelStats)
  }
}
