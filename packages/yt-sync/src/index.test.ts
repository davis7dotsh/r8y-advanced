import { expect, test } from "bun:test";
import { fetchRssVideoIds, parseRssVideoIds } from "./index";

test("parseRssVideoIds dedupes ids", () => {
  expect(
    parseRssVideoIds(`
      <feed>
        <entry><videoId>one</videoId></entry>
        <entry><videoId>two</videoId></entry>
        <entry><videoId>one</videoId></entry>
      </feed>
    `),
  ).toEqual(["one", "two"]);
});

test("fetchRssVideoIds returns video ids", async () => {
  const result = await fetchRssVideoIds({
    channelId: "abc",
    fetchImpl: async () =>
      new Response("<feed><entry><videoId>v1</videoId></entry></feed>", {
        status: 200,
      }),
    externalError: (message) => new Error(message),
  });

  expect(result.status).toBe("ok");
  if (result.status === "ok") {
    expect(result.value.videoIds).toEqual(["v1"]);
  }
});
