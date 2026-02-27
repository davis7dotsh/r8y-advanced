import { Data, Effect } from "effect";
import { desc, eq } from "drizzle-orm";
import { db as defaultDb } from "../../db/client";
import { comments, sponsorToVideos, sponsors, videos } from "../../db/schema";

type Logger = Pick<Console, "info" | "warn" | "error">;

const logInfo = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.info?.(`[visualizer] ${step}`, details ?? {});
};

const logWarn = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.warn?.(`[visualizer] ${step}`, details ?? {});
};

const toIso = (value: Date) => value.toISOString();

const normalizeSponsor = (name: string | null, key: string | null) => ({
  name: name ?? "no sponsor",
  key: key ?? "https://davis7.link",
});

type VisualizerVideo = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  commentCount: number;
  viewCount: number;
  likeCount: number;
  sponsor: {
    name: string;
    key: string;
  };
};

type VideoCommentsPayload = {
  video: {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    publishedAt: string;
    sponsor: {
      name: string;
      key: string;
    };
  };
  comments: Array<{
    commentId: string;
    author: string;
    text: string;
    publishedAt: string;
    likeCount: number;
    replyCount: number;
    isProcessed: boolean;
    isEditingMistake: boolean | null;
    isSponsorMention: boolean | null;
    isQuestion: boolean | null;
    isPositiveComment: boolean | null;
  }>;
};

export namespace VisualizerService {
  export class InvalidVideoIdError extends Data.TaggedError("InvalidVideoIdError")<{
    message: string;
  }> {}

  export class VisualizerQueryError extends Data.TaggedError("VisualizerQueryError")<{
    message: string;
  }> {}

  export class VideoNotFoundError extends Data.TaggedError("VideoNotFoundError")<{
    videoId: string;
    message: string;
  }> {}

  export const listVideos = (deps?: {
    db?: typeof defaultDb;
    logger?: Logger;
  }): Effect.Effect<VisualizerVideo[], VisualizerQueryError> => {
    const db = deps?.db ?? defaultDb;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(deps?.logger, "listVideos:start");
      });

      const rows = yield* Effect.tryPromise({
        try: () =>
          db
            .select({
              videoId: videos.videoId,
              title: videos.title,
              thumbnailUrl: videos.thumbnailUrl,
              publishedAt: videos.publishedAt,
              commentCount: videos.commentCount,
              viewCount: videos.viewCount,
              likeCount: videos.likeCount,
              sponsorName: sponsors.name,
              sponsorKey: sponsors.sponsorKey,
            })
            .from(videos)
            .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
            .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
            .orderBy(desc(videos.publishedAt)),
        catch: (cause) =>
          new VisualizerQueryError({
            message: cause instanceof Error ? cause.message : "Failed to load videos",
          }),
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logWarn(deps?.logger, "listVideos:failed", {
              error: error.message,
            });
          }),
        ),
      );

      const dedupedVideos = Array.from(
        rows
          .reduce(
            (acc, row) => {
              if (!acc.has(row.videoId)) {
                acc.set(row.videoId, {
                  videoId: row.videoId,
                  title: row.title,
                  thumbnailUrl: row.thumbnailUrl,
                  publishedAt: toIso(row.publishedAt),
                  commentCount: row.commentCount,
                  viewCount: row.viewCount,
                  likeCount: row.likeCount,
                  sponsor: normalizeSponsor(row.sponsorName, row.sponsorKey),
                });
              }

              return acc;
            },
            new Map<string, VisualizerVideo>(),
          )
          .values(),
      );

      yield* Effect.sync(() => {
        logInfo(deps?.logger, "listVideos:success", {
          videoCount: dedupedVideos.length,
        });
      });

      return dedupedVideos;
    });
  };

  export const getVideoComments = (
    videoId: string,
    deps?: {
      db?: typeof defaultDb;
      logger?: Logger;
    },
  ): Effect.Effect<
    VideoCommentsPayload,
    InvalidVideoIdError | VisualizerQueryError | VideoNotFoundError
  > => {
    const normalizedVideoId = videoId.trim();

    if (!normalizedVideoId) {
      return Effect.fail(
        new InvalidVideoIdError({
          message: "videoId is required",
        }),
      );
    }

    const db = deps?.db ?? defaultDb;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(deps?.logger, "getVideoComments:start", {
          videoId: normalizedVideoId,
        });
      });

      const videoRows = yield* Effect.tryPromise({
        try: () =>
          db
            .select({
              videoId: videos.videoId,
              title: videos.title,
              thumbnailUrl: videos.thumbnailUrl,
              publishedAt: videos.publishedAt,
              sponsorName: sponsors.name,
              sponsorKey: sponsors.sponsorKey,
            })
            .from(videos)
            .leftJoin(sponsorToVideos, eq(sponsorToVideos.videoId, videos.videoId))
            .leftJoin(sponsors, eq(sponsors.sponsorId, sponsorToVideos.sponsorId))
            .where(eq(videos.videoId, normalizedVideoId))
            .limit(1),
        catch: (cause) =>
          new VisualizerQueryError({
            message: cause instanceof Error ? cause.message : "Failed to load video",
          }),
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logWarn(deps?.logger, "getVideoComments:video-load-failed", {
              videoId: normalizedVideoId,
              error: error.message,
            });
          }),
        ),
      );

      const row = videoRows[0];

      if (!row) {
        return yield* Effect.fail(
          new VideoNotFoundError({
            videoId: normalizedVideoId,
            message: `Video ${normalizedVideoId} not found`,
          }),
        );
      }

      const commentRows = yield* Effect.tryPromise({
        try: () =>
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
            .where(eq(comments.videoId, normalizedVideoId))
            .orderBy(desc(comments.publishedAt)),
        catch: (cause) =>
          new VisualizerQueryError({
            message: cause instanceof Error ? cause.message : "Failed to load comments",
          }),
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logWarn(deps?.logger, "getVideoComments:failed", {
              videoId: normalizedVideoId,
              error: error.message,
            });
          }),
        ),
      );

      const payload: VideoCommentsPayload = {
        video: {
          videoId: row.videoId,
          title: row.title,
          thumbnailUrl: row.thumbnailUrl,
          publishedAt: toIso(row.publishedAt),
          sponsor: normalizeSponsor(row.sponsorName, row.sponsorKey),
        },
        comments: commentRows.map((comment) => ({
          ...comment,
          publishedAt: toIso(comment.publishedAt),
        })),
      };

      yield* Effect.sync(() => {
        logInfo(deps?.logger, "getVideoComments:success", {
          videoId: normalizedVideoId,
          commentCount: payload.comments.length,
        });
      });

      return payload;
    });
  };
}
