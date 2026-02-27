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

const parseLimit = () => {
  const raw = readArg("limit") ?? "400";

  if (raw === "all") {
    return "all" as const;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.error("Invalid --limit value. Use a positive integer or 'all'.");
    process.exit(1);
  }

  return parsed;
};

const parseConcurrency = () => {
  const raw = readArg("concurrency");

  if (!raw) {
    return 3;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.error("Invalid --concurrency value. Use a positive integer.");
    process.exit(1);
  }

  return parsed;
};

const result = await CrawlService.backfillChannel(
  { logger: console },
  {
    channelId: readArg("channel-id"),
    limit: parseLimit(),
    concurrency: parseConcurrency(),
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
