import { createHash } from "node:crypto";
import { Client } from "@xdevplatform/xdk";
import { Result, TaggedError } from "better-result";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { THEO_CHANNEL_INFO } from "../../THEO_CHANNEL_INFO";
import { db as defaultDb } from "../../db/client";
import {
  comments,
  notifications,
  sponsorToVideos,
  sponsors,
  videos,
} from "../../db/schema";
import { AiEnrichmentService } from "../ai-enrichment";
import { StateService } from "../state";
import { YouTubeApiService } from "../youtube-api";

type Logger = Pick<Console, "info" | "warn" | "error">;
const MAX_COMMENTS_PER_VIDEO = 100;
const MAX_COMMENT_CLASSIFICATIONS_PER_CRAWL = 100;
const X_POST_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);

const createSponsorId = (sponsorKey: string) =>
  `sponsor_${createHash("sha1").update(sponsorKey).digest("hex").slice(0, 40)}`;

const createNotificationId = (type: "discord_video_live" | "todoist_video_live", videoId: string) =>
  `${type}:${videoId}`;

const logStageFailure = (
  stageFailures: { stage: string; message: string }[],
  stage: string,
  message: string,
) => {
  if (stageFailures.length >= 25) {
    return;
  }

  stageFailures.push({ stage, message });
};

const logInfo = (
  logger: Logger | undefined,
  scope: string,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.info?.(`[${scope}] ${step}`, details ?? {});
};

const logWarn = (
  logger: Logger | undefined,
  scope: string,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.warn?.(`[${scope}] ${step}`, details ?? {});
};

const logError = (
  logger: Logger | undefined,
  scope: string,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.error?.(`[${scope}] ${step}`, details ?? {});
};

const createPool = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) => {
  if (items.length === 0) {
    return [] as R[];
  }

  const results = new Array<R>(items.length);
  let index = 0;

  const runWorker = async () => {
    while (true) {
      const current = index;
      index += 1;

      if (current >= items.length) {
        return;
      }

      results[current] = await worker(items[current]!, current);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return results;
};

const parseRssVideoIds = (xml: string) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const parsed = parser.parse(xml) as {
    feed?: {
      entry?:
        | {
            videoId?: string;
          }
        | {
            videoId?: string;
          }[];
    };
  };

  const entry = parsed.feed?.entry;

  if (!entry) {
    return [] as string[];
  }

  const entries = Array.isArray(entry) ? entry : [entry];
  return [...new Set(entries.map((item) => item.videoId).filter((id): id is string => Boolean(id)))];
};

const parseXPostUrl = (rawUrl: string) => {
  const value = rawUrl.trim();

  if (!value) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!X_POST_HOSTS.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  const match = parsed.pathname.match(/\/status\/(\d+)/);
  const postId = match?.[1];
  if (!postId) {
    return null;
  }

  return {
    postId,
    canonicalUrl: `https://x.com/i/web/status/${postId}`,
  };
};

const asRecord = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const readMetric = (metrics: Record<string, unknown> | null, keys: string[]) => {
  if (!metrics) {
    return null;
  }

  const matched = keys
    .map((key) => metrics[key])
    .find((entry) => typeof entry === "number" && Number.isFinite(entry));

  return typeof matched === "number" ? Math.floor(matched) : null;
};

export namespace CrawlService {
  export class InvalidCrawlInputError extends TaggedError("InvalidCrawlInputError")<{
    message: string;
  }>() {}

  export class CrawlPersistenceError extends TaggedError("CrawlPersistenceError")<{
    message: string;
  }>() {}

  export class CrawlExternalError extends TaggedError("CrawlExternalError")<{
    message: string;
  }>() {}

  const refreshXMetrics = async (
    deps: {
      db: typeof defaultDb;
      logger?: Logger;
    },
    input: {
      videoId: string;
    },
  ) => {
    const { db, logger } = deps;
    const linkedVideoResult = await Result.tryPromise({
      try: () =>
        db.query.videos.findFirst({
          where: eq(videos.videoId, input.videoId),
          columns: {
            xUrl: true,
          },
        }),
      catch: (cause) =>
        new CrawlPersistenceError({
          message:
            cause instanceof Error
              ? cause.message
              : "Failed while loading linked X url for video",
        }),
    });

    if (linkedVideoResult.status === "error") {
      return linkedVideoResult;
    }

    const linkedUrl = linkedVideoResult.value?.xUrl;
    if (!linkedUrl) {
      return Result.ok({
        refreshed: false,
        reason: "no-linked-url",
      } as const);
    }

    const parsed = parseXPostUrl(linkedUrl);
    if (!parsed) {
      return Result.err(
        new CrawlExternalError({
          message: `Invalid linked X URL for ${input.videoId}: ${linkedUrl}`,
        }),
      );
    }

    const bearerToken = process.env.X_API_KEY?.trim();
    if (!bearerToken) {
      logWarn(logger, "crawlVideo", "x api key missing; skipping x refresh", {
        videoId: input.videoId,
      });
      return Result.ok({
        refreshed: false,
        reason: "missing-api-key",
      } as const);
    }

    const client = new Client({ bearerToken });
    const xPostResult = await Result.tryPromise(
      {
        try: () =>
          client.posts.getById(parsed.postId, {
            tweetFields: ["public_metrics"],
          }),
        catch: (cause) =>
          new CrawlExternalError({
            message:
              cause instanceof Error ? cause.message : "Failed while requesting X post metrics",
          }),
      },
      {
        retry: {
          times: 2,
          delayMs: 250,
          backoff: "exponential",
        },
      },
    );

    if (xPostResult.status === "error") {
      return xPostResult;
    }

    const publicMetrics = asRecord(xPostResult.value.data?.publicMetrics);
    const metrics = {
      xUrl: parsed.canonicalUrl,
      xViews: readMetric(publicMetrics, [
        "impression_count",
        "impressionCount",
        "view_count",
        "viewCount",
      ]),
      xLikes: readMetric(publicMetrics, ["like_count", "likeCount"]),
      xReposts: readMetric(publicMetrics, [
        "retweet_count",
        "retweetCount",
        "repost_count",
        "repostCount",
      ]),
      xComments: readMetric(publicMetrics, ["reply_count", "replyCount"]),
    };

    const updateResult = await Result.tryPromise({
      try: () =>
        db
          .update(videos)
          .set({
            xUrl: metrics.xUrl,
            xViews: metrics.xViews,
            xLikes: metrics.xLikes,
            xReposts: metrics.xReposts,
            xComments: metrics.xComments,
          })
          .where(eq(videos.videoId, input.videoId)),
      catch: (cause) =>
        new CrawlPersistenceError({
          message:
            cause instanceof Error ? cause.message : "Failed while saving X post metrics",
        }),
    });

    if (updateResult.status === "error") {
      return updateResult;
    }

    return Result.ok({
      refreshed: true,
      metrics,
    } as const);
  };

  export const crawlVideo = async (
    deps: {
      db?: typeof defaultDb;
      logger?: Logger;
    },
    input: {
      videoId: string;
      sendNotifications: boolean;
    },
  ) => {
    const videoId = input.videoId.trim();
    const logger = deps.logger;

    if (!videoId) {
      logError(logger, "crawlVideo", "invalid input", {
        reason: "videoId is required",
      });
      return Result.err(
        new InvalidCrawlInputError({
          message: "videoId is required",
        }),
      );
    }

    const db = deps.db ?? defaultDb;
    const stageFailures: { stage: string; message: string }[] = [];

    logInfo(logger, "crawlVideo", "step 1/7 fetch video metadata", {
      videoId,
      sendNotifications: input.sendNotifications,
    });
    const videoResult = await YouTubeApiService.getVideoById(videoId, { logger });
    if (videoResult.status === "error") {
      logError(logger, "crawlVideo", "failed to fetch video metadata", {
        videoId,
        error: videoResult.error.message,
      });
      return Result.err(
        new CrawlExternalError({
          message: videoResult.error.message,
        }),
      );
    }

    logInfo(logger, "crawlVideo", "step 2/7 fetch top-level comments", {
      videoId,
      maxComments: MAX_COMMENTS_PER_VIDEO,
    });
    const commentResult = await YouTubeApiService.listTopLevelComments(videoId, {
      logger,
      maxComments: MAX_COMMENTS_PER_VIDEO,
    });
    if (commentResult.status === "error") {
      logError(logger, "crawlVideo", "failed to fetch comments", {
        videoId,
        error: commentResult.error.message,
      });
      return Result.err(
        new CrawlExternalError({
          message: commentResult.error.message,
        }),
      );
    }

    logInfo(logger, "crawlVideo", "step 3/7 persist video and comments", {
      videoId,
      fetchedCommentCount: commentResult.value.comments.length,
      commentFetchLimited: commentResult.value.isLimited,
    });
    const persistedResult = await Result.tryPromise(
      {
        try: async () => {
          const existingVideo = await db.query.videos.findFirst({
            where: eq(videos.videoId, videoId),
            columns: { videoId: true },
          });

          await db
            .insert(videos)
            .values(videoResult.value)
            .onConflictDoUpdate({
              target: videos.videoId,
              set: {
                title: videoResult.value.title,
                description: videoResult.value.description,
                thumbnailUrl: videoResult.value.thumbnailUrl,
                publishedAt: videoResult.value.publishedAt,
                viewCount: videoResult.value.viewCount,
                likeCount: videoResult.value.likeCount,
                commentCount: videoResult.value.commentCount,
              },
            });

          const existingComments = await db.query.comments.findMany({
            where: eq(comments.videoId, videoId),
          });

          const existingById = new Map(
            existingComments.map((comment) => [comment.commentId, comment]),
          );

          let insertedComments = 0;
          let updatedComments = 0;

          for (const remoteComment of commentResult.value.comments) {
            const existing = existingById.get(remoteComment.commentId);

            if (!existing) {
              await db.insert(comments).values({
                commentId: remoteComment.commentId,
                videoId,
                text: remoteComment.text,
                author: remoteComment.author,
                publishedAt: remoteComment.publishedAt,
                likeCount: remoteComment.likeCount,
                replyCount: remoteComment.replyCount,
                isEditingMistake: null,
                isSponsorMention: null,
                isQuestion: null,
                isPositiveComment: null,
                isProcessed: false,
              });
              insertedComments += 1;
              continue;
            }

            const textChanged = existing.text !== remoteComment.text;

            await db
              .update(comments)
              .set({
                text: remoteComment.text,
                author: remoteComment.author,
                publishedAt: remoteComment.publishedAt,
                likeCount: remoteComment.likeCount,
                replyCount: remoteComment.replyCount,
                isEditingMistake: textChanged ? null : existing.isEditingMistake,
                isSponsorMention: textChanged ? null : existing.isSponsorMention,
                isQuestion: textChanged ? null : existing.isQuestion,
                isPositiveComment: textChanged ? null : existing.isPositiveComment,
                isProcessed: textChanged ? false : existing.isProcessed,
              })
              .where(eq(comments.commentId, remoteComment.commentId));

            updatedComments += 1;
          }

          let staleCommentIds: string[] = [];

          if (!commentResult.value.isLimited) {
            const incomingCommentIds = new Set(
              commentResult.value.comments.map((comment) => comment.commentId),
            );
            staleCommentIds = existingComments
              .map((comment) => comment.commentId)
              .filter((commentId) => !incomingCommentIds.has(commentId));

            if (staleCommentIds.length > 0) {
              await db
                .delete(comments)
                .where(
                  and(
                    eq(comments.videoId, videoId),
                    inArray(comments.commentId, staleCommentIds),
                  ),
                );
            }
          } else {
            logInfo(logger, "crawlVideo", "comment fetch was capped; skipping stale deletes", {
              videoId,
              maxComments: MAX_COMMENTS_PER_VIDEO,
            });
          }

          return {
            isNewVideo: !existingVideo,
            insertedComments,
            updatedComments,
            deletedComments: staleCommentIds.length,
          };
        },
        catch: (cause) =>
          new CrawlPersistenceError({
            message:
              cause instanceof Error
                ? cause.message
                : "Failed while persisting video/comments",
          }),
      },
    );

    if (persistedResult.status === "error") {
      logError(logger, "crawlVideo", "failed to persist video/comments", {
        videoId,
        error: persistedResult.error.message,
      });
      return persistedResult;
    }

    logInfo(logger, "crawlVideo", "video/comment persistence complete", {
      videoId,
      isNewVideo: persistedResult.value.isNewVideo,
      commentsInserted: persistedResult.value.insertedComments,
      commentsUpdated: persistedResult.value.updatedComments,
      commentsDeleted: persistedResult.value.deletedComments,
    });

    logInfo(logger, "crawlVideo", "step 4/8 refresh linked X metrics", {
      videoId,
    });
    const xRefreshResult = await refreshXMetrics({ db, logger }, { videoId });

    if (xRefreshResult.status === "error") {
      logStageFailure(stageFailures, "x-refresh", xRefreshResult.error.message);
      logWarn(logger, "crawlVideo", "x refresh failed; continuing", {
        videoId,
        error: xRefreshResult.error.message,
      });
    } else {
      logInfo(logger, "crawlVideo", "x refresh stage complete", {
        videoId,
        refreshed: xRefreshResult.value.refreshed,
        reason: xRefreshResult.value.refreshed ? null : xRefreshResult.value.reason,
      });
    }

    logInfo(logger, "crawlVideo", "step 5/8 run sponsor extraction", {
      videoId,
    });
    const sponsorResult = await AiEnrichmentService.extractSponsor({
      logger,
      input: {
        videoTitle: videoResult.value.title,
        videoDescription: videoResult.value.description,
        sponsorPrompt: THEO_CHANNEL_INFO.sponsorPrompt,
      },
    });

    if (sponsorResult.status === "error") {
      logStageFailure(stageFailures, "sponsor", sponsorResult.error.message);
      logWarn(logger, "crawlVideo", "sponsor extraction failed; continuing", {
        videoId,
        error: sponsorResult.error.message,
      });
    } else {
      const sponsorPersistResult = await Result.tryPromise(
        {
          try: async () => {
            if (!sponsorResult.value.hasSponsor) {
              await db
                .delete(sponsorToVideos)
                .where(eq(sponsorToVideos.videoId, videoId));
              return { linked: false };
            }

            const sponsorId = createSponsorId(sponsorResult.value.sponsorKey);

            await db
              .insert(sponsors)
              .values({
                sponsorId,
                sponsorKey: sponsorResult.value.sponsorKey,
                name: sponsorResult.value.sponsorName,
              })
              .onConflictDoUpdate({
                target: sponsors.sponsorKey,
                set: {
                  name: sponsorResult.value.sponsorName,
                },
              });

            await db
              .delete(sponsorToVideos)
              .where(
                and(
                  eq(sponsorToVideos.videoId, videoId),
                  ne(sponsorToVideos.sponsorId, sponsorId),
                ),
              );

            await db
              .insert(sponsorToVideos)
              .values({
                sponsorId,
                videoId,
              })
              .onConflictDoNothing();

            return { linked: true };
          },
          catch: (cause) =>
            new CrawlPersistenceError({
              message:
                cause instanceof Error
                  ? cause.message
                  : "Failed while persisting sponsor linkage",
            }),
        },
      );

      if (sponsorPersistResult.status === "error") {
        logStageFailure(stageFailures, "sponsor-persist", sponsorPersistResult.error.message);
        logWarn(logger, "crawlVideo", "sponsor persistence failed; continuing", {
          videoId,
          error: sponsorPersistResult.error.message,
        });
      } else {
        logInfo(logger, "crawlVideo", "sponsor stage complete", {
          videoId,
          linkedSponsor: sponsorPersistResult.value.linked,
        });
      }
    }

    logInfo(logger, "crawlVideo", "step 6/8 load pending comments for AI", {
      videoId,
      maxClassifications: MAX_COMMENT_CLASSIFICATIONS_PER_CRAWL,
    });
    const pendingCommentsResult = await Result.tryPromise(
      {
        try: () =>
          db.query.comments.findMany({
            where: and(eq(comments.videoId, videoId), eq(comments.isProcessed, false)),
            orderBy: desc(comments.publishedAt),
            limit: MAX_COMMENT_CLASSIFICATIONS_PER_CRAWL,
          }),
        catch: (cause) =>
          new CrawlPersistenceError({
            message:
              cause instanceof Error
                ? cause.message
                : "Failed while loading pending comments",
          }),
      },
    );

    if (pendingCommentsResult.status === "error") {
      logError(logger, "crawlVideo", "failed to load pending comments", {
        videoId,
        error: pendingCommentsResult.error.message,
      });
      return pendingCommentsResult;
    }

    logInfo(logger, "crawlVideo", "step 7/8 classify pending comments", {
      videoId,
      pendingCommentCount: pendingCommentsResult.value.length,
      maxClassifications: MAX_COMMENT_CLASSIFICATIONS_PER_CRAWL,
    });
    let processedComments = 0;

    for (let index = 0; index < pendingCommentsResult.value.length; index += 1) {
      const comment = pendingCommentsResult.value[index]!;
      logInfo(logger, "crawlVideo", "classifying comment", {
        videoId,
        index: index + 1,
        total: pendingCommentsResult.value.length,
        commentId: comment.commentId,
      });

      const classificationResult = await AiEnrichmentService.classifyComment({
        logger,
        input: {
          videoTitle: videoResult.value.title,
          videoDescription: videoResult.value.description,
          commentText: comment.text,
          commentAuthor: comment.author,
        },
      });

      if (classificationResult.status === "error") {
        logStageFailure(
          stageFailures,
          "comment-ai",
          `${comment.commentId}: ${classificationResult.error.message}`,
        );
        logWarn(logger, "crawlVideo", "comment classification failed; leaving pending", {
          videoId,
          commentId: comment.commentId,
          error: classificationResult.error.message,
        });
        continue;
      }

      const updateResult = await Result.tryPromise(
        {
          try: () =>
            db
              .update(comments)
              .set({
                isEditingMistake: classificationResult.value.isEditingMistake,
                isSponsorMention: classificationResult.value.isSponsorMention,
                isQuestion: classificationResult.value.isQuestion,
                isPositiveComment: classificationResult.value.isPositiveComment,
                isProcessed: true,
              })
              .where(eq(comments.commentId, comment.commentId)),
          catch: (cause) =>
            new CrawlPersistenceError({
              message:
                cause instanceof Error
                  ? cause.message
                  : `Failed while saving classified comment ${comment.commentId}`,
            }),
        },
      );

      if (updateResult.status === "error") {
        logStageFailure(stageFailures, "comment-persist", updateResult.error.message);
        logWarn(logger, "crawlVideo", "failed to persist classified comment", {
          videoId,
          commentId: comment.commentId,
          error: updateResult.error.message,
        });
        continue;
      }

      processedComments += 1;
    }

    let notificationsInserted = 0;

    if (input.sendNotifications) {
      logInfo(logger, "crawlVideo", "step 8/8 emit live notifications", {
        videoId,
      });
      const notificationRows = [
        {
          notificationId: createNotificationId("discord_video_live", videoId),
          videoId,
          type: "discord_video_live" as const,
          message: `Theo video live: ${videoResult.value.title}`,
          commentId: null,
        },
        {
          notificationId: createNotificationId("todoist_video_live", videoId),
          videoId,
          type: "todoist_video_live" as const,
          message: `Theo video live: ${videoResult.value.title}`,
          commentId: null,
        },
      ];

      const notificationResult = await Result.tryPromise(
        {
          try: () =>
            db
              .insert(notifications)
              .values(notificationRows)
              .onConflictDoNothing()
              .returning({ notificationId: notifications.notificationId }),
          catch: (cause) =>
            new CrawlPersistenceError({
              message:
                cause instanceof Error
                  ? cause.message
                  : "Failed while creating video notifications",
            }),
        },
      );

      if (notificationResult.status === "error") {
        logStageFailure(stageFailures, "notifications", notificationResult.error.message);
        logWarn(logger, "crawlVideo", "failed to persist notifications", {
          videoId,
          error: notificationResult.error.message,
        });
      } else {
        notificationsInserted = notificationResult.value.length;
        logInfo(logger, "crawlVideo", "notification stage complete", {
          videoId,
          notificationsInserted,
        });
      }
    } else {
      logInfo(logger, "crawlVideo", "step 8/8 notifications skipped", {
        videoId,
      });
    }

    logInfo(logger, "crawlVideo", "completed", {
      videoId,
      stageFailureCount: stageFailures.length,
      commentsProcessed: processedComments,
      notificationsInserted,
    });

    return Result.ok({
      videoId,
      isNewVideo: persistedResult.value.isNewVideo,
      commentCountFetched: commentResult.value.comments.length,
      commentFetchLimited: commentResult.value.isLimited,
      commentsInserted: persistedResult.value.insertedComments,
      commentsUpdated: persistedResult.value.updatedComments,
      commentsDeleted: persistedResult.value.deletedComments,
      commentsProcessed: processedComments,
      notificationsInserted,
      stageFailures,
    });
  };

  export const crawlRss = async (
    deps: {
      db?: typeof defaultDb;
      logger?: Logger;
    },
    input?: {
      channelId?: string;
    },
  ) => {
    const channelId = input?.channelId ?? THEO_CHANNEL_INFO.channelId;
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const logger = deps.logger;

    logInfo(logger, "crawlRss", "start", {
      channelId,
      feedUrl,
    });
    logInfo(logger, "crawlRss", "step 1/3 fetch RSS feed", {
      channelId,
    });

    const feedResult = await Result.tryPromise(
      {
        try: async () => {
          const response = await fetch(feedUrl);
          if (!response.ok) {
            throw new Error(`RSS fetch failed with status ${response.status}`);
          }

          return response.text();
        },
        catch: (cause) =>
          new CrawlExternalError({
            message:
              cause instanceof Error ? cause.message : "Failed to fetch YouTube RSS feed",
          }),
      },
      {
        retry: {
          times: 2,
          delayMs: 250,
          backoff: "exponential",
        },
      },
    );

    if (feedResult.status === "error") {
      logError(logger, "crawlRss", "failed to fetch RSS feed", {
        channelId,
        error: feedResult.error.message,
      });
      return feedResult;
    }

    const videoIds = parseRssVideoIds(feedResult.value);
    logInfo(logger, "crawlRss", "step 2/3 parsed RSS entries", {
      channelId,
      discoveredVideoCount: videoIds.length,
      videoIds,
    });

    const crawlResults = await createPool(videoIds, 3, async (videoId, index) => {
      logInfo(logger, "crawlRss", "step 3/3 crawl discovered video", {
        channelId,
        index: index + 1,
        total: videoIds.length,
        videoId,
      });
      const result = await crawlVideo(deps, {
        videoId,
        sendNotifications: true,
      });

      if (result.status === "error") {
        logWarn(logger, "crawlRss", "video crawl failed", {
          channelId,
          videoId,
          error: result.error.message,
        });
      } else {
        logInfo(logger, "crawlRss", "video crawl complete", {
          channelId,
          videoId,
          commentsProcessed: result.value.commentsProcessed,
          notificationsInserted: result.value.notificationsInserted,
          stageFailureCount: result.value.stageFailures.length,
        });
      }

      return result;
    });

    const successes = crawlResults.filter((result) => result.status === "ok");
    const failures = crawlResults
      .filter((result) => result.status === "error")
      .map((result) => result.error.message);

    logInfo(logger, "crawlRss", "completed", {
      channelId,
      successCount: successes.length,
      failureCount: failures.length,
    });

    return Result.ok({
      channelId,
      crawledVideoIds: videoIds,
      successCount: successes.length,
      failureCount: failures.length,
      failures,
    });
  };

  export const backfillChannel = async (
    deps: {
      db?: typeof defaultDb;
      logger?: Logger;
    },
    input: {
      channelId?: string;
      limit: number | "all";
      concurrency?: number;
    },
  ) => {
    const db = deps.db ?? defaultDb;
    const logger = deps.logger;
    const channelId = input.channelId ?? THEO_CHANNEL_INFO.channelId;
    const concurrency = Math.max(1, input.concurrency ?? 3);

    if (input.limit !== "all" && (!Number.isInteger(input.limit) || input.limit < 1)) {
      logError(logger, "backfillChannel", "invalid input", {
        channelId,
        limit: input.limit,
      });
      return Result.err(
        new InvalidCrawlInputError({
          message: "limit must be a positive integer or 'all'",
        }),
      );
    }

    logInfo(logger, "backfillChannel", "start", {
      channelId,
      limit: input.limit,
      concurrency,
    });

    logInfo(logger, "backfillChannel", "step 1/4 resolve uploads playlist", {
      channelId,
    });
    const playlistResult = await YouTubeApiService.getUploadsPlaylistId(channelId, {
      logger,
    });
    if (playlistResult.status === "error") {
      logError(logger, "backfillChannel", "failed to resolve uploads playlist", {
        channelId,
        error: playlistResult.error.message,
      });
      return Result.err(
        new CrawlExternalError({
          message: playlistResult.error.message,
        }),
      );
    }

    const stateKey = `backfill:${channelId}`;
    const useCheckpoint = input.limit === "all";
    logInfo(logger, "backfillChannel", "step 2/4 load checkpoint state", {
      channelId,
      stateKey,
      useCheckpoint,
    });
    const stateResult = useCheckpoint
      ? await StateService.getState({ db, logger }, stateKey)
      : Result.ok(null);

    if (stateResult.status === "error") {
      logError(logger, "backfillChannel", "failed to load checkpoint", {
        channelId,
        stateKey,
        error: stateResult.error.message,
      });
      return Result.err(
        new CrawlPersistenceError({
          message: stateResult.error.message,
        }),
      );
    }

    let cursor = stateResult.value?.cursor ?? null;
    let remaining = input.limit === "all" ? Number.POSITIVE_INFINITY : input.limit;
    let crawled = 0;
    const failures: { videoId: string; message: string }[] = [];
    let pageIndex = 0;

    while (remaining > 0) {
      pageIndex += 1;
      logInfo(logger, "backfillChannel", "step 3/4 fetch playlist page", {
        channelId,
        pageIndex,
        cursor,
        remaining,
      });
      const pageResult = await YouTubeApiService.listPlaylistVideoIds(
        playlistResult.value,
        cursor ?? undefined,
        { logger },
      );

      if (pageResult.status === "error") {
        logError(logger, "backfillChannel", "failed to fetch playlist page", {
          channelId,
          pageIndex,
          cursor,
          error: pageResult.error.message,
        });
        return Result.err(
          new CrawlExternalError({
            message: pageResult.error.message,
          }),
        );
      }

      const pageVideoIds = pageResult.value.videoIds;

      if (pageVideoIds.length === 0 && !pageResult.value.nextPageToken) {
        break;
      }

      const maxForPage = Number.isFinite(remaining)
        ? Math.max(0, Math.min(pageVideoIds.length, remaining))
        : pageVideoIds.length;

      const videoIdsToProcess = pageVideoIds.slice(0, maxForPage);
      logInfo(logger, "backfillChannel", "processing page videos", {
        channelId,
        pageIndex,
        fetchedVideoCount: pageVideoIds.length,
        processingVideoCount: videoIdsToProcess.length,
        nextCursor: pageResult.value.nextPageToken,
      });

      const pageCrawlResults = await createPool(
        videoIdsToProcess,
        concurrency,
        async (videoId, index) => {
          logInfo(logger, "backfillChannel", "crawl backfill video", {
            channelId,
            pageIndex,
            index: index + 1,
            total: videoIdsToProcess.length,
            videoId,
          });

          return crawlVideo(
            {
              db,
              logger,
            },
            {
              videoId,
              sendNotifications: false,
            },
          );
        },
      );

      for (let index = 0; index < pageCrawlResults.length; index += 1) {
        const result = pageCrawlResults[index]!;

        if (result.status === "error") {
          failures.push({
            videoId: videoIdsToProcess[index]!,
            message: result.error.message,
          });
          logWarn(logger, "backfillChannel", "video crawl failed", {
            channelId,
            pageIndex,
            videoId: videoIdsToProcess[index],
            error: result.error.message,
          });
          continue;
        }

        crawled += 1;
        logInfo(logger, "backfillChannel", "video crawl complete", {
          channelId,
          pageIndex,
          videoId: videoIdsToProcess[index],
          crawledSoFar: crawled,
          commentsProcessed: result.value.commentsProcessed,
          stageFailureCount: result.value.stageFailures.length,
        });
      }

      remaining = Number.isFinite(remaining)
        ? Math.max(0, remaining - videoIdsToProcess.length)
        : remaining;

      cursor = pageResult.value.nextPageToken;

      if (useCheckpoint) {
        logInfo(logger, "backfillChannel", "step 4/4 save checkpoint", {
          channelId,
          stateKey,
          cursor,
          crawled,
          remaining,
        });
        const saveStateResult = await StateService.setState(
          { db, logger },
          {
            stateKey,
            cursor,
            meta: {
              channelId,
              playlistId: playlistResult.value,
              updatedAt: new Date().toISOString(),
              limit: input.limit,
            },
          },
        );

        if (saveStateResult.status === "error") {
          logError(logger, "backfillChannel", "failed to save checkpoint", {
            channelId,
            stateKey,
            error: saveStateResult.error.message,
          });
          return Result.err(
            new CrawlPersistenceError({
              message: saveStateResult.error.message,
            }),
          );
        }
      }

      if (!cursor) {
        logInfo(logger, "backfillChannel", "no further cursor; backfill complete", {
          channelId,
          pageIndex,
        });
        break;
      }
    }

    logInfo(logger, "backfillChannel", "completed", {
      channelId,
      crawled,
      failureCount: failures.length,
      remainingCursor: cursor,
    });

    return Result.ok({
      channelId,
      crawled,
      failureCount: failures.length,
      failures,
      remainingCursor: cursor,
    });
  };
}
