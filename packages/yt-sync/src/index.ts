import { Effect, Schedule } from "effect";
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

const withExponentialRetries = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  args: {
    times: number;
    delayMs: number;
  },
) =>
  effect.pipe(
    Effect.retry(
      Schedule.exponential(`${args.delayMs} millis`).pipe(
        Schedule.compose(Schedule.recurs(args.times)),
      ),
    ),
  );

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

export const fetchRssVideoIds = <
  TExternalError extends { message: string },
>(args: {
  channelId: string;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
  externalError: (message: string) => TExternalError;
}) => {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${args.channelId}`;
  const fetchImpl = args.fetchImpl ?? fetch;

  return withExponentialRetries(
    Effect.tryPromise({
      try: async (signal) => {
        const response = await fetchImpl(feedUrl, { signal });
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
    }).pipe(
      Effect.map((xml) => ({
        feedUrl,
        videoIds: parseRssVideoIds(xml),
      })),
    ),
    {
      times: 2,
      delayMs: 250,
    },
  );
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
  const resolveClient = (
    client?: BamlClientLike,
  ): Effect.Effect<BamlClientLike, TMissingApiKeyError> => {
    if (client) {
      return Effect.succeed(client);
    }

    if (deps.defaultClient && (deps.hasApiKey?.() ?? true)) {
      return Effect.succeed(deps.defaultClient);
    }

    return Effect.fail(
      deps.createMissingApiKeyError("OPENCODE_API_KEY is required"),
    );
  };

  const extractSponsor = (args: {
    client?: BamlClientLike;
    input: {
      videoDescription: string;
      sponsorPrompt: string;
      noSponsorKey: string;
    };
  }): Effect.Effect<
    {
      hasSponsor: boolean;
      sponsorName: string;
      sponsorKey: string;
    },
    TMissingApiKeyError | TAiRequestError
  > =>
    resolveClient(args.client).pipe(
      Effect.flatMap((client) =>
        withExponentialRetries(
          Effect.tryPromise({
            try: () =>
              client.GetSponsor(
                args.input.sponsorPrompt,
                args.input.videoDescription,
              ),
            catch: (cause) =>
              deps.createAiRequestError(
                cause instanceof Error
                  ? cause.message
                  : "Unknown AI request error",
              ),
          }),
          {
            times: 3,
            delayMs: 200,
          },
        ),
      ),
      Effect.map((result) => sanitizeSponsor(result, args.input.noSponsorKey)),
    );

  const classifyComment = (args: {
    client?: BamlClientLike;
    input: {
      videoTitle: string;
      videoDescription: string;
      commentAuthor: string;
      commentText: string;
    };
  }): Effect.Effect<
    {
      isEditingMistake: boolean;
      isSponsorMention: boolean;
      isQuestion: boolean;
      isPositiveComment: boolean;
    },
    TMissingApiKeyError | TAiRequestError
  > =>
    resolveClient(args.client).pipe(
      Effect.flatMap((client) =>
        withExponentialRetries(
          Effect.tryPromise({
            try: () =>
              client.ParseComment(
                args.input.videoTitle,
                args.input.videoDescription,
                args.input.commentAuthor,
                args.input.commentText,
              ),
            catch: (cause) =>
              deps.createAiRequestError(
                cause instanceof Error
                  ? cause.message
                  : "Unknown AI request error",
              ),
          }),
          {
            times: 3,
            delayMs: 200,
          },
        ),
      ),
      Effect.map((result) => ({
        isEditingMistake: result.isEditingMistake,
        isSponsorMention: result.isSponsorMention,
        isQuestion: result.isQuestion,
        isPositiveComment: result.isPositiveComment,
      })),
    );

  return {
    extractSponsor,
    classifyComment,
  };
};
