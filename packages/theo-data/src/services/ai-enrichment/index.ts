import { Data, Effect } from "effect";
import { createAiEnrichmentHelpers, type BamlClientLike } from "@r8y/yt-sync";
import { b as bamlClient } from "../../../baml_client";
import { THEO_CHANNEL_INFO } from "../../THEO_CHANNEL_INFO";

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
  export class MissingOpencodeApiKeyError extends Data.TaggedError("MissingOpencodeApiKeyError")<{
    message: string;
  }> {}

  export class AiRequestError extends Data.TaggedError("AiRequestError")<{
    message: string;
  }> {}

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

  export const extractSponsor = (args: {
    logger?: Logger;
    client?: BamlClientLike;
    input: {
      videoTitle: string;
      videoDescription: string;
      sponsorPrompt: string;
    };
  }) => {
    const { logger, input } = args;

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(logger, "extractSponsor:start", {
          videoTitle: input.videoTitle,
          via: "baml:GetSponsor",
        });
      });

      const sponsor = yield* helpers
        .extractSponsor({
          client: args.client,
          input: {
            videoDescription: input.videoDescription,
            sponsorPrompt: input.sponsorPrompt,
            noSponsorKey: THEO_CHANNEL_INFO.noSponsorKey,
          },
        })
        .pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              const step =
                error instanceof MissingOpencodeApiKeyError
                  ? "extractSponsor:missing-api-key"
                  : "extractSponsor:failed";
              logWarn(logger, step, {
                videoTitle: input.videoTitle,
                error: error.message,
              });
            }),
          ),
        );

      yield* Effect.sync(() => {
        logInfo(logger, "extractSponsor:success", {
          videoTitle: input.videoTitle,
          hasSponsor: sponsor.hasSponsor,
          sponsorName: sponsor.sponsorName,
        });
      });

      return sponsor;
    });
  };

  export const classifyComment = (args: {
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

    return Effect.gen(function* () {
      yield* Effect.sync(() => {
        logInfo(logger, "classifyComment:start", {
          videoTitle: input.videoTitle,
          commentAuthor: input.commentAuthor,
          via: "baml:ParseComment",
        });
      });

      const parsed = yield* helpers
        .classifyComment({
          client: args.client,
          input: {
            videoTitle: input.videoTitle,
            videoDescription: input.videoDescription,
            commentAuthor: input.commentAuthor,
            commentText: input.commentText,
          },
        })
        .pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              const step =
                error instanceof MissingOpencodeApiKeyError
                  ? "classifyComment:missing-api-key"
                  : "classifyComment:failed";
              logWarn(logger, step, {
                videoTitle: input.videoTitle,
                commentAuthor: input.commentAuthor,
                error: error.message,
              });
            }),
          ),
        );

      yield* Effect.sync(() => {
        logInfo(logger, "classifyComment:success", {
          videoTitle: input.videoTitle,
          commentAuthor: input.commentAuthor,
        });
      });

      return parsed;
    });
  };
}
