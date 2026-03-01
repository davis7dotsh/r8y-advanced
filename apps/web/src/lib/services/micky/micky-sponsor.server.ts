import { Result, TaggedError } from 'better-result'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
  comments,
  sponsorToVideos,
  sponsors,
  videos,
} from '@r8y/micky-data/schema'
import { mickyDb as defaultDb } from '@/db/micky.client.server'
import {
  COMMENT_PAGE_SIZE,
  VIDEO_PAGE_SIZE,
  type VideoSummary,
} from './micky.types'
import {
  asIsoDate,
  asNumber,
  normalizePage,
  toOffset,
  toPagination,
  toSponsorSlug,
} from './micky-utils'

const buildVideoSummaries = (
  rows: Array<{
    videoId: string
    title: string
    thumbnailUrl: string
    publishedAt: Date
    viewCount: number
    likeCount: number
    commentCount: number
    xUrl?: string | null
    xViews?: number | null
    xLikes?: number | null
    xReposts?: number | null
    xComments?: number | null
    xQuotes?: number | null
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
        xPost: row.xUrl
          ? {
              url: row.xUrl,
              views: row.xViews ?? null,
              likes: row.xLikes ?? null,
              reposts: row.xReposts ?? null,
              comments: row.xComments ?? null,
              quotes: row.xQuotes ?? null,
            }
          : null,
      }) satisfies VideoSummary,
  )

const loadSponsorCandidatesBySlugSuffixFromDb = (
  db: typeof defaultDb,
  slugSuffix: string,
) =>
  db
    .select({
      sponsorId: sponsors.sponsorId,
      name: sponsors.name,
      createdAt: sponsors.createdAt,
    })
    .from(sponsors)
    .where(
      sql`lower(regexp_replace(${sponsors.sponsorId}, '[^a-z0-9]', '', 'g')) like ${'%' + slugSuffix}`,
    )

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
      xUrl: videos.xUrl,
      xViews: videos.xViews,
      xLikes: videos.xLikes,
      xReposts: videos.xReposts,
      xComments: videos.xComments,
      xQuotes: videos.xQuotes,
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
      totalXViews: sql<number>`coalesce(sum(${videos.xViews}), 0)`,
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

const countSponsorMentionsFromDb = (db: typeof defaultDb, sponsorId: string) =>
  db
    .select({ total: sql<number>`count(*)` })
    .from(comments)
    .innerJoin(sponsorToVideos, eq(sponsorToVideos.videoId, comments.videoId))
    .where(
      and(
        eq(sponsorToVideos.sponsorId, sponsorId),
        eq(comments.isSponsorMention, true),
      ),
    )

const loadSponsorMentionsFromDb = (
  db: typeof defaultDb,
  input: { sponsorId: string; page: number; pageSize: number },
) =>
  db
    .select({
      commentId: comments.commentId,
      author: comments.author,
      text: comments.text,
      publishedAt: comments.publishedAt,
      likeCount: comments.likeCount,
      replyCount: comments.replyCount,
      videoId: videos.videoId,
      videoTitle: videos.title,
    })
    .from(comments)
    .innerJoin(sponsorToVideos, eq(sponsorToVideos.videoId, comments.videoId))
    .innerJoin(videos, eq(videos.videoId, comments.videoId))
    .where(
      and(
        eq(sponsorToVideos.sponsorId, input.sponsorId),
        eq(comments.isSponsorMention, true),
      ),
    )
    .orderBy(desc(comments.likeCount))
    .limit(input.pageSize)
    .offset(toOffset(input.page, input.pageSize))

export namespace MickySponsorService {
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
        loadSponsorCandidatesBySlugSuffix?: (slugSuffix: string) => Promise<
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
            xUrl: string | null
            xViews: number | null
            xLikes: number | null
            xReposts: number | null
            xComments: number | null
            xQuotes: number | null
          }>
        >
        loadSponsorStats?: (sponsorId: string) => Promise<
          Array<{
            totalViews: number
            averageViews: number
            lastPublishedAt: Date | null
            totalXViews: number
          }>
        >
        loadSponsorTopVideo?: (sponsorId: string) => Promise<
          Array<{
            videoId: string
            title: string
            viewCount: number
          }>
        >
        countSponsorMentions?: (
          sponsorId: string,
        ) => Promise<Array<{ total: number }>>
        loadSponsorMentions?: (input: {
          sponsorId: string
          page: number
          pageSize: number
        }) => Promise<
          Array<{
            commentId: string
            author: string
            text: string
            publishedAt: Date
            likeCount: number
            replyCount: number
            videoId: string
            videoTitle: string
          }>
        >
      }
    },
    input: {
      slug: string
      page?: number
      pageSize?: number
      mentionsPage?: number
    },
  ) => {
    const slug = input.slug.trim().toLowerCase()
    const page = normalizePage(input.page)
    const pageSize = input.pageSize ?? VIDEO_PAGE_SIZE
    const mentionsPage = normalizePage(input.mentionsPage)
    const mentionsPageSize = COMMENT_PAGE_SIZE

    if (!slug) {
      return Result.err(
        new InvalidSponsorInputError({
          message: 'sponsor slug is required',
        }),
      )
    }

    const db = deps.db ?? defaultDb

    // Extract the 4-char alphanumeric suffix embedded in the slug (format: "{name}--{suffix}")
    const slugSuffix = (slug.split('--').pop() ?? '')
      .replace(/[^a-z0-9]/g, '')
      .slice(-4)

    if (!slugSuffix) {
      return Result.err(
        new SponsorNotFoundError({
          slug,
          message: `Sponsor ${slug} not found`,
        }),
      )
    }

    const loadSponsorCandidatesBySlugSuffix =
      deps.queries?.loadSponsorCandidatesBySlugSuffix ??
      ((suffix: string) => loadSponsorCandidatesBySlugSuffixFromDb(db, suffix))

    const sponsorResult = await Result.tryPromise({
      try: () => loadSponsorCandidatesBySlugSuffix(slugSuffix),
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
            xUrl: string | null
            xViews: number | null
            xLikes: number | null
            xReposts: number | null
            xComments: number | null
            xQuotes: number | null
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
            totalXViews: number
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

    const countSponsorMentions =
      deps.queries?.countSponsorMentions ??
      ((sponsorId: string) => countSponsorMentionsFromDb(db, sponsorId))

    const loadSponsorMentions =
      deps.queries?.loadSponsorMentions ??
      ((queryInput: { sponsorId: string; page: number; pageSize: number }) =>
        loadSponsorMentionsFromDb(db, queryInput) as Promise<
          Array<{
            commentId: string
            author: string
            text: string
            publishedAt: Date
            likeCount: number
            replyCount: number
            videoId: string
            videoTitle: string
          }>
        >)

    const [
      countResult,
      videosResult,
      statsResult,
      topVideoResult,
      mentionsCountResult,
      mentionsResult,
    ] = await Promise.all([
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
      Result.tryPromise({
        try: () => countSponsorMentions(sponsor.sponsorId),
        catch: (cause) =>
          new SponsorQueryError({
            message:
              cause instanceof Error
                ? cause.message
                : 'Failed to count sponsor mentions',
          }),
      }),
      Result.tryPromise({
        try: () =>
          loadSponsorMentions({
            sponsorId: sponsor.sponsorId,
            page: mentionsPage,
            pageSize: mentionsPageSize,
          }),
        catch: (cause) =>
          new SponsorQueryError({
            message:
              cause instanceof Error
                ? cause.message
                : 'Failed to load sponsor mentions',
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

    if (mentionsCountResult.status === 'error') {
      return mentionsCountResult
    }

    if (mentionsResult.status === 'error') {
      return mentionsResult
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
        totalXViews: asNumber(statsRow?.totalXViews),
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
      sponsorMentions: {
        items: mentionsResult.value.map((c) => ({
          ...c,
          publishedAt: asIsoDate(c.publishedAt),
        })),
        pagination: toPagination({
          page: mentionsPage,
          pageSize: mentionsPageSize,
          total: asNumber(mentionsCountResult.value[0]?.total),
        }),
      },
    })
  }
}
