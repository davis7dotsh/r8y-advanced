import { Client } from "@xdevplatform/xdk";
import { Result } from "better-result";

const X_POST_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

const asRecord = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const readMetric = (
  metrics: Record<string, unknown> | null,
  keys: string[],
) => {
  const matched = metrics
    ? keys
        .map((key) => metrics[key])
        .find((entry) => typeof entry === "number" && Number.isFinite(entry))
    : null;

  return typeof matched === "number" ? Math.floor(matched) : null;
};

export const parseXPostUrl = (rawUrl: string) => {
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

  const postId = parsed.pathname.match(/\/status\/(\d+)/)?.[1];

  return postId
    ? {
        postId,
        canonicalUrl: `https://x.com/i/web/status/${postId}`,
      }
    : null;
};

export const fetchXPostMetrics = async <
  TExternalError extends { message: string },
>(args: {
  postId: string;
  bearerToken: string;
  externalError: (message: string) => TExternalError;
}) => {
  const client = new Client({ bearerToken: args.bearerToken });

  const xPostResult = await Result.tryPromise(
    {
      try: () =>
        client.posts.getById(args.postId, {
          tweetFields: ["public_metrics"],
        }),
      catch: (cause) =>
        args.externalError(
          cause instanceof Error
            ? cause.message
            : "Failed while requesting X post metrics",
        ),
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

  return Result.ok({
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
  });
};
