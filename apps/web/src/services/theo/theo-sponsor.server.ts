import { Result, TaggedError } from 'better-result'
import { desc, eq, sql } from 'drizzle-orm'
import { sponsorToVideos, sponsors, videos } from 'theo-data/schema'
import { db as defaultDb } from '@/db/client.server'
import { VIDEO_PAGE_SIZE, type VideoSummary } from './theo.types'
import {
  asIsoDate,
  asNumber,
  normalizePage,
  toOffset,
  toPagination,
  toSponsorSlug,
} from './theo-utils'

const buildVideoSummaries = (
  rows: Array<{
    videoId: string
    title: string
    thumbnailUrl: string
    publishedAt: Date
    viewCount: number
    likeCount: number
    commentCount: number
  }>,
) =>
  rows.map(
    (row) =>
      ({
        videoId: row.videoId,
        title: row.title,
        thumbnailUrl: row.thumbnailUrl,
        publishedAt: asIsoDate(row.publishedAt),
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        sponsors: [],
      }) satisfies VideoSummary,
  )

const loadSponsorsFromDb = (db: typeof defaultDb) =>
  db
    .select({
      sponsorId: sponsors.sponsorId,
      name: sponsors.name,
      createdAt: sponsors.createdAt,
    })
    .from(sponsors)
    .orderBy(sponsors.name)

const countSponsorVideosFromDb = (db: typeof defaultDb, sponsorId: string) =>
  db
    .select({ total: sql<number>`count(*)` })
    .from(sponsorToVideos)
    .where(eq(sponsorToVideos.sponsorId, sponsorId))

const loadSponsorVideosFromDb = (
  db: typeof defaultDb,
  input: {
    sponsorId: string
    page: number
    pageSize: number
  },
) =>
  db
    .select({
      videoId: videos.videoId,
      title: videos.title,
      thumbnailUrl: videos.thumbnailUrl,
      publishedAt: videos.publishedAt,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
    })
    .from(sponsorToVideos)
    .innerJoin(videos, eq(videos.videoId, sponsorToVideos.videoId))
    .where(eq(sponsorToVideos.sponsorId, input.sponsorId))
    .orderBy(desc(videos.publishedAt))
    .limit(input.pageSize)
    .offset(toOffset(input.page, input.pageSize))

const loadSponsorStatsFromDb = (db: typeof defaultDb, sponsorId: string) =>
  db
    .select({
      totalViews: sql<number>`coalesce(sum(${videos.viewCount}), 0)`,
      averageViews: sql<number>`coalesce(avg(${videos.viewCount}), 0)`,
      lastPublishedAt: sql<Date | null>`max(${videos.publishedAt})`,
    })
    .from(sponsorToVideos)
    .innerJoin(videos, eq(videos.videoId, sponsorToVideos.videoId))
    .where(eq(sponsorToVideos.sponsorId, sponsorId))

const loadSponsorTopVideoFromDb = (db: typeof defaultDb, sponsorId: string) =>
  db
    .select({
      videoId: videos.videoId,
      title: videos.title,
      viewCount: videos.viewCount,
    })
    .from(sponsorToVideos)
    .innerJoin(videos, eq(videos.videoId, sponsorToVideos.videoId))
    .where(eq(sponsorToVideos.sponsorId, sponsorId))
    .orderBy(desc(videos.viewCount), desc(videos.publishedAt))
    .limit(1)

export namespace TheoSponsorService {
  export class InvalidSponsorInputError extends TaggedError(
    'InvalidSponsorInputError',
  )<{
    message: string
  }>() {}

  export class SponsorNotFoundError extends TaggedError(
    'SponsorNotFoundError',
  )<{
    slug: string
    message: string
  }>() {}

  export class SponsorQueryError extends TaggedError('SponsorQueryError')<{
    message: string
  }>() {}

  export const getBySlug = async (
    deps: {
      db?: typeof defaultDb
      queries?: {
        loadSponsors?: () => Promise<
          Array<{
            sponsorId: string
            name: string
            createdAt: Date
          }>
        >
        countSponsorVideos?: (
          sponsorId: string,
        ) => Promise<Array<{ total: number }>>
        loadSponsorVideos?: (input: {
          sponsorId: string
          page: number
          pageSize: number
        }) => Promise<
          Array<{
            videoId: string
            title: string
            thumbnailUrl: string
            publishedAt: Date
            viewCount: number
            likeCount: number
            commentCount: number
          }>
        >
        loadSponsorStats?: (sponsorId: string) => Promise<
          Array<{
            totalViews: number
            averageViews: number
            lastPublishedAt: Date | null
          }>
        >
        loadSponsorTopVideo?: (sponsorId: string) => Promise<
          Array<{
            videoId: string
            title: string
            viewCount: number
          }>
        >
      }
    },
    input: {
      slug: string
      page?: number
      pageSize?: number
    },
  ) => {
    const slug = input.slug.trim().toLowerCase()
    const page = normalizePage(input.page)
    const pageSize = input.pageSize ?? VIDEO_PAGE_SIZE

    if (!slug) {
      return Result.err(
        new InvalidSponsorInputError({
          message: 'sponsor slug is required',
        }),
      )
    }

    const db = deps.db ?? defaultDb
    const loadSponsors =
      deps.queries?.loadSponsors ?? (() => loadSponsorsFromDb(db))

    const sponsorResult = await Result.tryPromise({
      try: () => loadSponsors(),
      catch: (cause) =>
        new SponsorQueryError({
          message:
            cause instanceof Error ? cause.message : 'Failed to load sponsors',
        }),
    })

    if (sponsorResult.status === 'error') {
      return sponsorResult
    }

    const sponsor = sponsorResult.value.find(
      (candidate) =>
        toSponsorSlug(candidate.name, candidate.sponsorId) === slug,
    )

    if (!sponsor) {
      return Result.err(
        new SponsorNotFoundError({
          slug,
          message: `Sponsor ${slug} not found`,
        }),
      )
    }

    const countSponsorVideos =
      deps.queries?.countSponsorVideos ??
      ((sponsorId: string) => countSponsorVideosFromDb(db, sponsorId))

    const loadSponsorVideos =
      deps.queries?.loadSponsorVideos ??
      ((queryInput: { sponsorId: string; page: number; pageSize: number }) =>
        loadSponsorVideosFromDb(db, queryInput) as Promise<
          Array<{
            videoId: string
            title: string
            thumbnailUrl: string
            publishedAt: Date
            viewCount: number
            likeCount: number
            commentCount: number
          }>
        >)

    const loadSponsorStats =
      deps.queries?.loadSponsorStats ??
      ((sponsorId: string) =>
        loadSponsorStatsFromDb(db, sponsorId) as Promise<
          Array<{
            totalViews: number
            averageViews: number
            lastPublishedAt: Date | null
          }>
        >)

    const loadSponsorTopVideo =
      deps.queries?.loadSponsorTopVideo ??
      ((sponsorId: string) =>
        loadSponsorTopVideoFromDb(db, sponsorId) as Promise<
          Array<{
            videoId: string
            title: string
            viewCount: number
          }>
        >)

    const [countResult, videosResult, statsResult, topVideoResult] =
      await Promise.all([
        Result.tryPromise({
          try: () => countSponsorVideos(sponsor.sponsorId),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to count sponsor videos',
            }),
        }),
        Result.tryPromise({
          try: () =>
            loadSponsorVideos({
              sponsorId: sponsor.sponsorId,
              page,
              pageSize,
            }),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to load sponsor videos',
            }),
        }),
        Result.tryPromise({
          try: () => loadSponsorStats(sponsor.sponsorId),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to load sponsor stats',
            }),
        }),
        Result.tryPromise({
          try: () => loadSponsorTopVideo(sponsor.sponsorId),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to load sponsor top video',
            }),
        }),
      ])

    if (countResult.status === 'error') {
      return countResult
    }

    if (videosResult.status === 'error') {
      return videosResult
    }

    if (statsResult.status === 'error') {
      return statsResult
    }

    if (topVideoResult.status === 'error') {
      return topVideoResult
    }

    const statsRow = statsResult.value[0]
    const topVideo = topVideoResult.value[0]

    return Result.ok({
      sponsor: {
        sponsorId: sponsor.sponsorId,
        name: sponsor.name,
        slug: toSponsorSlug(sponsor.name, sponsor.sponsorId),
        createdAt: asIsoDate(sponsor.createdAt),
      },
      stats: {
        totalViews: asNumber(statsRow?.totalViews),
        averageViews: Math.round(asNumber(statsRow?.averageViews)),
        lastPublishedAt: statsRow?.lastPublishedAt
          ? asIsoDate(statsRow.lastPublishedAt)
          : null,
        bestPerformingVideo: topVideo
          ? {
              videoId: topVideo.videoId,
              title: topVideo.title,
              viewCount: asNumber(topVideo.viewCount),
            }
          : null,
      },
      videos: {
        items: buildVideoSummaries(videosResult.value),
        pagination: toPagination({
          page,
          pageSize,
          total: asNumber(countResult.value[0]?.total),
        }),
      },
    })
  }
}
