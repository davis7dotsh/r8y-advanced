import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

const opencodeApiKey = process.env.OPENCODE_API_KEY;

if (!opencodeApiKey) {
  console.error("OPENCODE_API_KEY is required");
  process.exit(1);
}

const outputSchema = z.object({
  videoTitle: z.string().min(1),
  shouldNotify: z.boolean(),
  priority: z.enum(["low", "medium", "high"]),
  reason: z.string().min(1),
});

const prompt = [
  "Classify this Theo video signal and produce a compact decision object.",
  "Title: 'Bun 1.4 drops new SQL features for Postgres developers'",
  "Channel: Theo - t3.gg",
  "Summary: 'Walkthrough of Bun SQL improvements and migration tips.'",
  "The object must be deterministic and concise.",
].join("\n");

const explainError = (error: unknown) =>
  error instanceof Error ? error.message : JSON.stringify(error);

const runCase = async (
  label: string,
  run: () => Promise<Awaited<ReturnType<typeof generateText>>>,
) => {
  try {
    const result = await run();
    return { label, ok: true as const, result };
  } catch (error) {
    return { label, ok: false as const, error: explainError(error) };
  }
};

const zenAnthropic = createAnthropic({
  apiKey: opencodeApiKey,
  baseURL: "https://opencode.ai/zen/v1",
});

const claudeCase = await runCase(
  "target model claude-haiku-4-5 (@ai-sdk/anthropic)",
  () =>
    generateText({
      model: zenAnthropic("claude-haiku-4-5"),
      prompt,
      output: Output.object({ schema: outputSchema }),
      maxRetries: 0,
    }),
);

if (claudeCase.ok) {
  console.log("PASS: Claude Haiku 4.5 generateText(output) succeeded on Zen.");
  console.log(JSON.stringify(claudeCase.result.output, null, 2));
  process.exit(0);
}

const controlCase = await runCase(
  "control model claude-3-5-haiku (@ai-sdk/anthropic)",
  () =>
    generateText({
      model: zenAnthropic("claude-3-5-haiku"),
      prompt,
      output: Output.object({ schema: outputSchema }),
      maxRetries: 0,
    }),
);

console.error(
  "FAIL: Claude Haiku 4.5 generateText(output) did not succeed on Zen.",
);
console.error(`- target: ${claudeCase.error}`);

if (controlCase.ok) {
  console.error("Control check passed, so API key + AI SDK wiring are valid:");
  console.error(JSON.stringify(controlCase.result.output, null, 2));
  console.error(
    "Diagnosis: this is likely a Zen-side Claude model issue right now.",
  );
} else {
  console.error(`Control check also failed: ${controlCase.error}`);
}

process.exit(1);
