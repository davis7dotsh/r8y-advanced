import { Result } from "better-result";
import { XMLParser } from "fast-xml-parser";

export type Logger = Pick<Console, "info" | "warn" | "error">;

export type ChannelInfo = {
  channelId: string;
  name: string;
  sponsorPrompt: string;
  noSponsorKey: string;
};

export type BamlClientLike = {
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

const extractVideoIds = (
  entry: { videoId?: string } | { videoId?: string }[],
) => {
  const entries = Array.isArray(entry) ? entry : [entry];
  return [
    ...new Set(
      entries
        .map((item) => item.videoId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
};

export const parseRssVideoIds = (xml: string) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const parsed = parser.parse(xml) as {
    feed?: {
      entry?:
        | {
            videoId?: string;
          }
        | {
            videoId?: string;
          }[];
    };
  };

  return parsed.feed?.entry ? extractVideoIds(parsed.feed.entry) : [];
};

export const fetchRssVideoIds = async <
  TExternalError extends { message: string },
>(args: {
  channelId: string;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
  externalError: (message: string) => TExternalError;
}) => {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${args.channelId}`;
  const fetchImpl = args.fetchImpl ?? fetch;

  const feedResult = await Result.tryPromise(
    {
      try: async () => {
        const response = await fetchImpl(feedUrl);
        if (!response.ok) {
          throw new Error(`RSS fetch failed with status ${response.status}`);
        }

        return response.text();
      },
      catch: (cause) =>
        args.externalError(
          cause instanceof Error
            ? cause.message
            : "Failed to fetch YouTube RSS feed",
        ),
    },
    {
      retry: {
        times: 2,
        delayMs: 250,
        backoff: "exponential",
      },
    },
  );

  if (feedResult.status === "error") {
    return feedResult;
  }

  return Result.ok({
    feedUrl,
    videoIds: parseRssVideoIds(feedResult.value),
  });
};

const sanitizeSponsor = (
  value: {
    sponsorName: string;
    sponsorKey: string;
  },
  noSponsorKey: string,
) => {
  const sponsorName = value.sponsorName.trim().toLowerCase();
  const sponsorKey = value.sponsorKey.trim().toLowerCase();
  const normalizedNoSponsorKey = noSponsorKey.trim().toLowerCase();
  const noSponsorHost = normalizedNoSponsorKey.replace(/^https?:\/\//, "");

  const isNoSponsor =
    !sponsorName ||
    !sponsorKey ||
    sponsorName === "no sponsor" ||
    sponsorKey === normalizedNoSponsorKey ||
    sponsorKey === noSponsorHost;

  if (isNoSponsor) {
    return {
      hasSponsor: false,
      sponsorName: "no sponsor",
      sponsorKey: normalizedNoSponsorKey,
    };
  }

  return {
    hasSponsor: true,
    sponsorName,
    sponsorKey,
  };
};

export const createAiEnrichmentHelpers = <
  TMissingApiKeyError extends { message: string },
  TAiRequestError extends { message: string },
>(deps: {
  defaultClient?: BamlClientLike;
  hasApiKey?: () => boolean;
  createMissingApiKeyError: (message: string) => TMissingApiKeyError;
  createAiRequestError: (message: string) => TAiRequestError;
}) => {
  const resolveClient = (client?: BamlClientLike) => {
    if (client) {
      return Result.ok(client);
    }

    if (deps.defaultClient && (deps.hasApiKey?.() ?? true)) {
      return Result.ok(deps.defaultClient);
    }

    return Result.err(
      deps.createMissingApiKeyError("OPENCODE_API_KEY is required"),
    );
  };

  const extractSponsor = async (args: {
    client?: BamlClientLike;
    input: {
      videoDescription: string;
      sponsorPrompt: string;
      noSponsorKey: string;
    };
  }) => {
    const clientResult = resolveClient(args.client);
    if (clientResult.status === "error") {
      return clientResult;
    }

    const sponsorResult = await Result.tryPromise(
      {
        try: () =>
          clientResult.value.GetSponsor(
            args.input.sponsorPrompt,
            args.input.videoDescription,
          ),
        catch: (cause) =>
          deps.createAiRequestError(
            cause instanceof Error ? cause.message : "Unknown AI request error",
          ),
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
      return sponsorResult;
    }

    return Result.ok(
      sanitizeSponsor(sponsorResult.value, args.input.noSponsorKey),
    );
  };

  const classifyComment = async (args: {
    client?: BamlClientLike;
    input: {
      videoTitle: string;
      videoDescription: string;
      commentAuthor: string;
      commentText: string;
    };
  }) => {
    const clientResult = resolveClient(args.client);
    if (clientResult.status === "error") {
      return clientResult;
    }

    const parseResult = await Result.tryPromise(
      {
        try: () =>
          clientResult.value.ParseComment(
            args.input.videoTitle,
            args.input.videoDescription,
            args.input.commentAuthor,
            args.input.commentText,
          ),
        catch: (cause) =>
          deps.createAiRequestError(
            cause instanceof Error ? cause.message : "Unknown AI request error",
          ),
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
      return parseResult;
    }

    return Result.ok({
      isEditingMistake: parseResult.value.isEditingMistake,
      isSponsorMention: parseResult.value.isSponsorMention,
      isQuestion: parseResult.value.isQuestion,
      isPositiveComment: parseResult.value.isPositiveComment,
    });
  };

  return {
    extractSponsor,
    classifyComment,
  };
};
