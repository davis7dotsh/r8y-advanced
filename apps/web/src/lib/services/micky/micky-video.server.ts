import { Result, TaggedError } from 'better-result'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
  comments,
  sponsorToVideos,
  sponsors,
  videos,
} from '@r8y/micky-data/schema'
import { Client } from '@xdevplatform/xdk'
import { mickyDb as defaultDb } from '@/db/micky.client.server'
import { env } from '$env/dynamic/private'
import type {
  CommentsFilter,
  CommentsSort,
} from '@/features/micky/micky-search-params'
import { COMMENT_PAGE_SIZE } from './micky.types'
import {
  asIsoDate,
  asNumber,
  normalizePage,
  toOffset,
  toPagination,
  toSponsorSlug,
} from './micky-utils'

const FLAG_COLUMNS = {
  isEditingMistake: comments.isEditingMistake,
  isSponsorMention: comments.isSponsorMention,
  isQuestion: comments.isQuestion,
  isPositiveComment: comments.isPositiveComment,
} as const

const buildCommentWhere = (videoId: string, filter: CommentsFilter) => {
  const byVideo = eq(comments.videoId, videoId)
  if (filter === 'all') return byVideo
  return and(byVideo, eq(FLAG_COLUMNS[filter], true))
}

const buildCommentOrderBy = (sort: CommentsSort) =>
  sort === 'publishedAt' ? desc(comments.publishedAt) : desc(comments.likeCount)

const X_POST_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
])

const parseXPostUrl = (rawUrl: string) => {
  const url = rawUrl.trim()

  if (!url) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (!X_POST_HOSTS.has(parsed.hostname.toLowerCase())) {
    return null
  }

  const match = parsed.pathname.match(/\/status\/(\d+)/)
  const postId = match?.[1]
  if (!postId) {
    return null
  }

  return {
    postId,
    canonicalUrl: `https://x.com/i/web/status/${postId}`,
  }
}

const asRecord = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const readMetric = (
  metrics: Record<string, unknown> | null,
  keys: string[],
) => {
  if (!metrics) {
    return null
  }

  const match = keys
    .map((key) => metrics[key])
    .find((value) => typeof value === 'number' && Number.isFinite(value))

  return typeof match === 'number' ? Math.floor(match) : null
}

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
      xUrl: videos.xUrl,
      xViews: videos.xViews,
      xLikes: videos.xLikes,
      xReposts: videos.xReposts,
      xComments: videos.xComments,
      sponsorId: sponsors.sponsorId,
      sponsorName: sponsors.name,
    })
    .from(videos)
    .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
    .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
    .where(eq(videos.videoId, videoId))

const countCommentsFromDb = (
  db: typeof defaultDb,
  videoId: string,
  filter: CommentsFilter,
) =>
  db
    .select({ total: sql<number>`count(*)` })
    .from(comments)
    .where(buildCommentWhere(videoId, filter))

const loadCommentsFromDb = (
  db: typeof defaultDb,
  input: {
    videoId: string
    commentsPage: number
    commentPageSize: number
    commentsSort: CommentsSort
    commentsFilter: CommentsFilter
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
    .where(buildCommentWhere(input.videoId, input.commentsFilter))
    .orderBy(buildCommentOrderBy(input.commentsSort))
    .limit(input.commentPageSize)
    .offset(toOffset(input.commentsPage, input.commentPageSize))

export namespace MickyVideoService {
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

  export class InvalidXPostUrlError extends TaggedError(
    'InvalidXPostUrlError',
  )<{
    message: string
  }>() {}

  export class XApiConfigError extends TaggedError('XApiConfigError')<{
    message: string
  }>() {}

  export class XPostFetchError extends TaggedError('XPostFetchError')<{
    message: string
  }>() {}

  export class VideoUpdateError extends TaggedError('VideoUpdateError')<{
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
            xUrl: string | null
            xViews: number | null
            xLikes: number | null
            xReposts: number | null
            xComments: number | null
            sponsorId: string | null
            sponsorName: string | null
          }>
        >
        countComments?: (videoId: string) => Promise<Array<{ total: number }>>
        loadComments?: (input: {
          videoId: string
          commentsPage: number
          commentPageSize: number
          commentsSort: CommentsSort
          commentsFilter: CommentsFilter
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
      commentsSort?: CommentsSort
      commentsFilter?: CommentsFilter
    },
  ) => {
    const videoId = input.videoId.trim()
    const commentsPage = normalizePage(input.commentsPage)
    const commentPageSize = input.commentPageSize ?? COMMENT_PAGE_SIZE
    const commentsSort: CommentsSort = input.commentsSort ?? 'likeCount'
    const commentsFilter: CommentsFilter = input.commentsFilter ?? 'all'

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
            xUrl: string | null
            xViews: number | null
            xLikes: number | null
            xReposts: number | null
            xComments: number | null
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
      ((requestedVideoId: string) =>
        countCommentsFromDb(db, requestedVideoId, commentsFilter))

    const loadComments =
      deps.queries?.loadComments ??
      ((queryInput: {
        videoId: string
        commentsPage: number
        commentPageSize: number
        commentsSort: CommentsSort
        commentsFilter: CommentsFilter
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
            commentsSort,
            commentsFilter,
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
        xPost: firstVideo.xUrl
          ? {
              url: firstVideo.xUrl,
              views: firstVideo.xViews,
              likes: firstVideo.xLikes,
              reposts: firstVideo.xReposts,
              comments: firstVideo.xComments,
            }
          : null,
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

  export const linkXPost = async (
    deps: {
      db?: typeof defaultDb
      xClient?: {
        posts: {
          getById: (
            id: string,
            options?: {
              tweetFields?: string[]
            },
          ) => Promise<{
            data?: {
              publicMetrics?: Record<string, unknown>
            }
          }>
        }
      }
      queries?: {
        updateVideoXPost?: (input: {
          videoId: string
          xUrl: string
          xViews: number | null
          xLikes: number | null
          xReposts: number | null
          xComments: number | null
        }) => Promise<Array<{ videoId: string }>>
      }
    },
    input: {
      videoId: string
      xPostUrl: string
    },
  ) => {
    const videoId = input.videoId.trim()
    if (!videoId) {
      return Result.err(
        new InvalidVideoInputError({
          message: 'videoId is required',
        }),
      )
    }

    const parsedUrl = parseXPostUrl(input.xPostUrl)
    if (!parsedUrl) {
      return Result.err(
        new InvalidXPostUrlError({
          message: 'xPostUrl must be a valid x.com or twitter.com post URL',
        }),
      )
    }

    const bearerToken = env.X_API_KEY?.trim()
    if (!deps.xClient && !bearerToken) {
      return Result.err(
        new XApiConfigError({
          message: 'X_API_KEY is required',
        }),
      )
    }

    const xClient = deps.xClient ?? new Client({ bearerToken })
    const db = deps.db ?? defaultDb
    const updateVideoXPost =
      deps.queries?.updateVideoXPost ??
      ((updateInput: {
        videoId: string
        xUrl: string
        xViews: number | null
        xLikes: number | null
        xReposts: number | null
        xComments: number | null
      }) =>
        db
          .update(videos)
          .set({
            xUrl: updateInput.xUrl,
            xViews: updateInput.xViews,
            xLikes: updateInput.xLikes,
            xReposts: updateInput.xReposts,
            xComments: updateInput.xComments,
          })
          .where(eq(videos.videoId, updateInput.videoId))
          .returning({ videoId: videos.videoId }))

    const xPostResult = await Result.tryPromise({
      try: () =>
        xClient.posts.getById(parsedUrl.postId, {
          tweetFields: ['public_metrics'],
        }),
      catch: (cause) =>
        new XPostFetchError({
          message:
            cause instanceof Error ? cause.message : 'Failed to fetch X post',
        }),
    })

    if (xPostResult.status === 'error') {
      return xPostResult
    }

    const publicMetrics = asRecord(xPostResult.value.data?.publicMetrics)
    const payload = {
      videoId,
      xUrl: parsedUrl.canonicalUrl,
      xViews: readMetric(publicMetrics, [
        'impression_count',
        'impressionCount',
        'view_count',
        'viewCount',
      ]),
      xLikes: readMetric(publicMetrics, ['like_count', 'likeCount']),
      xReposts: readMetric(publicMetrics, [
        'retweet_count',
        'retweetCount',
        'repost_count',
        'repostCount',
      ]),
      xComments: readMetric(publicMetrics, ['reply_count', 'replyCount']),
    }

    const updateResult = await Result.tryPromise({
      try: () => updateVideoXPost(payload),
      catch: (cause) =>
        new VideoUpdateError({
          message:
            cause instanceof Error
              ? cause.message
              : 'Failed to update video X metadata',
        }),
    })

    if (updateResult.status === 'error') {
      return updateResult
    }

    if (updateResult.value.length === 0) {
      return Result.err(
        new VideoNotFoundError({
          videoId,
          message: `Video ${videoId} not found`,
        }),
      )
    }

    return Result.ok({
      xPost: {
        url: payload.xUrl,
        views: payload.xViews,
        likes: payload.xLikes,
        reposts: payload.xReposts,
        comments: payload.xComments,
      },
    })
  }
}
