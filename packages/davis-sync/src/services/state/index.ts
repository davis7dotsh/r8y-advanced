import { Result, TaggedError } from "better-result";
import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../db/client";
import { crawlerState } from "../../db/schema";

type Logger = Pick<Console, "info" | "warn" | "error">;

const logInfo = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.info?.(`[state] ${step}`, details ?? {});
};

const logWarn = (
  logger: Logger | undefined,
  step: string,
  details?: Record<string, unknown>,
) => {
  logger?.warn?.(`[state] ${step}`, details ?? {});
};

const parseMetaJson = (metaJson: string | null) => {
  if (!metaJson) {
    return {} as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(metaJson);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {} as Record<string, unknown>;
  }
};

export namespace StateService {
  export class StateStorageError extends TaggedError("StateStorageError")<{
    stateKey: string;
    message: string;
  }>() {}

  export const getState = async (
    deps: { db?: typeof defaultDb; logger?: Logger },
    stateKey: string,
  ) => {
    const db = deps.db ?? defaultDb;
    logInfo(deps.logger, "getState:start", { stateKey });

    const result = await Result.tryPromise(
      {
        try: () =>
          db.query.crawlerState.findFirst({
            where: eq(crawlerState.stateKey, stateKey),
          }),
        catch: (cause) =>
          new StateStorageError({
            stateKey,
            message:
              cause instanceof Error ? cause.message : "Failed to read crawler state",
          }),
      },
    );

    if (result.status === "error") {
      logWarn(deps.logger, "getState:failed", {
        stateKey,
        error: result.error.message,
      });
      return result;
    }

    if (!result.value) {
      logInfo(deps.logger, "getState:empty", { stateKey });
      return Result.ok(null);
    }

    const row = result.value as {
      cursor: string | null;
      metaJson: string | null;
      updatedAt: Date;
    };

    const resolved = {
      stateKey,
      cursor: row.cursor,
      meta: parseMetaJson(row.metaJson),
      updatedAt: row.updatedAt,
    };
    logInfo(deps.logger, "getState:success", {
      stateKey,
      cursor: resolved.cursor,
    });
    return Result.ok(resolved);
  };

  export const setState = async (
    deps: { db?: typeof defaultDb; logger?: Logger },
    input: {
      stateKey: string;
      cursor: string | null;
      meta?: Record<string, unknown>;
    },
  ) => {
    const db = deps.db ?? defaultDb;
    const metaJson = JSON.stringify(input.meta ?? {});
    logInfo(deps.logger, "setState:start", {
      stateKey: input.stateKey,
      cursor: input.cursor,
    });

    const result = await Result.tryPromise(
      {
        try: () =>
          db
            .insert(crawlerState)
            .values({
              stateKey: input.stateKey,
              cursor: input.cursor,
              metaJson,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: crawlerState.stateKey,
              set: {
                cursor: input.cursor,
                metaJson,
                updatedAt: new Date(),
              },
            }),
        catch: (cause) =>
          new StateStorageError({
            stateKey: input.stateKey,
            message:
              cause instanceof Error ? cause.message : "Failed to write crawler state",
          }),
      },
    );

    if (result.status === "error") {
      logWarn(deps.logger, "setState:failed", {
        stateKey: input.stateKey,
        error: result.error.message,
      });
      return result;
    }

    logInfo(deps.logger, "setState:success", {
      stateKey: input.stateKey,
      cursor: input.cursor,
    });
    return Result.ok(input);
  };
}
