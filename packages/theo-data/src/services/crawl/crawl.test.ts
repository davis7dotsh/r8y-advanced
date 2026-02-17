import { expect, test } from "bun:test";
import { CrawlService } from "./index";

test("crawlVideo rejects empty videoId", async () => {
  const result = await CrawlService.crawlVideo(
    {},
    {
      videoId: "",
      sendNotifications: false,
    },
  );

  expect(result.status).toBe("error");

  if (result.status === "error") {
    expect(result.error._tag).toBe("InvalidCrawlInputError");
  }
});
