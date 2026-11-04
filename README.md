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
