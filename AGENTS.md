# Verble Agent Notes

## Product Direction

Verble is a standalone daily phrase game. It has no game hub and no other DailyDabble games.

- `/` is today's game.
- `/archive` lists past Verble puzzles.
- `/archive/[date]` plays an archived puzzle.
- `/account` and `/account/stats` provide account and Verble-only progress.
- Admin curation is Verble-only.

## Repository Shape

- `apps/web` contains the public product.
- `apps/admin` contains phrase curation and scheduling.
- `packages/ui` contains UI shared by those two apps.
- `supabase/migrations` is the only database migration path.

## DailyDabble Reference

The original implementation remains at the sibling path `../dailydabble` on the development machine. Treat it as read-only reference material. Do not add new Verble work there unless explicitly requested.

Before copying behavior, consult `docs/dailydabble-migration-map.md`. Port only Verble and generic account infrastructure; do not reintroduce multi-game configuration, trophy completion, or hub behavior.

## Working Rules

- Keep gameplay rules and server-side word validation aligned with the proven DailyDabble Verble flow.
- Preserve progress keys intentionally; changing them requires a migration decision.
- Keep public and admin deployments independent.
- Add database changes only through root `supabase/migrations`.
- Never commit environment files, Supabase secrets, or Vercel project state.

## Phrase meanings and attribution

Before drafting or importing phrase meanings or attributions, read docs/phrase-editorial-standards.md and use docs/production-phrase-meanings-review.md as the approved style reference. New production copy requires user review and approval before applying it.
