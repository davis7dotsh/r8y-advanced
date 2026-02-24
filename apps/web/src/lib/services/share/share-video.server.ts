import { Result, TaggedError } from 'better-result'
import { eq } from 'drizzle-orm'
import {
  videos as theoVideos,
  sponsors as theoSponsors,
  sponsorToVideos as theoSponsorToVideos,
} from '@r8y/theo-data/schema'
import {
  videos as davisVideos,
  sponsors as davisSponsors,
  sponsorToVideos as davisSponsorToVideos,
} from '@r8y/davis-sync/schema'
import { db as theoDb } from '@/db/client.server'
import { davisDb } from '@/db/davis.client.server'

export type ShareVideoData = {
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  sponsors: { name: string }[]
  xPost: {
    url: string
    views: number | null
    likes: number | null
    reposts: number | null
    comments: number | null
  } | null
}

const loadTheoVideo = (videoId: string) =>
  theoDb
    .select({
      videoId: theoVideos.videoId,
      title: theoVideos.title,
      thumbnailUrl: theoVideos.thumbnailUrl,
      publishedAt: theoVideos.publishedAt,
      viewCount: theoVideos.viewCount,
      likeCount: theoVideos.likeCount,
      commentCount: theoVideos.commentCount,
      xUrl: theoVideos.xUrl,
      xViews: theoVideos.xViews,
      xLikes: theoVideos.xLikes,
      xReposts: theoVideos.xReposts,
      xComments: theoVideos.xComments,
      sponsorId: theoSponsors.sponsorId,
      sponsorName: theoSponsors.name,
    })
    .from(theoVideos)
    .leftJoin(theoSponsorToVideos, eq(theoSponsorToVideos.videoId, theoVideos.videoId))
    .leftJoin(theoSponsors, eq(theoSponsors.sponsorId, theoSponsorToVideos.sponsorId))
    .where(eq(theoVideos.videoId, videoId))

const loadDavisVideo = (videoId: string) =>
  davisDb
    .select({
      videoId: davisVideos.videoId,
      title: davisVideos.title,
      thumbnailUrl: davisVideos.thumbnailUrl,
      publishedAt: davisVideos.publishedAt,
      viewCount: davisVideos.viewCount,
      likeCount: davisVideos.likeCount,
      commentCount: davisVideos.commentCount,
      xUrl: davisVideos.xUrl,
      xViews: davisVideos.xViews,
      xLikes: davisVideos.xLikes,
      xReposts: davisVideos.xReposts,
      xComments: davisVideos.xComments,
      sponsorId: davisSponsors.sponsorId,
      sponsorName: davisSponsors.name,
    })
    .from(davisVideos)
    .leftJoin(davisSponsorToVideos, eq(davisSponsorToVideos.videoId, davisVideos.videoId))
    .leftJoin(davisSponsors, eq(davisSponsors.sponsorId, davisSponsorToVideos.sponsorId))
    .where(eq(davisVideos.videoId, videoId))

export namespace ShareVideoService {
  export class VideoNotFoundError extends TaggedError('VideoNotFoundError')<{
    videoId: string
    message: string
  }>() {}

  export class VideoQueryError extends TaggedError('VideoQueryError')<{
    message: string
  }>() {}

  export class InvalidChannelError extends TaggedError('InvalidChannelError')<{
    message: string
  }>() {}

  export const getVideo = async (channel: string, videoId: string) => {
    const trimmedId = videoId.trim()

    if (!trimmedId) {
      return Result.err(
        new VideoNotFoundError({ videoId, message: 'videoId is required' }),
      )
    }

    if (channel !== 'theo' && channel !== 'davis') {
      return Result.err(
        new InvalidChannelError({ message: `Unknown channel: ${channel}` }),
      )
    }

    const loader = channel === 'theo' ? loadTheoVideo : loadDavisVideo

    const queryResult = await Result.tryPromise({
      try: () => loader(trimmedId),
      catch: (cause) =>
        new VideoQueryError({
          message:
            cause instanceof Error ? cause.message : 'Failed to load video',
        }),
    })

    if (queryResult.status === 'error') return queryResult

    const rows = queryResult.value

    if (rows.length === 0) {
      return Result.err(
        new VideoNotFoundError({
          videoId: trimmedId,
          message: `Video ${trimmedId} not found`,
        }),
      )
    }

    const first = rows[0]!
    const sponsors = rows
      .filter((r) => r.sponsorId && r.sponsorName)
      .reduce((seen, r) => {
        if (!seen.has(r.sponsorId!)) seen.set(r.sponsorId!, { name: r.sponsorName! })
        return seen
      }, new Map<string, { name: string }>())

    return Result.ok<ShareVideoData>({
      videoId: first.videoId,
      title: first.title,
      thumbnailUrl: first.thumbnailUrl,
      publishedAt:
        first.publishedAt instanceof Date
          ? first.publishedAt.toISOString()
          : String(first.publishedAt),
      viewCount: first.viewCount,
      likeCount: first.likeCount,
      commentCount: first.commentCount,
      sponsors: Array.from(sponsors.values()),
      xPost: first.xUrl
        ? {
            url: first.xUrl,
            views: first.xViews,
            likes: first.xLikes,
            reposts: first.xReposts,
            comments: first.xComments,
          }
        : null,
    })
  }
}
