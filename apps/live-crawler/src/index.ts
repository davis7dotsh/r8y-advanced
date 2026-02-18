import { THEO_CHANNEL_INFO } from "theo-data/channel-info";
import { CrawlService } from "theo-data/crawl";

type Logger = Pick<Console, "info" | "warn" | "error">;

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

const readPositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const readChannelIds = (raw = process.env.CRAWLER_CHANNEL_IDS) => {
  const parsed = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0
    ? [...new Set(parsed)]
    : [THEO_CHANNEL_INFO.channelId];
};

export const readIntervalMs = (raw = process.env.CRAWLER_INTERVAL_MS) =>
  readPositiveInt(raw, DEFAULT_INTERVAL_MS);

export const shouldRunOnce = (raw = process.env.CRAWLER_RUN_ONCE) =>
  raw?.trim().toLowerCase() === "true";

const crawlSingleChannel = async (logger: Logger, channelId: string) => {
  const startedAt = Date.now();
  const result = await CrawlService.crawlRss(
    { logger },
    {
      channelId,
    },
  );

  if (result.status === "error") {
    logger.error("[live-crawler] channel crawl failed", {
      channelId,
      error: result.error.message,
      durationMs: Date.now() - startedAt,
    });
    return {
      channelId,
      status: "error" as const,
      message: result.error.message,
    };
  }

  logger.info("[live-crawler] channel crawl completed", {
    channelId,
    successCount: result.value.successCount,
    failureCount: result.value.failureCount,
    durationMs: Date.now() - startedAt,
  });

  return {
    channelId,
    status: "ok" as const,
    successCount: result.value.successCount,
    failureCount: result.value.failureCount,
  };
};

export const crawlChannels = async (logger: Logger, channelIds: string[]) => {
  logger.info("[live-crawler] crawl tick start", {
    channelIds,
    channelCount: channelIds.length,
  });

  const results = await Promise.all(
    channelIds.map((channelId) => crawlSingleChannel(logger, channelId)),
  );

  const failedChannels = results.filter((entry) => entry.status === "error");

  logger.info("[live-crawler] crawl tick complete", {
    channelCount: channelIds.length,
    failedChannelCount: failedChannels.length,
  });

  return results;
};

export const startCrawler = async (logger: Logger = console) => {
  const channelIds = readChannelIds();
  const intervalMs = readIntervalMs();

  logger.info("[live-crawler] starting", {
    channelIds,
    intervalMs,
    runOnce: shouldRunOnce(),
  });

  await crawlChannels(logger, channelIds);

  if (shouldRunOnce()) {
    logger.info("[live-crawler] run-once mode complete");
    return;
  }

  const timer = setInterval(() => {
    void crawlChannels(logger, channelIds);
  }, intervalMs);

  timer.unref?.();
};

if (import.meta.main) {
  await startCrawler(console);
}
