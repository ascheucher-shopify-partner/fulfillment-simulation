# Repository Guidelines

## Project Structure & Module Organization
The core Remix-style app lives in `app/`, with request handlers in `app/routes/`, shared UI in `app/root.tsx`, and Shopify helpers in `app/shopify.server.ts`. Generated Admin API assets sit in `app/types/` (`admin.types.d.ts`, `admin.generated.d.ts`) and should be imported instead of hand-written GraphQL types. Database schema and migrations reside under `prisma/`, while UI or checkout extensions belong in `extensions/`. Public assets are served from `public/`.

## Build, Test, and Development Commands
- `pnpm dev`: Runs `shopify app dev`, launching the local server, tunneling, and hot reload.
- `pnpm build`: Produces a production bundle via `react-router build`.
- `pnpm start`: Serves the built app with `react-router-serve ./build/server/index.js`.
- `pnpm setup`: Executes `prisma generate` and `prisma migrate deploy` to sync the database.
- `pnpm graphql-codegen`: Regenerates Admin API TypeScript definitions; run after schema or scope changes.
- `pnpm lint` / `pnpm typecheck`: Lint and type validation gates before committing.

## Coding Style & Naming Conventions
Use TypeScript throughout with 2-space indentation and trailing commas where Prettier 3 would place them. React components and Remix routes should be PascalCase (`OrderDetailsRoute`), while hooks, utilities, and files default to camelCase (`useFulfillmentOrders`). Respect ESLint’s configured rules (`eslint --cache`) and prefer the generated GraphQL operations from `app/types/`. Keep file names descriptive but concise, mirroring Shopify naming (`fulfillmentService.ts`).

## Testing Guidelines
Automated tests are not yet scaffolded; introduce them alongside new features. Co-locate unit tests in `app/routes/__tests__/` or similar, and favor Vitest or Jest for React logic. Always run `pnpm typecheck` and `pnpm lint` before submitting a PR, and document any manual verification steps (Shopify Admin flows, webhook simulations). Add Prisma migration tests when altering schema (`prisma migrate dev`).

## Commit & Pull Request Guidelines
Write imperative commit subjects ("Add fulfillment request handler") with optional scope tags, reflecting the style of the existing history. Each commit should bundle logically related changes only. Pull requests must include: a concise summary of changes, linked issue or ticket references, screenshots or terminal output for UI/API changes, and a checklist of verification steps (`pnpm dev`, `pnpm lint`, `pnpm typecheck`, migrations). Mention any new environment variables, webhook topics, or access scopes that reviewers must configure.

## Security & Configuration Tips
Do not commit `.env`, `.shopify-cli.yml`, or Prisma secrets. When adjusting scopes in `shopify.app.toml`, coordinate with `pnpm graphql-codegen` to keep generated types current. Ensure webhook endpoints and the Prisma database are reachable from your dev tunnel before pushing changes.

## Agent Operating Rules
Follow these guardrails when automating tasks:
- **Shell commands:** Call tools through `"bash", "-lc"` with `workdir` set; prefer `rg`/`rg --files`; avoid inline `cd` unless required.
- **Edits:** Keep files ASCII unless existing content differs; use `apply_patch` for targeted changes; add only essential clarifying comments; never undo user edits or run destructive git commands without direction.
- **Planning:** Skip plans for trivial work, avoid single-step plans, and update plan status after each completed subtask.
- **Sandbox & approvals:** Current mode is `workspace-write` filesystem, `restricted` network, approvals `on-request`. Request escalation with `with_escalated_permissions: true` plus a one-line justification whenever sandbox limits block critical work.
- **Scope:** Limit code changes to the `app/` and `extensions/` directories unless explicitly instructed otherwise.
- **Communication:** For reviews, lead with findings and references; keep responses concise and structured; cite files as `path:line`; rely on generated Admin API types from `pnpm run graphql-codegen`; confirm assumptions when unsure.
