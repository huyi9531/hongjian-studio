# Contributing to RedInk

## Prerequisites

- Node.js 22.12 or newer
- pnpm 10

## Local Setup

```bash
git clone https://github.com/HisMax/RedInk.git
cd RedInk
pnpm install
cp .env.example .env.local
pnpm dev
```

The application runs at `http://localhost:5173`. Configure server-only credentials in `.env.local`; never commit that file or place secrets in browser code.

## Validation

Run the complete local verification set before opening a pull request:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Project Conventions

- Use the existing TanStack Start file routes and server functions.
- Keep secrets, SQLite access, filesystem access, and privileged SDKs behind server-only modules.
- Reuse existing React components and utilities before adding abstractions or dependencies.
- Preserve visible loading, error, disabled, and keyboard-focus states.
- Do not edit `src/routeTree.gen.ts` manually.

For bugs and feature requests, open a GitHub issue with reproduction steps, expected behavior, actual behavior, and relevant screenshots or logs.
