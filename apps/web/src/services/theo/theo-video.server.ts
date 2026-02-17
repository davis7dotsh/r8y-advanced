import { Result, TaggedError } from 'better-result'
import { desc, eq, sql } from 'drizzle-orm'
import { comments, sponsorToVideos, sponsors, videos } from 'theo-data/schema'
import { db as defaultDb } from '@/db/client.server'
import { COMMENT_PAGE_SIZE } from './theo.types'
import {
  asIsoDate,
  asNumber,
  normalizePage,
  toOffset,
  toPagination,
  toSponsorSlug,
} from './theo-utils'

const loadVideoRowsFromDb = (db: typeof defaultDb, videoId: string) =>
  db
    .select({
      videoId: videos.videoId,
      title: videos.title,
      description: videos.description,
      thumbnailUrl: videos.thumbnailUrl,
      publishedAt: videos.publishedAt,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
      sponsorId: sponsors.sponsorId,
      sponsorName: sponsors.name,
    })
    .from(videos)
    .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
    .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
    .where(eq(videos.videoId, videoId))

const countCommentsFromDb = (db: typeof defaultDb, videoId: string) =>
  db
    .select({ total: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.videoId, videoId))

const loadCommentsFromDb = (
  db: typeof defaultDb,
  input: {
    videoId: string
    commentsPage: number
    commentPageSize: number
  },
) =>
  db
    .select({
      commentId: comments.commentId,
      author: comments.author,
      text: comments.text,
      publishedAt: comments.publishedAt,
      likeCount: comments.likeCount,
      replyCount: comments.replyCount,
      isProcessed: comments.isProcessed,
      isEditingMistake: comments.isEditingMistake,
      isSponsorMention: comments.isSponsorMention,
      isQuestion: comments.isQuestion,
      isPositiveComment: comments.isPositiveComment,
    })
    .from(comments)
    .where(eq(comments.videoId, input.videoId))
    .orderBy(desc(comments.publishedAt))
    .limit(input.commentPageSize)
    .offset(toOffset(input.commentsPage, input.commentPageSize))

export namespace TheoVideoService {
  export class InvalidVideoInputError extends TaggedError(
    'InvalidVideoInputError',
  )<{
    message: string
  }>() {}

  export class VideoNotFoundError extends TaggedError('VideoNotFoundError')<{
    videoId: string
    message: string
  }>() {}

  export class VideoQueryError extends TaggedError('VideoQueryError')<{
    message: string
  }>() {}

  export const getById = async (
    deps: {
      db?: typeof defaultDb
      queries?: {
        loadVideoRows?: (videoId: string) => Promise<
          Array<{
            videoId: string
            title: string
            description: string
            thumbnailUrl: string
            publishedAt: Date
            viewCount: number
            likeCount: number
            commentCount: number
            sponsorId: string | null
            sponsorName: string | null
          }>
        >
        countComments?: (videoId: string) => Promise<Array<{ total: number }>>
        loadComments?: (input: {
          videoId: string
          commentsPage: number
          commentPageSize: number
        }) => Promise<
          Array<{
            commentId: string
            author: string
            text: string
            publishedAt: Date
            likeCount: number
            replyCount: number
            isProcessed: boolean
            isEditingMistake: boolean | null
            isSponsorMention: boolean | null
            isQuestion: boolean | null
            isPositiveComment: boolean | null
          }>
        >
      }
    },
    input: {
      videoId: string
      commentsPage?: number
      commentPageSize?: number
    },
  ) => {
    const videoId = input.videoId.trim()
    const commentsPage = normalizePage(input.commentsPage)
    const commentPageSize = input.commentPageSize ?? COMMENT_PAGE_SIZE

    if (!videoId) {
      return Result.err(
        new InvalidVideoInputError({
          message: 'videoId is required',
        }),
      )
    }

    const db = deps.db ?? defaultDb
    const loadVideoRows =
      deps.queries?.loadVideoRows ??
      ((requestedVideoId: string) =>
        loadVideoRowsFromDb(db, requestedVideoId) as Promise<
          Array<{
            videoId: string
            title: string
            description: string
            thumbnailUrl: string
            publishedAt: Date
            viewCount: number
            likeCount: number
            commentCount: number
            sponsorId: string | null
            sponsorName: string | null
          }>
        >)

    const videoResult = await Result.tryPromise({
      try: () => loadVideoRows(videoId),
      catch: (cause) =>
        new VideoQueryError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to load video details',
        }),
    })

    if (videoResult.status === 'error') {
      return videoResult
    }

    const videoRows = videoResult.value

    if (videoRows.length === 0) {
      return Result.err(
        new VideoNotFoundError({
          videoId,
          message: `Video ${videoId} not found`,
        }),
      )
    }

    const [firstVideo] = videoRows

    if (!firstVideo) {
      return Result.err(
        new VideoNotFoundError({
          videoId,
          message: `Video ${videoId} not found`,
        }),
      )
    }

    const sponsorsById = videoRows.reduce((acc, row) => {
      if (row.sponsorId && row.sponsorName) {
        acc.set(row.sponsorId, {
          sponsorId: row.sponsorId,
          name: row.sponsorName,
          slug: toSponsorSlug(row.sponsorName, row.sponsorId),
        })
      }

      return acc
    }, new Map<string, { sponsorId: string; name: string; slug: string }>())

    const countComments =
      deps.queries?.countComments ??
      ((requestedVideoId: string) => countCommentsFromDb(db, requestedVideoId))

    const loadComments =
      deps.queries?.loadComments ??
      ((queryInput: {
        videoId: string
        commentsPage: number
        commentPageSize: number
      }) =>
        loadCommentsFromDb(db, queryInput) as Promise<
          Array<{
            commentId: string
            author: string
            text: string
            publishedAt: Date
            likeCount: number
            replyCount: number
            isProcessed: boolean
            isEditingMistake: boolean | null
            isSponsorMention: boolean | null
            isQuestion: boolean | null
            isPositiveComment: boolean | null
          }>
        >)

    const [countResult, commentsResult] = await Promise.all([
      Result.tryPromise({
        try: () => countComments(videoId),
        catch: (cause) =>
          new VideoQueryError({
            message:
              cause instanceof Error
                ? cause.message
                : 'Failed to count comments',
          }),
      }),
      Result.tryPromise({
        try: () =>
          loadComments({
            videoId,
            commentsPage,
            commentPageSize,
          }),
        catch: (cause) =>
          new VideoQueryError({
            message:
              cause instanceof Error
                ? cause.message
                : 'Failed to load comments',
          }),
      }),
    ])

    if (countResult.status === 'error') {
      return countResult
    }

    if (commentsResult.status === 'error') {
      return commentsResult
    }

    return Result.ok({
      video: {
        videoId: firstVideo.videoId,
        title: firstVideo.title,
        description: firstVideo.description,
        thumbnailUrl: firstVideo.thumbnailUrl,
        publishedAt: asIsoDate(firstVideo.publishedAt),
        viewCount: firstVideo.viewCount,
        likeCount: firstVideo.likeCount,
        commentCount: firstVideo.commentCount,
        sponsors: Array.from(sponsorsById.values()),
      },
      comments: {
        items: commentsResult.value.map((comment) => ({
          ...comment,
          publishedAt: asIsoDate(comment.publishedAt),
        })),
        pagination: toPagination({
          page: commentsPage,
          pageSize: commentPageSize,
          total: asNumber(countResult.value[0]?.total),
        }),
      },
    })
  }
}
