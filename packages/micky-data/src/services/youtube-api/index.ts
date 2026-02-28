import { Data, Effect, Schedule } from "effect";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
type Logger = Pick<Console, "info" | "warn" | "error">;

const logInfo = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.info?.(`[youtubeApi] ${step}`, details ?? {});
};

const logWarn = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.warn?.(`[youtubeApi] ${step}`, details ?? {});
};

const parseCount = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoDate = (value: unknown) => {
  if (typeof value !== "string") {
    return new Date(0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const buildYouTubeUrl = (path: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  return `${YOUTUBE_API_BASE_URL}${path}?${params.toString()}`;
};

const videoResponseSchema = (raw: unknown) => {
  if (!raw || typeof raw !== "object" || !("items" in raw)) {
    return [] as Record<string, unknown>[];
  }

  const items = (raw as { items?: unknown }).items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
};

const mapVideoSnapshot = (videoId: string, raw: Record<string, unknown>) => {
  const snippet = (raw.snippet as Record<string, unknown> | undefined) ?? {};
  const statistics = (raw.statistics as Record<string, unknown> | undefined) ?? {};
  const thumbnails = (snippet.thumbnails as Record<string, unknown> | undefined) ?? {};
  const maxRes = (thumbnails.maxres as Record<string, unknown> | undefined) ?? {};
  const high = (thumbnails.high as Record<string, unknown> | undefined) ?? {};
  const medium = (thumbnails.medium as Record<string, unknown> | undefined) ?? {};
  const defaultThumbnail = (thumbnails.default as Record<string, unknown> | undefined) ?? {};

  const thumbnailUrl =
    (typeof maxRes.url === "string" && maxRes.url) ||
    (typeof high.url === "string" && high.url) ||
    (typeof medium.url === "string" && medium.url) ||
    (typeof defaultThumbnail.url === "string" && defaultThumbnail.url) ||
    "";

  return {
    videoId,
    title: typeof snippet.title === "string" ? snippet.title : "",
    description: typeof snippet.description === "string" ? snippet.description : "",
    thumbnailUrl,
    publishedAt: toIsoDate(snippet.publishedAt),
    viewCount: parseCount(statistics.viewCount),
    likeCount: parseCount(statistics.likeCount),
    commentCount: parseCount(statistics.commentCount),
  };
};

const mapCommentSnapshot = (raw: Record<string, unknown>) => {
  const snippet = (raw.snippet as Record<string, unknown> | undefined) ?? {};
  const topLevel = (snippet.topLevelComment as Record<string, unknown> | undefined) ?? {};
  const topLevelSnippet =
    (topLevel.snippet as Record<string, unknown> | undefined) ?? {};

  const commentId = typeof topLevel.id === "string" ? topLevel.id : "";

  return {
    commentId,
    videoId: typeof snippet.videoId === "string" ? snippet.videoId : "",
    text:
      typeof topLevelSnippet.textDisplay === "string"
        ? topLevelSnippet.textDisplay
        : "",
    author:
      typeof topLevelSnippet.authorDisplayName === "string"
        ? topLevelSnippet.authorDisplayName
        : "",
    publishedAt: toIsoDate(topLevelSnippet.publishedAt),
    likeCount: parseCount(topLevelSnippet.likeCount),
    replyCount: typeof snippet.totalReplyCount === "number" ? snippet.totalReplyCount : 0,
  };
};

const mapPlaylistVideoId = (raw: Record<string, unknown>) => {
  const contentDetails =
    (raw.contentDetails as Record<string, unknown> | undefined) ?? {};
  return typeof contentDetails.videoId === "string" ? contentDetails.videoId : "";
};

type VideoSnapshot = ReturnType<typeof mapVideoSnapshot>;
type CommentSnapshot = ReturnType<typeof mapCommentSnapshot>;
type TopLevelCommentsResult = {
  comments: CommentSnapshot[];
  isLimited: boolean;
  maxComments: number | null;
};
type PlaylistVideoIdsResult = {
  videoIds: string[];
  nextPageToken: string | null;
};

export namespace YouTubeApiService {
  export class MissingYouTubeApiKeyError extends Data.TaggedError("MissingYouTubeApiKeyError")<{
    message: string;
  }> {}

  export class YouTubeApiRequestError extends Data.TaggedError("YouTubeApiRequestError")<{
    endpoint: string;
    message: string;
  }> {}

  export class YouTubeVideoNotFoundError extends Data.TaggedError("YouTubeVideoNotFoundError")<{
    videoId: string;
    message: string;
  }> {}

  export class YouTubeChannelNotFoundError extends Data.TaggedError("YouTubeChannelNotFoundError")<{
    channelId: string;
    message: string;
  }> {}

  export class YouTubePlaylistNotFoundError extends Data.TaggedError("YouTubePlaylistNotFoundError")<{
    channelId: string;
    message: string;
  }> {}

  const retryHttp = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.retry(
        Schedule.exponential("300 millis").pipe(
          Schedule.compose(Schedule.recurs(2)),
        ),
      ),
    );

  const getYouTubeApiKey = (): Effect.Effect<string, MissingYouTubeApiKeyError> => {
    const apiKey = process.env.YT_API_KEY;

    if (apiKey) {
      return Effect.succeed(apiKey);
    }

    return Effect.fail(
      new MissingYouTubeApiKeyError({
        message: "YT_API_KEY is required",
      }),
    );
  };

  const fetchJson = <T>(url: string): Effect.Effect<T, YouTubeApiRequestError> =>
    retryHttp(
      Effect.tryPromise({
        try: async (signal) => {
          const response = await fetch(url, { signal });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`YouTube API request failed (${response.status}): ${body}`);
          }

          return (await response.json()) as T;
        },
        catch: (cause) =>
          new YouTubeApiRequestError({
            endpoint: url,
            message: cause instanceof Error ? cause.message : "Unknown YouTube API request error",
          }),
      }),
    );

  export const getVideoById = (
    videoId: string,
    options?: {
      logger?: Logger;
    },
  ): Effect.Effect<
    VideoSnapshot,
    MissingYouTubeApiKeyError | YouTubeApiRequestError | YouTubeVideoNotFoundError
  > => {
    const logger = options?.logger;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(logger, "getVideoById:start", { videoId });
      });

      const apiKey = yield* getYouTubeApiKey().pipe(
        Effect.tapError(() =>
          Effect.sync(() => {
            logWarn(logger, "getVideoById:missing-api-key", { videoId });
          }),
        ),
      );

      const url = buildYouTubeUrl("/videos", {
        key: apiKey,
        id: videoId,
        part: "snippet,statistics",
        maxResults: "1",
      });

      const response = yield* fetchJson<unknown>(url).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logWarn(logger, "getVideoById:request-failed", {
              videoId,
              error: error.message,
            });
          }),
        ),
      );

      const [video] = videoResponseSchema(response);

      if (!video) {
        yield* Effect.sync(() => {
          logWarn(logger, "getVideoById:not-found", { videoId });
        });

        return yield* Effect.fail(
          new YouTubeVideoNotFoundError({
            videoId,
            message: `Video ${videoId} not found`,
          }),
        );
      }

      yield* Effect.sync(() => {
        logInfo(logger, "getVideoById:success", { videoId });
      });

      return mapVideoSnapshot(videoId, video);
    });
  };

  export const listTopLevelComments = (
    videoId: string,
    options?: {
      logger?: Logger;
      maxComments?: number;
    },
  ): Effect.Effect<
    TopLevelCommentsResult,
    MissingYouTubeApiKeyError | YouTubeApiRequestError
  > => {
    const logger = options?.logger;

    return Effect.gen(function* () {
      const maxComments = Number.isFinite(options?.maxComments)
        ? Math.max(1, Math.floor(options?.maxComments ?? 1))
        : Number.POSITIVE_INFINITY;
      const hasLimit = Number.isFinite(maxComments);

      yield* Effect.sync(() => {
        logInfo(logger, "listTopLevelComments:start", {
          videoId,
          maxComments: hasLimit ? maxComments : null,
        });
      });

      const apiKey = yield* getYouTubeApiKey().pipe(
        Effect.tapError(() =>
          Effect.sync(() => {
            logWarn(logger, "listTopLevelComments:missing-api-key", { videoId });
          }),
        ),
      );

      const comments: CommentSnapshot[] = [];
      let isLimited = false;
      let nextPageToken: string | undefined;
      let pageCount = 0;

      while (true) {
        pageCount += 1;

        const url = buildYouTubeUrl("/commentThreads", {
          key: apiKey,
          videoId,
          part: "snippet",
          maxResults: "100",
          order: "relevance",
          textFormat: "plainText",
          pageToken: nextPageToken,
        });

        const response = yield* fetchJson<unknown>(url).pipe(
          Effect.matchEffect({
            onFailure: (error) => {
              if (
                error.message.includes("commentsDisabled") ||
                error.message.includes("has disabled comments")
              ) {
                return Effect.sync(() => {
                  logInfo(logger, "listTopLevelComments:comments-disabled", {
                    videoId,
                  });
                }).pipe(
                  Effect.map(() => ({
                    kind: "comments-disabled" as const,
                    payload: null,
                  })),
                );
              }

              return Effect.sync(() => {
                logWarn(logger, "listTopLevelComments:request-failed", {
                  videoId,
                  pageCount,
                  error: error.message,
                });
              }).pipe(
                Effect.flatMap(() => Effect.fail(error)),
              );
            },
            onSuccess: (payload) =>
              Effect.succeed({
                kind: "ok" as const,
                payload,
              }),
          }),
        );

        if (response.kind === "comments-disabled") {
          return {
            comments: [],
            isLimited: false,
            maxComments: hasLimit ? maxComments : null,
          };
        }

        const payload = response.payload as {
          items?: Record<string, unknown>[];
          nextPageToken?: string;
        };

        const pageItems = Array.isArray(payload.items) ? payload.items : [];
        const mapped = pageItems
          .map(mapCommentSnapshot)
          .filter((comment) => comment.commentId.length > 0 && comment.videoId === videoId);

        const roomLeft = maxComments - comments.length;
        const pageComments = roomLeft > 0 ? mapped.slice(0, roomLeft) : [];

        comments.push(...pageComments);

        yield* Effect.sync(() => {
          logInfo(logger, "listTopLevelComments:page-complete", {
            videoId,
            pageCount,
            pageCommentCount: pageComments.length,
            accumulatedCommentCount: comments.length,
          });
        });

        if (hasLimit && comments.length >= maxComments) {
          isLimited = true;
          yield* Effect.sync(() => {
            logInfo(logger, "listTopLevelComments:limit-reached", {
              videoId,
              maxComments,
              pageCount,
            });
          });
          break;
        }

        nextPageToken =
          typeof payload.nextPageToken === "string" ? payload.nextPageToken : undefined;
        if (!nextPageToken) {
          break;
        }
      }

      yield* Effect.sync(() => {
        logInfo(logger, "listTopLevelComments:success", {
          videoId,
          totalComments: comments.length,
          pageCount,
          maxComments: hasLimit ? maxComments : null,
          isLimited,
        });
      });

      return {
        comments,
        isLimited,
        maxComments: hasLimit ? maxComments : null,
      };
    });
  };

  export const getUploadsPlaylistId = (
    channelId: string,
    options?: {
      logger?: Logger;
    },
  ): Effect.Effect<
    string,
    | MissingYouTubeApiKeyError
    | YouTubeApiRequestError
    | YouTubeChannelNotFoundError
    | YouTubePlaylistNotFoundError
  > => {
    const logger = options?.logger;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(logger, "getUploadsPlaylistId:start", { channelId });
      });

      const apiKey = yield* getYouTubeApiKey().pipe(
        Effect.tapError(() =>
          Effect.sync(() => {
            logWarn(logger, "getUploadsPlaylistId:missing-api-key", { channelId });
          }),
        ),
      );

      const url = buildYouTubeUrl("/channels", {
        key: apiKey,
        id: channelId,
        part: "contentDetails",
        maxResults: "1",
      });

      const response = yield* fetchJson<unknown>(url).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logWarn(logger, "getUploadsPlaylistId:request-failed", {
              channelId,
              error: error.message,
            });
          }),
        ),
      );

      const [channel] = videoResponseSchema(response);
      if (!channel) {
        yield* Effect.sync(() => {
          logWarn(logger, "getUploadsPlaylistId:channel-not-found", { channelId });
        });

        return yield* Effect.fail(
          new YouTubeChannelNotFoundError({
            channelId,
            message: `Channel ${channelId} not found`,
          }),
        );
      }

      const contentDetails =
        (channel.contentDetails as Record<string, unknown> | undefined) ?? {};
      const relatedPlaylists =
        (contentDetails.relatedPlaylists as Record<string, unknown> | undefined) ?? {};
      const uploads = relatedPlaylists.uploads;

      if (typeof uploads !== "string" || uploads.length === 0) {
        yield* Effect.sync(() => {
          logWarn(logger, "getUploadsPlaylistId:uploads-not-found", { channelId });
        });

        return yield* Effect.fail(
          new YouTubePlaylistNotFoundError({
            channelId,
            message: `Could not resolve uploads playlist for channel ${channelId}`,
          }),
        );
      }

      yield* Effect.sync(() => {
        logInfo(logger, "getUploadsPlaylistId:success", {
          channelId,
          playlistId: uploads,
        });
      });

      return uploads;
    });
  };

  export const listPlaylistVideoIds = (
    playlistId: string,
    pageToken?: string,
    options?: {
      logger?: Logger;
    },
  ): Effect.Effect<
    PlaylistVideoIdsResult,
    MissingYouTubeApiKeyError | YouTubeApiRequestError
  > => {
    const logger = options?.logger;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(logger, "listPlaylistVideoIds:start", {
          playlistId,
          pageToken: pageToken ?? null,
        });
      });

      const apiKey = yield* getYouTubeApiKey().pipe(
        Effect.tapError(() =>
          Effect.sync(() => {
            logWarn(logger, "listPlaylistVideoIds:missing-api-key", { playlistId });
          }),
        ),
      );

      const url = buildYouTubeUrl("/playlistItems", {
        key: apiKey,
        playlistId,
        part: "contentDetails",
        maxResults: "50",
        pageToken,
      });

      const response = yield* fetchJson<unknown>(url).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logWarn(logger, "listPlaylistVideoIds:request-failed", {
              playlistId,
              pageToken: pageToken ?? null,
              error: error.message,
            });
          }),
        ),
      );

      const payload = response as {
        items?: Record<string, unknown>[];
        nextPageToken?: string;
      };

      const videoIds = (Array.isArray(payload.items) ? payload.items : [])
        .map(mapPlaylistVideoId)
        .filter((videoId) => videoId.length > 0);

      const nextPageToken =
        typeof payload.nextPageToken === "string" ? payload.nextPageToken : null;

      yield* Effect.sync(() => {
        logInfo(logger, "listPlaylistVideoIds:success", {
          playlistId,
          pageToken: pageToken ?? null,
          videoCount: videoIds.length,
          nextPageToken,
        });
      });

      return {
        videoIds,
        nextPageToken,
      };
    });
  };
}
