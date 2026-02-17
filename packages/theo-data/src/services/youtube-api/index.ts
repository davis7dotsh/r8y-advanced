import { Result, TaggedError } from "better-result";

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

const getYouTubeApiKey = () => {
  const apiKey = process.env.YT_API_KEY;
  return apiKey
    ? Result.ok(apiKey)
    : Result.err(
        new YouTubeApiService.MissingYouTubeApiKeyError({
          message: "YT_API_KEY is required",
        }),
      );
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

const fetchJson = async <T>(url: string) =>
  Result.tryPromise(
    {
      try: async () => {
        const response = await fetch(url);

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`YouTube API request failed (${response.status}): ${body}`);
        }

        return (await response.json()) as T;
      },
      catch: (cause) =>
        new YouTubeApiService.YouTubeApiRequestError({
          endpoint: url,
          message: cause instanceof Error ? cause.message : "Unknown YouTube API request error",
        }),
    },
    {
      retry: {
        times: 2,
        delayMs: 300,
        backoff: "exponential",
      },
    },
  );

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

export namespace YouTubeApiService {
  export class MissingYouTubeApiKeyError extends TaggedError("MissingYouTubeApiKeyError")<{
    message: string;
  }>() {}

  export class YouTubeApiRequestError extends TaggedError("YouTubeApiRequestError")<{
    endpoint: string;
    message: string;
  }>() {}

  export class YouTubeVideoNotFoundError extends TaggedError("YouTubeVideoNotFoundError")<{
    videoId: string;
    message: string;
  }>() {}

  export class YouTubeChannelNotFoundError extends TaggedError("YouTubeChannelNotFoundError")<{
    channelId: string;
    message: string;
  }>() {}

  export class YouTubePlaylistNotFoundError extends TaggedError("YouTubePlaylistNotFoundError")<{
    channelId: string;
    message: string;
  }>() {}

  export const getVideoById = async (
    videoId: string,
    options?: {
      logger?: Logger;
    },
  ) => {
    const logger = options?.logger;
    logInfo(logger, "getVideoById:start", { videoId });

    const apiKeyResult = getYouTubeApiKey();
    if (apiKeyResult.status === "error") {
      logWarn(logger, "getVideoById:missing-api-key", { videoId });
      return apiKeyResult;
    }

    const url = buildYouTubeUrl("/videos", {
      key: apiKeyResult.value,
      id: videoId,
      part: "snippet,statistics",
      maxResults: "1",
    });

    const responseResult = await fetchJson<unknown>(url);
    if (responseResult.status === "error") {
      logWarn(logger, "getVideoById:request-failed", {
        videoId,
        error: responseResult.error.message,
      });
      return responseResult;
    }

    const [video] = videoResponseSchema(responseResult.value);

    if (!video) {
      logWarn(logger, "getVideoById:not-found", { videoId });
      return Result.err(
        new YouTubeVideoNotFoundError({
          videoId,
          message: `Video ${videoId} not found`,
        }),
      );
    }

    logInfo(logger, "getVideoById:success", { videoId });
    return Result.ok(mapVideoSnapshot(videoId, video));
  };

  export const listTopLevelComments = async (
    videoId: string,
    options?: {
      logger?: Logger;
      maxComments?: number;
    },
  ) => {
    const logger = options?.logger;
    const maxComments = Number.isFinite(options?.maxComments)
      ? Math.max(1, Math.floor(options?.maxComments ?? 1))
      : Number.POSITIVE_INFINITY;
    const hasLimit = Number.isFinite(maxComments);
    logInfo(logger, "listTopLevelComments:start", {
      videoId,
      maxComments: hasLimit ? maxComments : null,
    });

    const apiKeyResult = getYouTubeApiKey();
    if (apiKeyResult.status === "error") {
      logWarn(logger, "listTopLevelComments:missing-api-key", { videoId });
      return apiKeyResult;
    }

    const comments: ReturnType<typeof mapCommentSnapshot>[] = [];
    let isLimited = false;
    let nextPageToken: string | undefined;
    let pageCount = 0;

    while (true) {
      pageCount += 1;
      const url = buildYouTubeUrl("/commentThreads", {
        key: apiKeyResult.value,
        videoId,
        part: "snippet",
        maxResults: "100",
        order: "time",
        textFormat: "plainText",
        pageToken: nextPageToken,
      });

      const responseResult = await fetchJson<unknown>(url);
      if (responseResult.status === "error") {
        const message = responseResult.error.message;
        if (message.includes("commentsDisabled") || message.includes("has disabled comments")) {
          logInfo(logger, "listTopLevelComments:comments-disabled", { videoId });
          return Result.ok({
            comments: [],
            isLimited: false,
            maxComments: hasLimit ? maxComments : null,
          });
        }

        logWarn(logger, "listTopLevelComments:request-failed", {
          videoId,
          pageCount,
          error: message,
        });
        return responseResult;
      }

      const payload = responseResult.value as {
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
      logInfo(logger, "listTopLevelComments:page-complete", {
        videoId,
        pageCount,
        pageCommentCount: pageComments.length,
        accumulatedCommentCount: comments.length,
      });

      if (hasLimit && comments.length >= maxComments) {
        isLimited = true;
        logInfo(logger, "listTopLevelComments:limit-reached", {
          videoId,
          maxComments,
          pageCount,
        });
        break;
      }

      nextPageToken = typeof payload.nextPageToken === "string" ? payload.nextPageToken : undefined;
      if (!nextPageToken) {
        break;
      }
    }

    logInfo(logger, "listTopLevelComments:success", {
      videoId,
      totalComments: comments.length,
      pageCount,
      maxComments: hasLimit ? maxComments : null,
      isLimited,
    });
    return Result.ok({
      comments,
      isLimited,
      maxComments: hasLimit ? maxComments : null,
    });
  };

  export const getUploadsPlaylistId = async (
    channelId: string,
    options?: {
      logger?: Logger;
    },
  ) => {
    const logger = options?.logger;
    logInfo(logger, "getUploadsPlaylistId:start", { channelId });

    const apiKeyResult = getYouTubeApiKey();
    if (apiKeyResult.status === "error") {
      logWarn(logger, "getUploadsPlaylistId:missing-api-key", { channelId });
      return apiKeyResult;
    }

    const url = buildYouTubeUrl("/channels", {
      key: apiKeyResult.value,
      id: channelId,
      part: "contentDetails",
      maxResults: "1",
    });

    const responseResult = await fetchJson<unknown>(url);
    if (responseResult.status === "error") {
      logWarn(logger, "getUploadsPlaylistId:request-failed", {
        channelId,
        error: responseResult.error.message,
      });
      return responseResult;
    }

    const [channel] = videoResponseSchema(responseResult.value);
    if (!channel) {
      logWarn(logger, "getUploadsPlaylistId:channel-not-found", { channelId });
      return Result.err(
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
      logWarn(logger, "getUploadsPlaylistId:uploads-not-found", { channelId });
      return Result.err(
        new YouTubePlaylistNotFoundError({
          channelId,
          message: `Could not resolve uploads playlist for channel ${channelId}`,
        }),
      );
    }

    logInfo(logger, "getUploadsPlaylistId:success", {
      channelId,
      playlistId: uploads,
    });
    return Result.ok(uploads);
  };

  export const listPlaylistVideoIds = async (
    playlistId: string,
    pageToken?: string,
    options?: {
      logger?: Logger;
    },
  ) => {
    const logger = options?.logger;
    logInfo(logger, "listPlaylistVideoIds:start", {
      playlistId,
      pageToken: pageToken ?? null,
    });

    const apiKeyResult = getYouTubeApiKey();
    if (apiKeyResult.status === "error") {
      logWarn(logger, "listPlaylistVideoIds:missing-api-key", { playlistId });
      return apiKeyResult;
    }

    const url = buildYouTubeUrl("/playlistItems", {
      key: apiKeyResult.value,
      playlistId,
      part: "contentDetails",
      maxResults: "50",
      pageToken,
    });

    const responseResult = await fetchJson<unknown>(url);
    if (responseResult.status === "error") {
      logWarn(logger, "listPlaylistVideoIds:request-failed", {
        playlistId,
        pageToken: pageToken ?? null,
        error: responseResult.error.message,
      });
      return responseResult;
    }

    const payload = responseResult.value as {
      items?: Record<string, unknown>[];
      nextPageToken?: string;
    };

    const videoIds = (Array.isArray(payload.items) ? payload.items : [])
      .map(mapPlaylistVideoId)
      .filter((videoId) => videoId.length > 0);

    const nextPageToken =
      typeof payload.nextPageToken === "string" ? payload.nextPageToken : null;

    logInfo(logger, "listPlaylistVideoIds:success", {
      playlistId,
      pageToken: pageToken ?? null,
      videoCount: videoIds.length,
      nextPageToken,
    });

    return Result.ok({
      videoIds,
      nextPageToken,
    });
  };
}
