import { BEN_CHANNEL_INFO } from "@r8y/davis-sync/channel-info";
import { CrawlService as DavisCrawlService } from "@r8y/davis-sync/crawl";
import { MICKY_CHANNEL_INFO } from "@r8y/micky-data/channel-info";
import { CrawlService as MickyCrawlService } from "@r8y/micky-data/crawl";
import { THEO_CHANNEL_INFO } from "@r8y/theo-data/channel-info";
import { CrawlService as TheoCrawlService } from "@r8y/theo-data/crawl";
import { Effect, Fiber, Runtime, Schedule } from "effect";

type Logger = Pick<Console, "info" | "warn" | "error">;
type LogLevel = "info" | "warn" | "error" | "silent";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_LOG_LEVEL: LogLevel = "warn";
const LOG_LEVELS: LogLevel[] = ["info", "warn", "error", "silent"];
const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
  silent: 3,
};

const settle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.match({
      onFailure: (error) => ({
        status: "error" as const,
        error,
      }),
      onSuccess: (value) => ({ status: "ok" as const, value }),
    }),
  );

const readPositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CHANNEL_CRAWLERS = {
  [THEO_CHANNEL_INFO.channelId]: TheoCrawlService,
  [BEN_CHANNEL_INFO.channelId]: DavisCrawlService,
  [MICKY_CHANNEL_INFO.channelId]: MickyCrawlService,
} as const;

const DEFAULT_CHANNEL_IDS = [
  THEO_CHANNEL_INFO.channelId,
  BEN_CHANNEL_INFO.channelId,
  MICKY_CHANNEL_INFO.channelId,
];

export const readChannelIds = (raw = process.env.CRAWLER_CHANNEL_IDS) => {
  const parsed = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0 ? [...new Set(parsed)] : DEFAULT_CHANNEL_IDS;
};

export const readIntervalMs = (raw = process.env.CRAWLER_INTERVAL_MS) =>
  readPositiveInt(raw, DEFAULT_INTERVAL_MS);

export const shouldRunOnce = (raw = process.env.CRAWLER_RUN_ONCE) =>
  raw?.trim().toLowerCase() === "true";

export const readLogLevel = (raw = process.env.CRAWLER_LOG_LEVEL) => {
  const normalized = raw?.trim().toLowerCase();
  return LOG_LEVELS.includes(normalized as LogLevel)
    ? (normalized as LogLevel)
    : DEFAULT_LOG_LEVEL;
};

const createLogger = (logger: Logger, minLevel: LogLevel): Logger => {
  const shouldLog = (level: Exclude<LogLevel, "silent">) =>
    LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[minLevel];

  return {
    info: (...args) => {
      if (shouldLog("info")) {
        logger.info(...args);
      }
    },
    warn: (...args) => {
      if (shouldLog("warn")) {
        logger.warn(...args);
      }
    },
    error: (...args) => {
      if (shouldLog("error")) {
        logger.error(...args);
      }
    },
  };
};

const resolveCrawler = (channelId: string) =>
  CHANNEL_CRAWLERS[channelId as keyof typeof CHANNEL_CRAWLERS];

const crawlSingleChannel = (logger: Logger, channelId: string) =>
  Effect.gen(function* () {
    const crawler = resolveCrawler(channelId);
    if (!crawler) {
      yield* Effect.sync(() => {
        logger.warn("[live-crawler] unknown channel id, skipping", {
          channelId,
        });
      });

      return {
        channelId,
        status: "skipped" as const,
        message: "Unknown channel id",
      };
    }

    const startedAt = Date.now();
    const result = yield* settle(
      crawler.crawlRss(
        { logger },
        {
          channelId,
        },
      ),
    );

    if (result.status === "error") {
      yield* Effect.sync(() => {
        logger.error("[live-crawler] channel crawl failed", {
          channelId,
          error: result.error.message,
          durationMs: Date.now() - startedAt,
        });
      });

      return {
        channelId,
        status: "error" as const,
        message: result.error.message,
      };
    }

    yield* Effect.sync(() => {
      logger.info("[live-crawler] channel crawl completed", {
        channelId,
        successCount: result.value.successCount,
        failureCount: result.value.failureCount,
        durationMs: Date.now() - startedAt,
      });
    });

    return {
      channelId,
      status: "ok" as const,
      successCount: result.value.successCount,
      failureCount: result.value.failureCount,
    };
  });

export const crawlChannels = (logger: Logger, channelIds: string[]) =>
  Effect.gen(function* () {
    yield* Effect.sync(() => {
      logger.info("[live-crawler] crawl tick start", {
        channelIds,
        channelCount: channelIds.length,
      });
    });

    const results = yield* Effect.forEach(
      channelIds,
      (channelId) => crawlSingleChannel(logger, channelId),
      {
        concurrency: channelIds.length > 0 ? channelIds.length : 1,
      },
    );

    const failedChannels = results.filter((entry) => entry.status === "error");

    yield* Effect.sync(() => {
      logger.info("[live-crawler] crawl tick complete", {
        channelCount: channelIds.length,
        failedChannelCount: failedChannels.length,
      });
    });

    return results;
  });

export const startCrawler = (logger: Logger = console) =>
  Effect.gen(function* () {
    const filteredLogger = createLogger(logger, readLogLevel());
    const channelIds = readChannelIds();
    const intervalMs = readIntervalMs();

    yield* Effect.sync(() => {
      filteredLogger.info("[live-crawler] starting", {
        channelIds,
        intervalMs,
        logLevel: readLogLevel(),
        runOnce: shouldRunOnce(),
      });
    });

    if (shouldRunOnce()) {
      yield* crawlChannels(filteredLogger, channelIds);
      yield* Effect.sync(() => {
        filteredLogger.info("[live-crawler] run-once mode complete");
      });
      return;
    }

    yield* crawlChannels(filteredLogger, channelIds).pipe(
      Effect.repeat(Schedule.spaced(`${intervalMs} millis`)),
    );
  });

const runMain = Runtime.makeRunMain(({ fiber, teardown }) => {
  const onSignal = () => {
    Effect.runFork(Fiber.interrupt(fiber));
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  fiber.addObserver((exit) => {
    teardown(exit, (code) => process.exit(code));
  });
});

if (import.meta.main) {
  runMain(startCrawler(console));
}
