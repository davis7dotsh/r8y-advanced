import { expect, test } from "bun:test";
import { Effect } from "effect";
import { CrawlService } from "./index";

test("crawlVideo rejects empty videoId", async () => {
  const result = await CrawlService.crawlVideo(
    {},
    {
      videoId: "",
      sendNotifications: false,
    },
  )
    .pipe(
      Effect.match({
        onFailure: (error) => ({ status: "error" as const, error }),
        onSuccess: (value) => ({ status: "ok" as const, value }),
      }),
      Effect.runPromise,
    );

  expect(result.status).toBe("error");

  if (result.status === "error") {
    expect(result.error._tag).toBe("InvalidCrawlInputError");
  }
});
