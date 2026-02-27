import { createHash } from "node:crypto";
import { Data, Effect } from "effect";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { fetchXPostMetrics, parseXPostUrl } from "@r8y/x-sync";
import { fetchRssVideoIds } from "@r8y/yt-sync";
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

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.match({
      onFailure: (error) => ({
        status: "error" as const,
        error,
      }),
      onSuccess: (value) => ({
        status: "ok" as const,
        value,
      }),
    }),
  );

export namespace CrawlService {
  export class InvalidCrawlInputError extends Data.TaggedError("InvalidCrawlInputError")<{
    message: string;
  }> {}

  export class CrawlPersistenceError extends Data.TaggedError("CrawlPersistenceError")<{
    message: string;
  }> {}

  export class CrawlExternalError extends Data.TaggedError("CrawlExternalError")<{
    message: string;
  }> {}

  const refreshXMetrics = (
    deps: {
      db: typeof defaultDb;
      logger?: Logger;
    },
    input: {
      videoId: string;
    },
  ) => {
    const { db, logger } = deps;

    return Effect.gen(function* () {
      const linkedVideo = yield* Effect.tryPromise({
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

      const linkedUrl = linkedVideo?.xUrl;
      if (!linkedUrl) {
        return {
          refreshed: false,
          reason: "no-linked-url",
        } as const;
      }

      const parsed = parseXPostUrl(linkedUrl);
      if (!parsed) {
        return yield* Effect.fail(
          new CrawlExternalError({
            message: `Invalid linked X URL for ${input.videoId}: ${linkedUrl}`,
          }),
        );
      }

      const bearerToken = process.env.X_API_KEY?.trim();
      if (!bearerToken) {
        yield* Effect.sync(() => {
          logWarn(logger, "crawlVideo", "x api key missing; skipping x refresh", {
            videoId: input.videoId,
          });
        });

        return {
          refreshed: false,
          reason: "missing-api-key",
        } as const;
      }

      const metrics = yield* fetchXPostMetrics({
        postId: parsed.postId,
        bearerToken,
        externalError: (message) =>
          new CrawlExternalError({
            message,
          }),
      });

      const persisted = {
        xUrl: parsed.canonicalUrl,
        xViews: metrics.xViews,
        xLikes: metrics.xLikes,
        xReposts: metrics.xReposts,
        xComments: metrics.xComments,
      };

      yield* Effect.tryPromise({
        try: () =>
          db
            .update(videos)
            .set({
              xUrl: persisted.xUrl,
              xViews: persisted.xViews,
              xLikes: persisted.xLikes,
              xReposts: persisted.xReposts,
              xComments: persisted.xComments,
            })
            .where(eq(videos.videoId, input.videoId)),
        catch: (cause) =>
          new CrawlPersistenceError({
            message:
              cause instanceof Error ? cause.message : "Failed while saving X post metrics",
          }),
      });

      return {
        refreshed: true,
        metrics: persisted,
      } as const;
    });
  };

  export const crawlVideo = (
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

    return Effect.gen(function* () {
      if (!videoId) {
        yield* Effect.sync(() => {
          logError(logger, "crawlVideo", "invalid input", {
            reason: "videoId is required",
          });
        });

        return yield* Effect.fail(
          new InvalidCrawlInputError({
            message: "videoId is required",
          }),
        );
      }

      const db = deps.db ?? defaultDb;
      const stageFailures: { stage: string; message: string }[] = [];

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 1/7 fetch video metadata", {
          videoId,
          sendNotifications: input.sendNotifications,
        });
      });

      const video = yield* YouTubeApiService.getVideoById(videoId, { logger }).pipe(
        Effect.mapError(
          (error) =>
            new CrawlExternalError({
              message: error.message,
            }),
        ),
        Effect.tapError((error) =>
          Effect.sync(() => {
            logError(logger, "crawlVideo", "failed to fetch video metadata", {
              videoId,
              error: error.message,
            });
          }),
        ),
      );

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 2/7 fetch top-level comments", {
          videoId,
          maxComments: MAX_COMMENTS_PER_VIDEO,
        });
      });

      const commentResult = yield* YouTubeApiService.listTopLevelComments(videoId, {
        logger,
        maxComments: MAX_COMMENTS_PER_VIDEO,
      }).pipe(
        Effect.mapError(
          (error) =>
            new CrawlExternalError({
              message: error.message,
            }),
        ),
        Effect.tapError((error) =>
          Effect.sync(() => {
            logError(logger, "crawlVideo", "failed to fetch comments", {
              videoId,
              error: error.message,
            });
          }),
        ),
      );

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 3/7 persist video and comments", {
          videoId,
          fetchedCommentCount: commentResult.comments.length,
          commentFetchLimited: commentResult.isLimited,
        });
      });

      const persistedResult = yield* Effect.tryPromise({
        try: async () => {
          const existingVideo = await db.query.videos.findFirst({
            where: eq(videos.videoId, videoId),
            columns: { videoId: true },
          });

          await db
            .insert(videos)
            .values(video)
            .onConflictDoUpdate({
              target: videos.videoId,
              set: {
                title: video.title,
                description: video.description,
                thumbnailUrl: video.thumbnailUrl,
                publishedAt: video.publishedAt,
                viewCount: video.viewCount,
                likeCount: video.likeCount,
                commentCount: video.commentCount,
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

          for (const remoteComment of commentResult.comments) {
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

          if (!commentResult.isLimited) {
            const incomingCommentIds = new Set(
              commentResult.comments.map((comment) => comment.commentId),
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
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logError(logger, "crawlVideo", "failed to persist video/comments", {
              videoId,
              error: error.message,
            });
          }),
        ),
      );

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "video/comment persistence complete", {
          videoId,
          isNewVideo: persistedResult.isNewVideo,
          commentsInserted: persistedResult.insertedComments,
          commentsUpdated: persistedResult.updatedComments,
          commentsDeleted: persistedResult.deletedComments,
        });
      });

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 4/8 refresh linked X metrics", {
          videoId,
        });
      });

      const xRefreshResult = yield* settle(refreshXMetrics({ db, logger }, { videoId }));
      if (xRefreshResult.status === "error") {
        logStageFailure(stageFailures, "x-refresh", xRefreshResult.error.message);
        yield* Effect.sync(() => {
          logWarn(logger, "crawlVideo", "x refresh failed; continuing", {
            videoId,
            error: xRefreshResult.error.message,
          });
        });
      } else {
        yield* Effect.sync(() => {
          logInfo(logger, "crawlVideo", "x refresh stage complete", {
            videoId,
            refreshed: xRefreshResult.value.refreshed,
            reason: xRefreshResult.value.refreshed ? null : xRefreshResult.value.reason,
          });
        });
      }

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 5/8 run sponsor extraction", {
          videoId,
        });
      });

      const sponsorResult = yield* settle(
        AiEnrichmentService.extractSponsor({
          logger,
          input: {
            videoTitle: video.title,
            videoDescription: video.description,
            sponsorPrompt: THEO_CHANNEL_INFO.sponsorPrompt,
          },
        }),
      );

      if (sponsorResult.status === "error") {
        logStageFailure(stageFailures, "sponsor", sponsorResult.error.message);
        yield* Effect.sync(() => {
          logWarn(logger, "crawlVideo", "sponsor extraction failed; continuing", {
            videoId,
            error: sponsorResult.error.message,
          });
        });
      } else {
        const sponsorPersistResult = yield* settle(
          Effect.tryPromise({
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
          }),
        );

        if (sponsorPersistResult.status === "error") {
          logStageFailure(stageFailures, "sponsor-persist", sponsorPersistResult.error.message);
          yield* Effect.sync(() => {
            logWarn(logger, "crawlVideo", "sponsor persistence failed; continuing", {
              videoId,
              error: sponsorPersistResult.error.message,
            });
          });
        } else {
          yield* Effect.sync(() => {
            logInfo(logger, "crawlVideo", "sponsor stage complete", {
              videoId,
              linkedSponsor: sponsorPersistResult.value.linked,
            });
          });
        }
      }

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 6/8 load pending comments for AI", {
          videoId,
          maxClassifications: MAX_COMMENT_CLASSIFICATIONS_PER_CRAWL,
        });
      });

      const pendingComments = yield* Effect.tryPromise({
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
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logError(logger, "crawlVideo", "failed to load pending comments", {
              videoId,
              error: error.message,
            });
          }),
        ),
      );

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "step 7/8 classify pending comments", {
          videoId,
          pendingCommentCount: pendingComments.length,
          maxClassifications: MAX_COMMENT_CLASSIFICATIONS_PER_CRAWL,
        });
      });

      let processedComments = 0;

      for (let index = 0; index < pendingComments.length; index += 1) {
        const comment = pendingComments[index]!;

        yield* Effect.sync(() => {
          logInfo(logger, "crawlVideo", "classifying comment", {
            videoId,
            index: index + 1,
            total: pendingComments.length,
            commentId: comment.commentId,
          });
        });

        const classificationResult = yield* settle(
          AiEnrichmentService.classifyComment({
            logger,
            input: {
              videoTitle: video.title,
              videoDescription: video.description,
              commentText: comment.text,
              commentAuthor: comment.author,
            },
          }),
        );

        if (classificationResult.status === "error") {
          logStageFailure(
            stageFailures,
            "comment-ai",
            `${comment.commentId}: ${classificationResult.error.message}`,
          );
          yield* Effect.sync(() => {
            logWarn(logger, "crawlVideo", "comment classification failed; leaving pending", {
              videoId,
              commentId: comment.commentId,
              error: classificationResult.error.message,
            });
          });
          continue;
        }

        const updateResult = yield* settle(
          Effect.tryPromise({
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
          }),
        );

        if (updateResult.status === "error") {
          logStageFailure(stageFailures, "comment-persist", updateResult.error.message);
          yield* Effect.sync(() => {
            logWarn(logger, "crawlVideo", "failed to persist classified comment", {
              videoId,
              commentId: comment.commentId,
              error: updateResult.error.message,
            });
          });
          continue;
        }

        processedComments += 1;
      }

      let notificationsInserted = 0;

      if (input.sendNotifications) {
        yield* Effect.sync(() => {
          logInfo(logger, "crawlVideo", "step 8/8 emit live notifications", {
            videoId,
          });
        });

        const notificationRows = [
          {
            notificationId: createNotificationId("discord_video_live", videoId),
            videoId,
            type: "discord_video_live" as const,
            message: `Theo video live: ${video.title}`,
            commentId: null,
          },
          {
            notificationId: createNotificationId("todoist_video_live", videoId),
            videoId,
            type: "todoist_video_live" as const,
            message: `Theo video live: ${video.title}`,
            commentId: null,
          },
        ];

        const notificationResult = yield* settle(
          Effect.tryPromise({
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
          }),
        );

        if (notificationResult.status === "error") {
          logStageFailure(stageFailures, "notifications", notificationResult.error.message);
          yield* Effect.sync(() => {
            logWarn(logger, "crawlVideo", "failed to persist notifications", {
              videoId,
              error: notificationResult.error.message,
            });
          });
        } else {
          notificationsInserted = notificationResult.value.length;
          yield* Effect.sync(() => {
            logInfo(logger, "crawlVideo", "notification stage complete", {
              videoId,
              notificationsInserted,
            });
          });
        }
      } else {
        yield* Effect.sync(() => {
          logInfo(logger, "crawlVideo", "step 8/8 notifications skipped", {
            videoId,
          });
        });
      }

      yield* Effect.sync(() => {
        logInfo(logger, "crawlVideo", "completed", {
          videoId,
          stageFailureCount: stageFailures.length,
          commentsProcessed: processedComments,
          notificationsInserted,
        });
      });

      return {
        videoId,
        isNewVideo: persistedResult.isNewVideo,
        commentCountFetched: commentResult.comments.length,
        commentFetchLimited: commentResult.isLimited,
        commentsInserted: persistedResult.insertedComments,
        commentsUpdated: persistedResult.updatedComments,
        commentsDeleted: persistedResult.deletedComments,
        commentsProcessed: processedComments,
        notificationsInserted,
        stageFailures,
      };
    });
  };

  export const crawlRss = (
    deps: {
      db?: typeof defaultDb;
      logger?: Logger;
    },
    input?: {
      channelId?: string;
    },
  ) => {
    const channelId = input?.channelId ?? THEO_CHANNEL_INFO.channelId;
    const logger = deps.logger;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(logger, "crawlRss", "start", {
          channelId,
          feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
        });
        logInfo(logger, "crawlRss", "step 1/3 fetch RSS feed", {
          channelId,
        });
      });

      const feed = yield* fetchRssVideoIds({
        channelId,
        externalError: (message) =>
          new CrawlExternalError({
            message,
          }),
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logError(logger, "crawlRss", "failed to fetch RSS feed", {
              channelId,
              error: error.message,
            });
          }),
        ),
      );

      const videoIds = feed.videoIds;

      yield* Effect.sync(() => {
        logInfo(logger, "crawlRss", "step 2/3 parsed RSS entries", {
          channelId,
          discoveredVideoCount: videoIds.length,
          videoIds,
        });
      });

      const crawlResults = yield* Effect.forEach(
        videoIds,
        (videoId, index) =>
          Effect.gen(function* () {
            yield* Effect.sync(() => {
              logInfo(logger, "crawlRss", "step 3/3 crawl discovered video", {
                channelId,
                index: index + 1,
                total: videoIds.length,
                videoId,
              });
            });

            const result = yield* settle(
              crawlVideo(deps, {
                videoId,
                sendNotifications: true,
              }),
            );

            if (result.status === "error") {
              yield* Effect.sync(() => {
                logWarn(logger, "crawlRss", "video crawl failed", {
                  channelId,
                  videoId,
                  error: result.error.message,
                });
              });
            } else {
              yield* Effect.sync(() => {
                logInfo(logger, "crawlRss", "video crawl complete", {
                  channelId,
                  videoId,
                  commentsProcessed: result.value.commentsProcessed,
                  notificationsInserted: result.value.notificationsInserted,
                  stageFailureCount: result.value.stageFailures.length,
                });
              });
            }

            return result;
          }),
        {
          concurrency: 3,
        },
      );

      const successes = crawlResults.filter((result) => result.status === "ok");
      const failures = crawlResults
        .filter((result) => result.status === "error")
        .map((result) => result.error.message);

      yield* Effect.sync(() => {
        logInfo(logger, "crawlRss", "completed", {
          channelId,
          successCount: successes.length,
          failureCount: failures.length,
        });
      });

      return {
        channelId,
        crawledVideoIds: videoIds,
        successCount: successes.length,
        failureCount: failures.length,
        failures,
      };
    });
  };

  export const backfillChannel = (
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

    return Effect.gen(function* () {
      if (input.limit !== "all" && (!Number.isInteger(input.limit) || input.limit < 1)) {
        yield* Effect.sync(() => {
          logError(logger, "backfillChannel", "invalid input", {
            channelId,
            limit: input.limit,
          });
        });

        return yield* Effect.fail(
          new InvalidCrawlInputError({
            message: "limit must be a positive integer or 'all'",
          }),
        );
      }

      yield* Effect.sync(() => {
        logInfo(logger, "backfillChannel", "start", {
          channelId,
          limit: input.limit,
          concurrency,
        });
        logInfo(logger, "backfillChannel", "step 1/4 resolve uploads playlist", {
          channelId,
        });
      });

      const playlistId = yield* YouTubeApiService.getUploadsPlaylistId(channelId, {
        logger,
      }).pipe(
        Effect.mapError(
          (error) =>
            new CrawlExternalError({
              message: error.message,
            }),
        ),
        Effect.tapError((error) =>
          Effect.sync(() => {
            logError(logger, "backfillChannel", "failed to resolve uploads playlist", {
              channelId,
              error: error.message,
            });
          }),
        ),
      );

      const stateKey = `backfill:${channelId}`;
      const useCheckpoint = input.limit === "all";

      yield* Effect.sync(() => {
        logInfo(logger, "backfillChannel", "step 2/4 load checkpoint state", {
          channelId,
          stateKey,
          useCheckpoint,
        });
      });

      const state = useCheckpoint
        ? yield* StateService.getState({ db, logger }, stateKey).pipe(
            Effect.mapError(
              (error) =>
                new CrawlPersistenceError({
                  message: error.message,
                }),
            ),
            Effect.tapError((error) =>
              Effect.sync(() => {
                logError(logger, "backfillChannel", "failed to load checkpoint", {
                  channelId,
                  stateKey,
                  error: error.message,
                });
              }),
            ),
          )
        : null;

      let cursor = state?.cursor ?? null;
      let remaining = input.limit === "all" ? Number.POSITIVE_INFINITY : input.limit;
      let crawled = 0;
      const failures: { videoId: string; message: string }[] = [];
      let pageIndex = 0;

      while (remaining > 0) {
        pageIndex += 1;

        yield* Effect.sync(() => {
          logInfo(logger, "backfillChannel", "step 3/4 fetch playlist page", {
            channelId,
            pageIndex,
            cursor,
            remaining,
          });
        });

        const page = yield* YouTubeApiService.listPlaylistVideoIds(
          playlistId,
          cursor ?? undefined,
          { logger },
        ).pipe(
          Effect.mapError(
            (error) =>
              new CrawlExternalError({
                message: error.message,
              }),
          ),
          Effect.tapError((error) =>
            Effect.sync(() => {
              logError(logger, "backfillChannel", "failed to fetch playlist page", {
                channelId,
                pageIndex,
                cursor,
                error: error.message,
              });
            }),
          ),
        );

        const pageVideoIds = page.videoIds;

        if (pageVideoIds.length === 0 && !page.nextPageToken) {
          break;
        }

        const maxForPage = Number.isFinite(remaining)
          ? Math.max(0, Math.min(pageVideoIds.length, remaining))
          : pageVideoIds.length;

        const videoIdsToProcess = pageVideoIds.slice(0, maxForPage);

        yield* Effect.sync(() => {
          logInfo(logger, "backfillChannel", "processing page videos", {
            channelId,
            pageIndex,
            fetchedVideoCount: pageVideoIds.length,
            processingVideoCount: videoIdsToProcess.length,
            nextCursor: page.nextPageToken,
          });
        });

        const pageCrawlResults = yield* Effect.forEach(
          videoIdsToProcess,
          (videoId, index) =>
            Effect.gen(function* () {
              yield* Effect.sync(() => {
                logInfo(logger, "backfillChannel", "crawl backfill video", {
                  channelId,
                  pageIndex,
                  index: index + 1,
                  total: videoIdsToProcess.length,
                  videoId,
                });
              });

              return yield* settle(
                crawlVideo(
                  {
                    db,
                    logger,
                  },
                  {
                    videoId,
                    sendNotifications: false,
                  },
                ),
              );
            }),
          {
            concurrency,
          },
        );

        for (let index = 0; index < pageCrawlResults.length; index += 1) {
          const result = pageCrawlResults[index]!;

          if (result.status === "error") {
            failures.push({
              videoId: videoIdsToProcess[index]!,
              message: result.error.message,
            });

            yield* Effect.sync(() => {
              logWarn(logger, "backfillChannel", "video crawl failed", {
                channelId,
                pageIndex,
                videoId: videoIdsToProcess[index],
                error: result.error.message,
              });
            });
            continue;
          }

          crawled += 1;

          yield* Effect.sync(() => {
            logInfo(logger, "backfillChannel", "video crawl complete", {
              channelId,
              pageIndex,
              videoId: videoIdsToProcess[index],
              crawledSoFar: crawled,
              commentsProcessed: result.value.commentsProcessed,
              stageFailureCount: result.value.stageFailures.length,
            });
          });
        }

        remaining = Number.isFinite(remaining)
          ? Math.max(0, remaining - videoIdsToProcess.length)
          : remaining;

        cursor = page.nextPageToken;

        if (useCheckpoint) {
          yield* Effect.sync(() => {
            logInfo(logger, "backfillChannel", "step 4/4 save checkpoint", {
              channelId,
              stateKey,
              cursor,
              crawled,
              remaining,
            });
          });

          yield* StateService.setState(
            { db, logger },
            {
              stateKey,
              cursor,
              meta: {
                channelId,
                playlistId,
                updatedAt: new Date().toISOString(),
                limit: input.limit,
              },
            },
          ).pipe(
            Effect.mapError(
              (error) =>
                new CrawlPersistenceError({
                  message: error.message,
                }),
            ),
            Effect.tapError((error) =>
              Effect.sync(() => {
                logError(logger, "backfillChannel", "failed to save checkpoint", {
                  channelId,
                  stateKey,
                  error: error.message,
                });
              }),
            ),
          );
        }

        if (!cursor) {
          yield* Effect.sync(() => {
            logInfo(logger, "backfillChannel", "no further cursor; backfill complete", {
              channelId,
              pageIndex,
            });
          });
          break;
        }
      }

      yield* Effect.sync(() => {
        logInfo(logger, "backfillChannel", "completed", {
          channelId,
          crawled,
          failureCount: failures.length,
          remainingCursor: cursor,
        });
      });

      return {
        channelId,
        crawled,
        failureCount: failures.length,
        failures,
        remainingCursor: cursor,
      };
    });
  };
}
