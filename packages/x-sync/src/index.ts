import { Client } from "@xdevplatform/xdk";
import { Effect, Schedule } from "effect";

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

const withRetries = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.retry(
      Schedule.exponential("250 millis").pipe(
        Schedule.compose(Schedule.recurs(2)),
      ),
    ),
  );

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

export const fetchXPostMetrics = <
  TExternalError extends { message: string },
>(args: {
  postId: string;
  bearerToken: string;
  externalError: (message: string) => TExternalError;
}) => {
  const client = new Client({ bearerToken: args.bearerToken });

  return withRetries(
    Effect.tryPromise({
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
    }).pipe(
      Effect.map((xPost) => {
        const publicMetrics = asRecord(xPost.data?.publicMetrics);

        return {
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
      }),
    ),
  );
};
