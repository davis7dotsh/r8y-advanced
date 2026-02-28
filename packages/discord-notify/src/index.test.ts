import { expect, test } from "bun:test";
import { Data, Effect } from "effect";
import { resolveWebhookUrl, sendVideoEmbed } from "./index.ts";

class TestError extends Data.TaggedError("TestError")<{ message: string }> {}

test("resolveWebhookUrl returns null for empty/undefined", () => {
  expect(resolveWebhookUrl(undefined)).toBeNull();
  expect(resolveWebhookUrl("")).toBeNull();
  expect(resolveWebhookUrl("  ")).toBeNull();
});

test("resolveWebhookUrl trims and returns value", () => {
  expect(
    resolveWebhookUrl("  https://discord.com/api/webhooks/123/abc  "),
  ).toBe("https://discord.com/api/webhooks/123/abc");
});

test("sendVideoEmbed fails for invalid webhook url", async () => {
  const result = await sendVideoEmbed({
    webhookUrl: "http://localhost:1/nonexistent",
    video: {
      videoId: "test123",
      title: "Test Video",
      thumbnailUrl: null,
      channelName: "Test Channel",
      publishedAt: null,
    },
    externalError: (message) => new TestError({ message }),
  }).pipe(
    Effect.match({
      onFailure: (error) => ({ status: "error" as const, tag: error._tag }),
      onSuccess: () => ({ status: "ok" as const, tag: null }),
    }),
    Effect.runPromise,
  );

  expect(result.status).toBe("error");
  expect(result.tag).toBe("TestError");
});
