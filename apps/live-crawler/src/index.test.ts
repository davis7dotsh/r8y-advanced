import { beforeAll, expect, test } from "bun:test";
import { BEN_CHANNEL_INFO } from "@r8y/davis-sync/channel-info";
import { THEO_CHANNEL_INFO } from "@r8y/theo-data/channel-info";
import { Effect } from "effect";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgres://local:test@localhost:5432/local";
});

const loadModule = () => import("./index");

test("readChannelIds falls back to Theo + Ben channel ids", async () => {
  const { readChannelIds } = await loadModule();
  expect(readChannelIds("")).toEqual([
    THEO_CHANNEL_INFO.channelId,
    BEN_CHANNEL_INFO.channelId,
  ]);
});

test("readChannelIds normalizes comma-separated values", async () => {
  const { readChannelIds } = await loadModule();
  expect(readChannelIds("  one, two,one ,,three ")).toEqual([
    "one",
    "two",
    "three",
  ]);
});

test("readIntervalMs returns fallback for invalid input", async () => {
  const { readIntervalMs } = await loadModule();
  expect(readIntervalMs("abc")).toBe(300000);
  expect(readIntervalMs("0")).toBe(300000);
  expect(readIntervalMs("60000")).toBe(60000);
});

test("shouldRunOnce only enables on true", async () => {
  const { shouldRunOnce } = await loadModule();
  expect(shouldRunOnce("true")).toBe(true);
  expect(shouldRunOnce("TRUE")).toBe(true);
  expect(shouldRunOnce("1")).toBe(false);
  expect(shouldRunOnce(undefined)).toBe(false);
});

test("readLogLevel defaults to warn", async () => {
  const { readLogLevel } = await loadModule();
  expect(readLogLevel(undefined)).toBe("warn");
  expect(readLogLevel("")).toBe("warn");
});

test("readLogLevel normalizes valid values", async () => {
  const { readLogLevel } = await loadModule();
  expect(readLogLevel("INFO")).toBe("info");
  expect(readLogLevel(" error ")).toBe("error");
  expect(readLogLevel("silent")).toBe("silent");
  expect(readLogLevel("verbose")).toBe("warn");
});

test("crawlChannels skips unknown ids", async () => {
  const { crawlChannels } = await loadModule();
  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const result = await crawlChannels(logger, ["unknown-channel-id"]).pipe(
    Effect.runPromise,
  );

  expect(result).toEqual([
    {
      channelId: "unknown-channel-id",
      status: "skipped",
      message: "Unknown channel id",
    },
  ]);
});
