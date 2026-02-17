import { Result, TaggedError } from "better-result";
import { b as bamlClient } from "../../../baml_client";

type Logger = Pick<Console, "info" | "warn" | "error">;

type BamlClientLike = {
  GetSponsor: (
    sponsorPrompt: string,
    videoDescription: string,
  ) => Promise<{
    sponsorName: string;
    sponsorKey: string;
  }>;
  ParseComment: (
    videoTitle: string,
    videoDescription: string,
    commentAuthor: string,
    commentText: string,
  ) => Promise<{
    isEditingMistake: boolean;
    isSponsorMention: boolean;
    isQuestion: boolean;
    isPositiveComment: boolean;
  }>;
};

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

const defaultNoSponsor = {
  hasSponsor: false,
  sponsorName: "no sponsor",
  sponsorKey: "https://t3.gg",
};

const sanitizeSponsor = (value: {
  sponsorName: string;
  sponsorKey: string;
}) => {
  const sponsorName = value.sponsorName.trim().toLowerCase();
  const sponsorKey = value.sponsorKey.trim().toLowerCase();

  const isNoSponsor =
    !sponsorName ||
    !sponsorKey ||
    sponsorName === "no sponsor" ||
    sponsorKey === "https://t3.gg" ||
    sponsorKey === "t3.gg";

  if (isNoSponsor) {
    return defaultNoSponsor;
  }

  return {
    hasSponsor: true,
    sponsorName,
    sponsorKey,
  };
};

const resolveClient = (client?: BamlClientLike) => {
  if (client) {
    return Result.ok(client);
  }

  return process.env.OPENCODE_API_KEY
    ? Result.ok(bamlClient)
    : Result.err(
        new AiEnrichmentService.MissingOpencodeApiKeyError({
          message: "OPENCODE_API_KEY is required",
        }),
      );
};

const toErrorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Unknown AI request error";

export namespace AiEnrichmentService {
  export class MissingOpencodeApiKeyError extends TaggedError("MissingOpencodeApiKeyError")<{
    message: string;
  }>() {}

  export class AiRequestError extends TaggedError("AiRequestError")<{
    message: string;
  }>() {}

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

    const clientResult = resolveClient(args.client);
    if (clientResult.status === "error") {
      logWarn(logger, "extractSponsor:missing-api-key", {
        videoTitle: input.videoTitle,
      });
      return clientResult;
    }

    const sponsorResult = await Result.tryPromise(
      {
        try: () =>
          clientResult.value.GetSponsor(
            input.sponsorPrompt,
            input.videoDescription,
          ),
        catch: (cause) =>
          new AiRequestError({
            message: toErrorMessage(cause),
          }),
      },
      {
        retry: {
          times: 3,
          delayMs: 200,
          backoff: "exponential",
        },
      },
    );

    if (sponsorResult.status === "error") {
      logWarn(logger, "extractSponsor:failed", {
        videoTitle: input.videoTitle,
        error: sponsorResult.error.message,
      });
      return sponsorResult;
    }

    const sanitized = sanitizeSponsor(sponsorResult.value);

    logInfo(logger, "extractSponsor:success", {
      videoTitle: input.videoTitle,
      hasSponsor: sanitized.hasSponsor,
      sponsorName: sanitized.sponsorName,
    });

    return Result.ok(sanitized);
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

    const clientResult = resolveClient(args.client);
    if (clientResult.status === "error") {
      logWarn(logger, "classifyComment:missing-api-key", {
        videoTitle: input.videoTitle,
        commentAuthor: input.commentAuthor,
      });
      return clientResult;
    }

    const parseResult = await Result.tryPromise(
      {
        try: () =>
          clientResult.value.ParseComment(
            input.videoTitle,
            input.videoDescription,
            input.commentAuthor,
            input.commentText,
          ),
        catch: (cause) =>
          new AiRequestError({
            message: toErrorMessage(cause),
          }),
      },
      {
        retry: {
          times: 3,
          delayMs: 200,
          backoff: "exponential",
        },
      },
    );

    if (parseResult.status === "error") {
      logWarn(logger, "classifyComment:failed", {
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

    return Result.ok({
      isEditingMistake: parseResult.value.isEditingMistake,
      isSponsorMention: parseResult.value.isSponsorMention,
      isQuestion: parseResult.value.isQuestion,
      isPositiveComment: parseResult.value.isPositiveComment,
    });
  };
}
