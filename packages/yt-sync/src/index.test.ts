import { expect, test } from "bun:test";
import { Effect } from "effect";
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
  }).pipe(Effect.runPromise);

  expect(result.videoIds).toEqual(["v1"]);
});
