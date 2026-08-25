# DailyDabble to Verble Migration Map

## Purpose

This document keeps the useful context from DailyDabble while Verble becomes an independent product. DailyDabble remains live and must not be modified as part of standalone Verble work.

## Source repository

Local reference: `../dailydabble`

Baseline source commit: `e0c5568` (`Refocus DailyDabble around Verble`)

## Public product mapping

| Standalone Verble | DailyDabble source |
| --- | --- |
| `/` | `apps/web/app/verble/page.tsx` |
| `/archive` | `apps/web/app/verble/archive/page.tsx` |
| `/archive/[date]` | `apps/web/app/verble/archive/[date]/page.tsx` |
| Gameplay client | `apps/web/app/verble/components/VerbleGameClient.tsx` |
| Gameplay styles | `apps/web/app/verble/verble.css` |
| Puzzle repository | `apps/web/lib/verble/` |
| Puzzle APIs | `apps/web/app/api/verble/puzzle/` |
| Account and completion flows | `apps/web/app/account`, `apps/web/app/api/completions`, and generic `apps/web/lib/account-*` |

## Admin mapping

| Standalone Verble | DailyDabble source |
| --- | --- |
| `/admin` | `apps/admin/app/admin/verble/page.js` |
| Admin API | `apps/admin/app/api/admin/verble/route.ts` |
| Queue health | `apps/admin/app/admin/components/queue-health-panel.js` |
| Admin authentication | `apps/admin/src/lib/admin-auth.ts` and `google-oauth.ts` |

## Intentional changes

- The homepage is the game, not a hub.
- Archive URLs omit the `/verble` prefix.
- Navigation and metadata use the Verble brand.
- Stats and completion status recognize only the `verble` slug.
- Admin contains no tabs for other games.
- No seven-game trophies or cross-game completion logic is carried over.

## Data strategy

Development should use a new Supabase project with a clean Verble and core schema baseline. DailyDabble production data should not be shared indefinitely. Before launch, decide whether to import:

- approved and historical phrases
- daily schedule history
- user accounts
- Verble completion and result history

User migration requires a deliberate auth and privacy plan. Phrase and schedule migration can be handled independently.
