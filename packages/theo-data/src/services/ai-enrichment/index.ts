import { createAnthropic } from "@ai-sdk/anthropic";
import { Result, TaggedError } from "better-result";
import { generateText, Output } from "ai";
import { z } from "zod";

type Logger = Pick<Console, "info" | "warn" | "error">;

const logInfo = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.info?.(`[aiEnrichment] ${step}`, details ?? {});
};

const logWarn = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.warn?.(`[aiEnrichment] ${step}`, details ?? {});
};

const sponsorExtractionSchema = z.object({
  hasSponsor: z.boolean(),
  sponsorName: z.string().min(1),
  sponsorKey: z.string().min(1),
});

const commentClassificationSchema = z.object({
  isEditingMistake: z.boolean(),
  isSponsorMention: z.boolean(),
  isQuestion: z.boolean(),
  isPositiveComment: z.boolean(),
});

const buildZenAnthropic = () => {
  const apiKey = process.env.OPENCODE_API_KEY;
  return apiKey
    ? Result.ok(
        createAnthropic({
          apiKey,
          baseURL: "https://opencode.ai/zen/v1",
        }),
      )
    : Result.err(
        new AiEnrichmentService.MissingOpencodeApiKeyError({
          message: "OPENCODE_API_KEY is required",
        }),
      );
};

const runObjectPrompt = async <T>(
  schema: z.ZodType<T>,
  promptLines: string[],
  options?: {
    logger?: Logger;
    operation: string;
  },
) => {
  const logger = options?.logger;
  const operation = options?.operation ?? "prompt";
  logInfo(logger, "runObjectPrompt:start", { operation });

  const clientResult = buildZenAnthropic();
  if (clientResult.status === "error") {
    logWarn(logger, "runObjectPrompt:missing-api-key", { operation });
    return clientResult;
  }

  const prompt = promptLines.join("\n");

  return Result.tryPromise(
    {
      try: async () => {
        const response = await generateText({
          model: clientResult.value("claude-haiku-4-5"),
          prompt,
          output: Output.object({ schema }),
          maxRetries: 3,
          temperature: 0,
        });

        return response.output;
      },
      catch: (cause) =>
        new AiEnrichmentService.AiRequestError({
          message:
            cause instanceof Error
              ? cause.message
              : "Unknown AI request error",
        }),
    },
  );
};

const sanitizeSponsor = (value: z.infer<typeof sponsorExtractionSchema>) => {
  const normalizedName = value.sponsorName.trim();
  const normalizedKey = value.sponsorKey.trim();

  if (!value.hasSponsor) {
    return {
      hasSponsor: false,
      sponsorName: "no sponsor",
      sponsorKey: "https://t3.gg",
    };
  }

  if (!normalizedName || !normalizedKey) {
    return {
      hasSponsor: false,
      sponsorName: "no sponsor",
      sponsorKey: "https://t3.gg",
    };
  }

  return {
    hasSponsor: true,
    sponsorName: normalizedName,
    sponsorKey: normalizedKey,
  };
};

export namespace AiEnrichmentService {
  export class MissingOpencodeApiKeyError extends TaggedError("MissingOpencodeApiKeyError")<{
    message: string;
  }>() {}

  export class AiRequestError extends TaggedError("AiRequestError")<{
    message: string;
  }>() {}

  export const extractSponsor = async (args: {
    logger?: Logger;
    input: {
      videoTitle: string;
      videoDescription: string;
      sponsorPrompt: string;
    };
  }) => {
    const { logger, input } = args;
    logInfo(logger, "extractSponsor:start", { videoTitle: input.videoTitle });

    const result = await runObjectPrompt(sponsorExtractionSchema, [
      "Extract sponsor details from this Theo video.",
      "Return deterministic values. If no sponsor exists, return hasSponsor=false, sponsorName='no sponsor', sponsorKey='https://t3.gg'.",
      `Sponsor rules: ${input.sponsorPrompt}`,
      `Video title: ${input.videoTitle}`,
      "Video description:",
      input.videoDescription,
    ], {
      logger,
      operation: "extractSponsor",
    });

    if (result.status === "error") {
      logWarn(logger, "extractSponsor:failed", {
        videoTitle: input.videoTitle,
        error: result.error.message,
      });
      return result;
    }

    logInfo(logger, "extractSponsor:success", {
      videoTitle: input.videoTitle,
      hasSponsor: result.value.hasSponsor,
    });
    return Result.ok(sanitizeSponsor(result.value));
  };

  export const classifyComment = async (args: {
    logger?: Logger;
    input: {
      videoTitle: string;
      videoDescription: string;
      commentText: string;
      commentAuthor: string;
    };
  }) => {
    const { logger, input } = args;
    logInfo(logger, "classifyComment:start", {
      videoTitle: input.videoTitle,
      commentAuthor: input.commentAuthor,
    });

    const result = await runObjectPrompt(commentClassificationSchema, [
      "Classify this YouTube comment for Theo channel moderation analytics.",
      "Respond with deterministic booleans only.",
      `Video title: ${input.videoTitle}`,
      `Video context: ${input.videoDescription.slice(0, 800)}`,
      `Comment author: ${input.commentAuthor}`,
      `Comment text: ${input.commentText}`,
      "Interpretation guide:",
      "- isEditingMistake: true if comment reports mistakes/bugs/editing issues in the video.",
      "- isSponsorMention: true if comment references sponsorship, ad read, affiliate link, or sponsor brand.",
      "- isQuestion: true if the comment asks a direct question.",
      "- isPositiveComment: true if the overall sentiment is supportive/positive.",
    ], {
      logger,
      operation: "classifyComment",
    });

    if (result.status === "error") {
      logWarn(logger, "classifyComment:failed", {
        videoTitle: input.videoTitle,
        commentAuthor: input.commentAuthor,
        error: result.error.message,
      });
      return result;
    }

    logInfo(logger, "classifyComment:success", {
      videoTitle: input.videoTitle,
      commentAuthor: input.commentAuthor,
    });
    return Result.ok(result.value);
  };
}
