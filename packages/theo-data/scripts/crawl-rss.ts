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

const result = await CrawlService.crawlRss(
  { logger: console },
  {
    channelId: readArg("channel-id"),
  },
);

if (result.status === "error") {
  console.error(result.error.message);
  process.exit(1);
}

console.log(JSON.stringify(result.value, null, 2));
