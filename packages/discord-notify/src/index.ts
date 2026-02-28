import { Data, Effect, Schedule } from "effect";

export class DiscordWebhookError extends Data.TaggedError(
  "DiscordWebhookError",
)<{
  message: string;
}> {}

type VideoEmbedInput = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  channelName: string;
  publishedAt: Date | null;
};

const YOUTUBE_RED = 0xff0000;

const buildVideoEmbed = (video: VideoEmbedInput) => ({
  embeds: [
    {
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      color: YOUTUBE_RED,
      image: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
      author: { name: video.channelName },
      timestamp: video.publishedAt?.toISOString(),
    },
  ],
});

export const sendVideoEmbed = <
  TExternalError extends { message: string },
>(args: {
  webhookUrl: string;
  video: VideoEmbedInput;
  externalError: (message: string) => TExternalError;
}) =>
  Effect.tryPromise({
    try: async () => {
      const body = buildVideoEmbed(args.video);
      const response = await fetch(args.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Discord webhook failed (${response.status}): ${text}`);
      }
    },
    catch: (cause) =>
      args.externalError(
        cause instanceof Error
          ? cause.message
          : "Failed to send Discord webhook",
      ),
  }).pipe(
    Effect.retry(
      Schedule.exponential("500 millis").pipe(
        Schedule.compose(Schedule.recurs(2)),
      ),
    ),
  );

export const resolveWebhookUrl = (raw = process.env.DISCORD_WEBHOOK_URL) =>
  raw?.trim() || null;
