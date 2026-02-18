import { beforeAll, expect, test } from "bun:test";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgres://local:test@localhost:5432/local";
});

const loadModule = () => import("./index");

test("readChannelIds falls back to Theo channel id", async () => {
  const { readChannelIds } = await loadModule();
  expect(readChannelIds("")).toEqual(["UCbRP3c757lWg9M-U7TyEkXA"]);
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
