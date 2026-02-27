import { expect, test } from "bun:test";
import { Effect } from "effect";
import { AiEnrichmentService } from "./index";

const createClient = (overrides?: {
  sponsor?: {
    sponsorName: string;
    sponsorKey: string;
  };
  comment?: {
    isEditingMistake: boolean;
    isSponsorMention: boolean;
    isQuestion: boolean;
    isPositiveComment: boolean;
  };
  throwSponsor?: boolean;
  throwComment?: boolean;
}) => ({
  GetSponsor: async () => {
    if (overrides?.throwSponsor) {
      throw new Error("sponsor failed");
    }

    return (
      overrides?.sponsor ?? {
        sponsorName: "convex",
        sponsorKey: "https://soydev.link/convex",
      }
    );
  },
  ParseComment: async () => {
    if (overrides?.throwComment) {
      throw new Error("comment failed");
    }

    return (
      overrides?.comment ?? {
        isEditingMistake: false,
        isSponsorMention: false,
        isQuestion: false,
        isPositiveComment: true,
      }
    );
  },
});

const settle = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.match({
      onFailure: (error) => ({ status: "error" as const, error }),
      onSuccess: (value) => ({ status: "ok" as const, value }),
    }),
    Effect.runPromise,
  );

test("extractSponsor normalizes sponsor values and marks as sponsor", async () => {
  const result = await settle(
    AiEnrichmentService.extractSponsor({
      client: createClient({
        sponsor: {
          sponsorName: "  ConVex  ",
          sponsorKey: "  HTTPS://SOYDEV.LINK/CONVEX  ",
        },
      }),
      input: {
        videoTitle: "Title",
        videoDescription: "Desc",
        sponsorPrompt: "Prompt",
      },
    }),
  );

  expect(result.status).toBe("ok");

  if (result.status === "ok") {
    expect(result.value.hasSponsor).toBe(true);
    expect(result.value.sponsorName).toBe("convex");
    expect(result.value.sponsorKey).toBe("https://soydev.link/convex");
  }
});

test("extractSponsor maps no sponsor fallback", async () => {
  const result = await settle(
    AiEnrichmentService.extractSponsor({
      client: createClient({
        sponsor: {
          sponsorName: "no sponsor",
          sponsorKey: "https://t3.gg",
        },
      }),
      input: {
        videoTitle: "Title",
        videoDescription: "Desc",
        sponsorPrompt: "Prompt",
      },
    }),
  );

  expect(result.status).toBe("ok");

  if (result.status === "ok") {
    expect(result.value).toEqual({
      hasSponsor: false,
      sponsorName: "no sponsor",
      sponsorKey: "https://davis7.link",
    });
  }
});

test("classifyComment returns parsed comment booleans", async () => {
  const result = await settle(
    AiEnrichmentService.classifyComment({
      client: createClient({
        comment: {
          isEditingMistake: true,
          isSponsorMention: true,
          isQuestion: false,
          isPositiveComment: true,
        },
      }),
      input: {
        videoTitle: "Title",
        videoDescription: "Desc",
        commentText: "Thanks sponsor, but timestamp is wrong",
        commentAuthor: "dev",
      },
    }),
  );

  expect(result.status).toBe("ok");

  if (result.status === "ok") {
    expect(result.value).toEqual({
      isEditingMistake: true,
      isSponsorMention: true,
      isQuestion: false,
      isPositiveComment: true,
    });
  }
});

test("classifyComment maps baml failure to AiRequestError", async () => {
  const result = await settle(
    AiEnrichmentService.classifyComment({
      client: createClient({ throwComment: true }),
      input: {
        videoTitle: "Title",
        videoDescription: "Desc",
        commentText: "hi",
        commentAuthor: "dev",
      },
    }),
  );

  expect(result.status).toBe("error");

  if (result.status === "error") {
    expect(result.error._tag).toBe("AiRequestError");
  }
});

test("extractSponsor returns MissingOpencodeApiKeyError without client or env key", async () => {
  const previousKey = process.env.OPENCODE_API_KEY;
  delete process.env.OPENCODE_API_KEY;

  try {
    const result = await settle(
      AiEnrichmentService.extractSponsor({
        input: {
          videoTitle: "Title",
          videoDescription: "Desc",
          sponsorPrompt: "Prompt",
        },
      }),
    );

    expect(result.status).toBe("error");

    if (result.status === "error") {
      expect(result.error._tag).toBe("MissingOpencodeApiKeyError");
    }
  } finally {
    if (previousKey !== undefined) {
      process.env.OPENCODE_API_KEY = previousKey;
    }
  }
});
