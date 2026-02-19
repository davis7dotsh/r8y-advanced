import { Result, TaggedError } from "better-result";
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

export namespace VisualizerService {
  export class InvalidVideoIdError extends TaggedError("InvalidVideoIdError")<{
    message: string;
  }>() {}

  export class VisualizerQueryError extends TaggedError("VisualizerQueryError")<{
    message: string;
  }>() {}

  export class VideoNotFoundError extends TaggedError("VideoNotFoundError")<{
    videoId: string;
    message: string;
  }>() {}

  export const listVideos = async (deps?: {
    db?: typeof defaultDb;
    logger?: Logger;
  }) => {
    const db = deps?.db ?? defaultDb;

    logInfo(deps?.logger, "listVideos:start");

    const queryResult = await Result.tryPromise(
      {
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
      },
    );

    if (queryResult.status === "error") {
      logWarn(deps?.logger, "listVideos:failed", {
        error: queryResult.error.message,
      });
      return queryResult;
    }

    const dedupedVideos = Array.from(
      queryResult.value
        .reduce((acc, row) => {
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
        }, new Map<string, {
          videoId: string;
          title: string;
          thumbnailUrl: string;
          publishedAt: string;
          commentCount: number;
          viewCount: number;
          likeCount: number;
          sponsor: { name: string; key: string };
        }>())
        .values(),
    );

    logInfo(deps?.logger, "listVideos:success", {
      videoCount: dedupedVideos.length,
    });

    return Result.ok(dedupedVideos);
  };

  export const getVideoComments = async (
    videoId: string,
    deps?: {
      db?: typeof defaultDb;
      logger?: Logger;
    },
  ) => {
    const normalizedVideoId = videoId.trim();

    if (!normalizedVideoId) {
      return Result.err(
        new InvalidVideoIdError({
          message: "videoId is required",
        }),
      );
    }

    const db = deps?.db ?? defaultDb;

    logInfo(deps?.logger, "getVideoComments:start", {
      videoId: normalizedVideoId,
    });

    const videoResult = await Result.tryPromise(
      {
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
      },
    );

    if (videoResult.status === "error") {
      return videoResult;
    }

    const row = videoResult.value[0];

    if (!row) {
      return Result.err(
        new VideoNotFoundError({
          videoId: normalizedVideoId,
          message: `Video ${normalizedVideoId} not found`,
        }),
      );
    }

    const commentResult = await Result.tryPromise(
      {
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
      },
    );

    if (commentResult.status === "error") {
      logWarn(deps?.logger, "getVideoComments:failed", {
        videoId: normalizedVideoId,
        error: commentResult.error.message,
      });
      return commentResult;
    }

    const payload = {
      video: {
        videoId: row.videoId,
        title: row.title,
        thumbnailUrl: row.thumbnailUrl,
        publishedAt: toIso(row.publishedAt),
        sponsor: normalizeSponsor(row.sponsorName, row.sponsorKey),
      },
      comments: commentResult.value.map((comment) => ({
        ...comment,
        publishedAt: toIso(comment.publishedAt),
      })),
    };

    logInfo(deps?.logger, "getVideoComments:success", {
      videoId: normalizedVideoId,
      commentCount: payload.comments.length,
    });

    return Result.ok(payload);
  };
}
