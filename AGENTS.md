## General

- Use functional programming patterns. Prefer pure functions, immutable data, and composition over classes and mutation.
- Use `better-result` for error handling. Never throw exceptions for expected/recoverable errors — return `Result` types instead.
- Avoid explicit return types unless absolutely needed (e.g., overloads, complex inference failures, or public API contracts that TypeScript can't infer correctly). Let TypeScript infer.

## Services Architecture

- Organize code by domain service (`src/services/<domain>/...`), not by technical layer-only folders.
- Each domain exposes a single namespace as its public API (`<Domain>Service`) and keeps helpers private to the module.
- Prefer one `index.ts` per service folder that re-exports only stable public members.
- Keep service functions small and composable; pass dependencies explicitly as function args (`deps`) instead of using classes or hidden singletons.
- Keep side effects at boundaries (db/http/fs). Core domain logic should stay pure and deterministic.

### better-result + namespaces pattern

- Model service operations as namespace functions that return `Result`.
- Use typed `TaggedError` classes for recoverable failures and keep error types local to the service.
- Wrap effectful boundaries with `Result.try` / `Result.tryPromise`, then compose with `map`, `andThen`, `mapErr`, and `match`.
- Never throw for expected control flow; only unrecoverable programmer defects may throw.
- Service-to-service calls should propagate `Result` instead of unwrapping early.

```ts
export namespace UserService {
  export class UserNotFoundError extends TaggedError("UserNotFoundError")<{
    userId: string;
    message: string;
  }>() {}

  export const getById = (deps: Deps, userId: string) =>
    Result.tryPromise(
      () => deps.userRepo.findById(userId),
      () => new UserNotFoundError({ userId, message: `User ${userId} not found` }),
    ).andThen((user) =>
      user ? Result.ok(user) : Result.err(new UserNotFoundError({ userId, message: `User ${userId} not found` })),
    );
}
```

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```
