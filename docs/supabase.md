# Updating Supabase Type Definitions

This document explains how to (re)generate TypeScript types for our Supabase database and where to place them in this repo.

## Purpose

Keep a local TypeScript representation of the Supabase schema so IDE/type-checking and code that depends on DB rows have correct types.

## Prerequisites

- Node.js and npm installed.
- `supabase` CLI available via `npx` or installed globally (`npm i -g supabase` or Homebrew).
- Your Supabase Project ID (store as secret in CI / env var locally).

## Command (run from project root)

Use `npx` to avoid requiring a global install:

POSIX (macOS / Linux / WSL):

```bash
SUPABASE_PROJECT_ID=<project-id> \
npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/Supabase.ts
```

Windows (PowerShell):

```powershell
$env:SUPABASE_PROJECT_ID='<your-project-id>'; npx supabase gen types typescript --project-id $env:SUPABASE_PROJECT_ID > src/types/Supabase.ts
```

Direct (hardcode project id):

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/Supabase.ts
```

### Options you may want

- `--schema public` — generate types only for a specific schema.
- `--no-helpers` — omit helper types if desired (check CLI help for available flags).

## Where to put the file

- We use: `src/types/Supabase.ts` (committed file). Keep it checked in so typings are consistent across environments.

## When to regenerate

- Schema migrations
- Adding/removing tables/columns
- Changing functions/views you rely on

Document the change in the PR and run the generation command locally to produce the update.

## Troubleshooting

- If `npx supabase` fails: install CLI (`npm i -D supabase`) or use Homebrew: `brew install supabase/tap/supabase`.
- If output is empty or incomplete: confirm `--project-id` is correct and you have network access to Supabase.
- Redirection `>` overwrites file — use `tee` to also view output:  
  `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID | tee src/types/Supabase.ts`
- For complex setups (multiple schemas), run per-schema and merge manually or generate for a specific schema via `--schema`.

## Notes

- The generated file usually contains a header comment. Keep that header if you want to track generation metadata.
- Commit generated types so editors and typecheckers are consistent across the team.
- For perfect parsing (e.g. functions, computed columns), review the generated output; sometimes manual adjustments or custom typings are required.
