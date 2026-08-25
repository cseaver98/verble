# Verble

Standalone home for Verble, the daily phrase game.

## Apps

- `apps/web`: daily gameplay, archives, accounts, and stats
- `apps/admin`: phrase curation and scheduling

## Local development

1. Copy each app's `.env.example` to `.env.local` and add local Supabase credentials.
2. Install dependencies with `npm install`.
3. Run both apps with `npm run dev`.

The public app runs on `http://localhost:3200` and admin runs on `http://localhost:3201`.

To refresh the local word dictionary from DailyDabble production, run `npm run sync:dictionary` while local Supabase is running. This copies only Verble dictionary words.

## Source reference

This project was extracted from the Verble implementation in the sibling DailyDabble repository. See `docs/dailydabble-migration-map.md` before porting additional behavior.
