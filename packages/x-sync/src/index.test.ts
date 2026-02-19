import { expect, test } from "bun:test";
import { parseXPostUrl } from "./index";

test("parseXPostUrl parses status url", () => {
  expect(parseXPostUrl("https://x.com/user/status/12345")).toEqual({
    postId: "12345",
    canonicalUrl: "https://x.com/i/web/status/12345",
  });
});

test("parseXPostUrl rejects non-x url", () => {
  expect(parseXPostUrl("https://example.com/status/12345")).toBeNull();
});
