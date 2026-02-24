import { Result, TaggedError } from 'better-result'
import { desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { sponsorToVideos, sponsors, videos } from '@r8y/davis-sync/schema'
import { davisDb as defaultDb } from '@/db/davis.client.server'
import { VIDEO_PAGE_SIZE, type VideoSummary } from './davis.types'
import {
  asIsoDate,
  asNumber,
  normalizePage,
  normalizeQuery,
  toOffset,
  toPagination,
  toSponsorSlug,
} from './davis-utils'

const buildVideoSearchWhere = (query: string) => {
  const prefix = `${query}%`
  const contains = `%${query}%`

  return or(
    ilike(videos.title, prefix),
    ilike(videos.title, contains),
    ilike(sponsors.name, prefix),
    ilike(sponsors.name, contains),
  )
}

const toVideoSummaries = (
  rows: Array<{
    videoId: string
    title: string
    thumbnailUrl: string
    publishedAt: Date
    viewCount: number
    likeCount: number
    commentCount: number
    sponsorId: string | null
    sponsorName: string | null
    xUrl: string | null
    xViews: number | null
    xLikes: number | null
    xReposts: number | null
    xComments: number | null
  }>,
  orderedVideoIds: string[],
) => {
  const order = new Map(
    orderedVideoIds.map((videoId, index) => [videoId, index]),
  )

  const grouped = rows.reduce(
    (acc, row) => {
      const existing = acc.get(row.videoId)

      const current = existing ?? {
        videoId: row.videoId,
        title: row.title,
        thumbnailUrl: row.thumbnailUrl,
        publishedAt: asIsoDate(row.publishedAt),
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        xUrl: row.xUrl,
        xViews: row.xViews,
        xLikes: row.xLikes,
        xReposts: row.xReposts,
        xComments: row.xComments,
        sponsorsById: new Map<
          string,
          { sponsorId: string; name: string; slug: string }
        >(),
      }

      if (row.sponsorId && row.sponsorName) {
        current.sponsorsById.set(row.sponsorId, {
          sponsorId: row.sponsorId,
          name: row.sponsorName,
          slug: toSponsorSlug(row.sponsorName, row.sponsorId),
        })
      }

      acc.set(row.videoId, current)
      return acc
    },
    new Map<
      string,
      {
        videoId: string
        title: string
        thumbnailUrl: string
        publishedAt: string
        viewCount: number
        likeCount: number
        commentCount: number
        xUrl: string | null
        xViews: number | null
        xLikes: number | null
        xReposts: number | null
        xComments: number | null
        sponsorsById: Map<
          string,
          { sponsorId: string; name: string; slug: string }
        >
      }
    >(),
  )

  return Array.from(grouped.values())
    .sort(
      (left, right) =>
        (order.get(left.videoId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.videoId) ?? Number.MAX_SAFE_INTEGER),
    )
    .map(
      ({
        sponsorsById,
        xUrl,
        xViews,
        xLikes,
        xReposts,
        xComments,
        ...video
      }) => ({
        ...video,
        sponsors: Array.from(sponsorsById.values()),
        xPost: xUrl
          ? {
              url: xUrl,
              views: xViews,
              likes: xLikes,
              reposts: xReposts,
              comments: xComments,
            }
          : null,
      }),
    )
}

const loadIdsAndTotalFromDb = async (
  db: typeof defaultDb,
  input: {
    pageSize: number
    offset: number
    query: string
  },
) => {
  if (!input.query) {
    const [countRow, ids] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(videos),
      db
        .select({
          videoId: videos.videoId,
        })
        .from(videos)
        .orderBy(desc(videos.publishedAt))
        .limit(input.pageSize)
        .offset(input.offset),
    ])

    return {
      total: asNumber(countRow[0]?.total),
      videoIds: ids.map((row) => row.videoId),
    }
  }

  const where = buildVideoSearchWhere(input.query)

  const [countRow, ids] = await Promise.all([
    db
      .select({ total: sql<number>`count(distinct ${videos.videoId})` })
      .from(videos)
      .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
      .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
      .where(where),
    db
      .select({
        videoId: videos.videoId,
        publishedAt: videos.publishedAt,
      })
      .from(videos)
      .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
      .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
      .where(where)
      .groupBy(videos.videoId, videos.publishedAt)
      .orderBy(desc(videos.publishedAt))
      .limit(input.pageSize)
      .offset(input.offset),
  ])

  return {
    total: asNumber(countRow[0]?.total),
    videoIds: ids.map((row) => row.videoId),
  }
}

const loadVideosFromDb = (db: typeof defaultDb, videoIds: string[]) =>
  db
    .select({
      videoId: videos.videoId,
      title: videos.title,
      thumbnailUrl: videos.thumbnailUrl,
      publishedAt: videos.publishedAt,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
      sponsorId: sponsors.sponsorId,
      sponsorName: sponsors.name,
      xUrl: videos.xUrl,
      xViews: videos.xViews,
      xLikes: videos.xLikes,
      xReposts: videos.xReposts,
      xComments: videos.xComments,
    })
    .from(videos)
    .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
    .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
    .where(inArray(videos.videoId, videoIds))
    .orderBy(desc(videos.publishedAt))

export namespace DavisVideosService {
  export class InvalidVideosInputError extends TaggedError(
    'InvalidVideosInputError',
  )<{
    message: string
  }>() {}

  export class VideosQueryError extends TaggedError('VideosQueryError')<{
    message: string
  }>() {}

  export const list = async (
    deps: {
      db?: typeof defaultDb
      queries?: {
        loadIdsAndTotal?: (input: {
          pageSize: number
          offset: number
          query: string
        }) => Promise<{ total: number; videoIds: string[] }>
        loadVideos?: (videoIds: string[]) => Promise<
          Array<{
            videoId: string
            title: string
            thumbnailUrl: string
            publishedAt: Date
            viewCount: number
            likeCount: number
            commentCount: number
            sponsorId: string | null
            sponsorName: string | null
            xUrl: string | null
            xViews: number | null
            xLikes: number | null
            xReposts: number | null
            xComments: number | null
          }>
        >
      }
    },
    input: {
      page?: number
      q?: string
      pageSize?: number
    },
  ) => {
    const page = normalizePage(input.page)
    const query = normalizeQuery(input.q)
    const pageSize = input.pageSize ?? VIDEO_PAGE_SIZE

    if (pageSize < 1) {
      return Result.err(
        new InvalidVideosInputError({
          message: 'pageSize must be at least 1',
        }),
      )
    }

    const db = deps.db ?? defaultDb
    const offset = toOffset(page, pageSize)

    const loadIdsAndTotal =
      deps.queries?.loadIdsAndTotal ??
      ((queryInput: { pageSize: number; offset: number; query: string }) =>
        loadIdsAndTotalFromDb(db, queryInput))

    const idsAndTotalResult = await Result.tryPromise({
      try: () =>
        loadIdsAndTotal({
          pageSize,
          offset,
          query,
        }),
      catch: (cause) =>
        new VideosQueryError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to load Davis videos',
        }),
    })

    if (idsAndTotalResult.status === 'error') {
      return idsAndTotalResult
    }

    if (idsAndTotalResult.value.videoIds.length === 0) {
      return Result.ok({
        items: [] as VideoSummary[],
        pagination: toPagination({
          page,
          pageSize,
          total: idsAndTotalResult.value.total,
        }),
        q: query,
      })
    }

    const loadVideos =
      deps.queries?.loadVideos ??
      ((videoIds: string[]) =>
        loadVideosFromDb(db, videoIds) as Promise<
          Array<{
            videoId: string
            title: string
            thumbnailUrl: string
            publishedAt: Date
            viewCount: number
            likeCount: number
            commentCount: number
            sponsorId: string | null
            sponsorName: string | null
            xUrl: string | null
            xViews: number | null
            xLikes: number | null
            xReposts: number | null
            xComments: number | null
          }>
        >)

    const videosResult = await Result.tryPromise({
      try: () => loadVideos(idsAndTotalResult.value.videoIds),
      catch: (cause) =>
        new VideosQueryError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to hydrate Davis videos',
        }),
    })

    if (videosResult.status === 'error') {
      return videosResult
    }

    return Result.ok({
      items: toVideoSummaries(
        videosResult.value,
        idsAndTotalResult.value.videoIds,
      ),
      pagination: toPagination({
        page,
        pageSize,
        total: idsAndTotalResult.value.total,
      }),
      q: query,
    })
  }
}
