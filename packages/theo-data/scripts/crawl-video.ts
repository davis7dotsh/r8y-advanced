import { Effect } from "effect";
import { CrawlService } from "../src/services/crawl";

const readArg = (name: string) => {
  const flag = `--${name}=`;
  const withValue = Bun.argv.find((arg) => arg.startsWith(flag));
  if (withValue) {
    return withValue.slice(flag.length);
  }

  const index = Bun.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) {
    return Bun.argv[index + 1];
  }

  return undefined;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes")
    return true;
  if (normalized === "false" || normalized === "0" || normalized === "no")
    return false;
  return fallback;
};

const positionalVideoId = Bun.argv
  .slice(2)
  .find((arg) => !arg.startsWith("--"));
const videoId = readArg("video-id") ?? positionalVideoId;

if (!videoId) {
  console.error(
    "Missing video id. Use --video-id=<id> or provide it as first positional arg.",
  );
  process.exit(1);
}

const sendNotifications = parseBoolean(readArg("send-notifications"), false);

const result = await CrawlService.crawlVideo(
  { logger: console },
  {
    videoId,
    sendNotifications,
  },
).pipe(
  Effect.match({
    onFailure: (error) => ({ status: "error" as const, error }),
    onSuccess: (value) => ({ status: "ok" as const, value }),
  }),
  Effect.runPromise,
);

if (result.status === "error") {
  console.error(result.error.message);
  process.exit(1);
}

console.log(JSON.stringify(result.value, null, 2));
