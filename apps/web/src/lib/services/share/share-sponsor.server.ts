import { Result, TaggedError } from 'better-result'
import { desc, eq, sql } from 'drizzle-orm'
import {
  videos as theoVideos,
  sponsors as theoSponsors,
  sponsorToVideos as theoSponsorToVideos,
} from '@r8y/theo-data/schema'
import {
  videos as mickyVideos,
  sponsors as mickySponsors,
  sponsorToVideos as mickySponsorToVideos,
} from '@r8y/micky-data/schema'
import {
  videos as davisVideos,
  sponsors as davisSponsors,
  sponsorToVideos as davisSponsorToVideos,
} from '@r8y/davis-sync/schema'
import { db as theoDb } from '@/db/client.server'
import { davisDb } from '@/db/davis.client.server'
import { mickyDb } from '@/db/micky.client.server'

const VIDEO_PAGE_SIZE = 50

export type ShareSponsorData = {
  sponsor: {
    sponsorId: string
    name: string
    slug: string
    createdAt: string
  }
  stats: {
    totalViews: number
    averageViews: number
    lastPublishedAt: string | null
    totalXViews: number
    bestPerformingVideo: {
      videoId: string
      title: string
      viewCount: number
    } | null
  }
  videos: {
    items: Array<{
      videoId: string
      title: string
      thumbnailUrl: string
      publishedAt: string
      viewCount: number
      likeCount: number
      commentCount: number
      xPost: {
        url: string
        views: number | null
      } | null
    }>
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
}

const toSponsorSlug = (name: string, sponsorId: string) => {
  const slugBase = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const safeBase = slugBase.length > 0 ? slugBase : 'sponsor'
  const suffix = sponsorId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(-4)
    .padStart(4, '0')

  return `${safeBase}--${suffix}`
}

const normalizePage = (value: unknown) => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  return !Number.isFinite(parsed) || parsed < 1 ? 1 : Math.floor(parsed)
}

const asNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const asIsoDate = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toOffset = (page: number, pageSize: number) => (page - 1) * pageSize

const toPagination = (input: {
  page: number
  pageSize: number
  total: number
}) => ({
  page: input.page,
  pageSize: input.pageSize,
  total: input.total,
  totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
})

const getChannelTables = (channel: 'theo' | 'davis' | 'micky') =>
  channel === 'theo'
    ? {
        db: theoDb,
        videos: theoVideos,
        sponsors: theoSponsors,
        sponsorToVideos: theoSponsorToVideos,
      }
    : channel === 'davis'
      ? {
          db: davisDb,
          videos: davisVideos,
          sponsors: davisSponsors,
          sponsorToVideos: davisSponsorToVideos,
        }
      : {
          db: mickyDb,
          videos: mickyVideos,
          sponsors: mickySponsors,
          sponsorToVideos: mickySponsorToVideos,
        }

export namespace ShareSponsorService {
  export class InvalidChannelError extends TaggedError('InvalidChannelError')<{
    message: string
  }>() {}

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

  export const getSponsor = async (
    channel: string,
    slug: string,
    page?: number,
  ) => {
    const normalizedSlug = slug.trim().toLowerCase()
    const normalizedPage = normalizePage(page)
    const pageSize = VIDEO_PAGE_SIZE

    if (channel !== 'theo' && channel !== 'davis' && channel !== 'micky') {
      return Result.err(
        new InvalidChannelError({ message: `Unknown channel: ${channel}` }),
      )
    }

    if (!normalizedSlug) {
      return Result.err(
        new InvalidSponsorInputError({ message: 'sponsor slug is required' }),
      )
    }

    const slugSuffix = (normalizedSlug.split('--').pop() ?? '')
      .replace(/[^a-z0-9]/g, '')
      .slice(-4)

    if (!slugSuffix) {
      return Result.err(
        new SponsorNotFoundError({
          slug: normalizedSlug,
          message: `Sponsor ${normalizedSlug} not found`,
        }),
      )
    }

    const { db, videos, sponsors, sponsorToVideos } = getChannelTables(channel)

    const candidatesResult = await Result.tryPromise({
      try: () =>
        db
          .select({
            sponsorId: sponsors.sponsorId,
            name: sponsors.name,
            createdAt: sponsors.createdAt,
          })
          .from(sponsors)
          .where(
            sql`lower(regexp_replace(${sponsors.sponsorId}, '[^a-z0-9]', '', 'g')) like ${'%' + slugSuffix}`,
          ),
      catch: (cause) =>
        new SponsorQueryError({
          message:
            cause instanceof Error ? cause.message : 'Failed to load sponsors',
        }),
    })

    if (candidatesResult.status === 'error') return candidatesResult

    const sponsor = candidatesResult.value.find(
      (c) => toSponsorSlug(c.name, c.sponsorId) === normalizedSlug,
    )

    if (!sponsor) {
      return Result.err(
        new SponsorNotFoundError({
          slug: normalizedSlug,
          message: `Sponsor ${normalizedSlug} not found`,
        }),
      )
    }

    const [countResult, videosResult, statsResult, topVideoResult] =
      await Promise.all([
        Result.tryPromise({
          try: () =>
            db
              .select({ total: sql<number>`count(*)` })
              .from(sponsorToVideos)
              .where(eq(sponsorToVideos.sponsorId, sponsor.sponsorId)),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to count videos',
            }),
        }),
        Result.tryPromise({
          try: () =>
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
              })
              .from(sponsorToVideos)
              .innerJoin(videos, eq(videos.videoId, sponsorToVideos.videoId))
              .where(eq(sponsorToVideos.sponsorId, sponsor.sponsorId))
              .orderBy(desc(videos.publishedAt))
              .limit(pageSize)
              .offset(toOffset(normalizedPage, pageSize)),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to load videos',
            }),
        }),
        Result.tryPromise({
          try: () =>
            db
              .select({
                totalViews: sql<number>`coalesce(sum(${videos.viewCount}), 0)`,
                averageViews: sql<number>`coalesce(avg(${videos.viewCount}), 0)`,
                lastPublishedAt: sql<Date | null>`max(${videos.publishedAt})`,
                totalXViews: sql<number>`coalesce(sum(${videos.xViews}), 0)`,
              })
              .from(sponsorToVideos)
              .innerJoin(videos, eq(videos.videoId, sponsorToVideos.videoId))
              .where(eq(sponsorToVideos.sponsorId, sponsor.sponsorId)),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error ? cause.message : 'Failed to load stats',
            }),
        }),
        Result.tryPromise({
          try: () =>
            db
              .select({
                videoId: videos.videoId,
                title: videos.title,
                viewCount: videos.viewCount,
              })
              .from(sponsorToVideos)
              .innerJoin(videos, eq(videos.videoId, sponsorToVideos.videoId))
              .where(eq(sponsorToVideos.sponsorId, sponsor.sponsorId))
              .orderBy(desc(videos.viewCount), desc(videos.publishedAt))
              .limit(1),
          catch: (cause) =>
            new SponsorQueryError({
              message:
                cause instanceof Error
                  ? cause.message
                  : 'Failed to load top video',
            }),
        }),
      ])

    if (countResult.status === 'error') return countResult
    if (videosResult.status === 'error') return videosResult
    if (statsResult.status === 'error') return statsResult
    if (topVideoResult.status === 'error') return topVideoResult

    const statsRow = statsResult.value[0]
    const topVideo = topVideoResult.value[0]

    return Result.ok<ShareSponsorData>({
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
        items: videosResult.value.map((row) => ({
          videoId: row.videoId,
          title: row.title,
          thumbnailUrl: row.thumbnailUrl,
          publishedAt: asIsoDate(row.publishedAt),
          viewCount: row.viewCount,
          likeCount: row.likeCount,
          commentCount: row.commentCount,
          xPost: row.xUrl ? { url: row.xUrl, views: row.xViews } : null,
        })),
        pagination: toPagination({
          page: normalizedPage,
          pageSize,
          total: asNumber(countResult.value[0]?.total),
        }),
      },
    })
  }
}
