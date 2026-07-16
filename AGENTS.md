# Repository Guidelines

## Project Structure & Module Organization

This is a TanStack Start application. Route modules live in `src/routes/`; keep file-based route names aligned with their URLs. Shared React components are in `src/components/`, with reusable primitives under `src/components/ui/`. Server-only authentication, database, and integration code belongs in `src/server/`; Drizzle schema and connection files are under `src/server/db/`. Small shared utilities live in `src/lib/`, global styles in `src/styles/`, and static assets in `public/`. Design research in `themes/` is reference material, not runtime code. Do not edit generated `src/routeTree.gen.ts` manually.

## Build, Test, and Development Commands

- `npm install`: install the dependencies.
- `npm run dev`: run Vite locally at `http://localhost:5173`.
- `npm run test`: run all Vitest tests once.
- `npm run typecheck`: validate strict TypeScript without emitting files.
- `npm run build`: build client and server production bundles.
- `npm run start`: run the production server using `.env.local` when present.
- `npm run db:generate` / `npm run db:migrate`: generate and apply Drizzle migrations.

## Coding Style & Naming Conventions

Use TypeScript, React function components, two-space indentation, single quotes, and the existing semicolon-free style. Use `PascalCase` for components, `camelCase` for functions and variables, and descriptive kebab-case route filenames where applicable. Prefer the `@/` alias for imports from `src/`. Reuse existing UI primitives and utilities before introducing dependencies or abstractions. No formatter or linter is configured, so preserve nearby formatting and run `npm run typecheck`.

## Testing Guidelines

Vitest is the test runner. Place tests beside the module as `*.test.ts`, for example `src/lib/studio-preferences.test.ts`. Cover validation, persistence boundaries, prompt construction, and failure behavior when changing server services. There is no numeric coverage threshold; tests should match the risk of the change. Run tests, type checking, and a production build before review.

## Commit & Pull Request Guidelines

Recent commits use `[Agent] scope: concise summary`, such as `[Agent] 创作: 完善结果图片编辑与操作栏`. Keep commits atomic and avoid dependency or generated-file churn. Pull requests should explain behavior changes, link relevant issues, list verification commands, and include desktop/mobile screenshots for UI work.

## Security & Configuration

Copy `.env.example` to `.env.local`. Never commit credentials, databases, or generated images. Keep secrets, SQLite access, filesystem operations, and privileged API calls in server-only modules; validate network inputs with Zod.
