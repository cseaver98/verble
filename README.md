# Verble

A daily phrase-solving game. Solve a phrase one word at a time in six guesses, then return for a new challenge each day.

[Play Verble](https://verble.fun)

## Features

- Daily puzzles and a playable puzzle archive
- Accounts, saved results, and personal statistics
- Server-side word validation
- A separate admin app for phrase curation and scheduling

## Built with

Next.js, React, TypeScript, and Supabase. The public game and admin app share a small UI package.

Verble grew out of the phrase game in my DailyDabble project and evolved into a standalone product with its own branding, navigation, and gameplay interface.

## Local development

1. Copy each app's `.env.example` to `.env.local` and configure your own Supabase and integration credentials.
2. Run `npm install` from the repository root.
3. Run `npm run dev`.

The public app runs at `http://localhost:3200`; the admin app runs at `http://localhost:3201`. Database migrations are in `supabase/migrations`.

The optional `npm run sync:dictionary` command requires access to a configured source database. It is not required just to inspect the code.

### Local Supabase

Install and start Docker Desktop, then run from the repository root:

```sh
npm ci
npx supabase start
npx supabase status
```

The Supabase CLI is pinned as a development dependency. Initial startup downloads
service images and applies the migrations in `supabase/migrations` to a fresh
local database. This does not connect to the hosted production project.

Copy each app's `.env.example` to `.env.local`. In both files, set
`NEXT_PUBLIC_SUPABASE_URL` to `http://127.0.0.1:54421`, use the local publishable
(or anon) key for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the local secret
(or service_role) key for `SUPABASE_SECRET_KEY`, as reported by `supabase status`.
Keep `NEXT_PUBLIC_APP_ENV=local` and the web app URL at `http://localhost:3200`.
Never commit these environment files.

Run `npm run dev` for the game on port 3200 and admin on port 3201.
Supabase Studio runs on `http://127.0.0.1:54423`; local auth emails appear at
`http://127.0.0.1:54424`. Admin authentication is bypassed in development.
The baseline dictionary is small; the optional dictionary sync is separate and
requires explicitly configured source credentials.

Use `npx supabase stop` when finished; normal stop/start preserves local data.
