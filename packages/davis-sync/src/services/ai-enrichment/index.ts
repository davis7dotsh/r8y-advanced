import { Result, TaggedError } from "better-result";
import { createAiEnrichmentHelpers, type BamlClientLike } from "@r8y/yt-sync";
import { b as bamlClient } from "../../../baml_client";
import { BEN_CHANNEL_INFO } from "../../BEN_CHANNEL_INFO";

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

export namespace AiEnrichmentService {
  export class MissingOpencodeApiKeyError extends TaggedError("MissingOpencodeApiKeyError")<{
    message: string;
  }>() {}

  export class AiRequestError extends TaggedError("AiRequestError")<{
    message: string;
  }>() {}

  const helpers = createAiEnrichmentHelpers({
    defaultClient: bamlClient,
    hasApiKey: () => Boolean(process.env.OPENCODE_API_KEY),
    createMissingApiKeyError: (message) =>
      new MissingOpencodeApiKeyError({
        message,
      }),
    createAiRequestError: (message) =>
      new AiRequestError({
        message,
      }),
  });

  export const extractSponsor = async (args: {
    logger?: Logger;
    client?: BamlClientLike;
    input: {
      videoTitle: string;
      videoDescription: string;
      sponsorPrompt: string;
    };
  }) => {
    const { logger, input } = args;

    logInfo(logger, "extractSponsor:start", {
      videoTitle: input.videoTitle,
      via: "baml:GetSponsor",
    });

    const sponsorResult = await helpers.extractSponsor({
      client: args.client,
      input: {
        videoDescription: input.videoDescription,
        sponsorPrompt: input.sponsorPrompt,
        noSponsorKey: BEN_CHANNEL_INFO.noSponsorKey,
      },
    });

    if (sponsorResult.status === "error") {
      const step =
        sponsorResult.error instanceof MissingOpencodeApiKeyError
          ? "extractSponsor:missing-api-key"
          : "extractSponsor:failed";
      logWarn(logger, step, {
        videoTitle: input.videoTitle,
        error: sponsorResult.error.message,
      });
      return sponsorResult;
    }

    logInfo(logger, "extractSponsor:success", {
      videoTitle: input.videoTitle,
      hasSponsor: sponsorResult.value.hasSponsor,
      sponsorName: sponsorResult.value.sponsorName,
    });

    return Result.ok(sponsorResult.value);
  };

  export const classifyComment = async (args: {
    logger?: Logger;
    client?: BamlClientLike;
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
      via: "baml:ParseComment",
    });

    const parseResult = await helpers.classifyComment({
      client: args.client,
      input: {
        videoTitle: input.videoTitle,
        videoDescription: input.videoDescription,
        commentAuthor: input.commentAuthor,
        commentText: input.commentText,
      },
    });

    if (parseResult.status === "error") {
      const step =
        parseResult.error instanceof MissingOpencodeApiKeyError
          ? "classifyComment:missing-api-key"
          : "classifyComment:failed";
      logWarn(logger, step, {
        videoTitle: input.videoTitle,
        commentAuthor: input.commentAuthor,
        error: parseResult.error.message,
      });
      return parseResult;
    }

    logInfo(logger, "classifyComment:success", {
      videoTitle: input.videoTitle,
      commentAuthor: input.commentAuthor,
    });

    return Result.ok(parseResult.value);
  };
}
