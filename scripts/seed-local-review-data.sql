-- Local review fixture only. Run against the local Supabase database with:
-- psql 'postgresql://postgres:postgres@127.0.0.1:54422/postgres' \
--   -v ON_ERROR_STOP=1 -v fixture_email='your-local-login@example.com' \
--   -v fixture_player_id='your-local-guest-player-uuid' \
--   -f scripts/seed-local-review-data.sql
-- This is intentionally outside supabase/migrations and never runs on deployment.

begin;

create temp table fixture_owner on commit drop as
select id from auth.users where lower(email) = lower(:'fixture_email');

create temp table fixture_guest on commit drop as
select id from core.players
where id = :'fixture_player_id'::uuid and is_guest and claimed_by is null;

do $$
begin
  if (select count(*) from fixture_owner) <> 1 then
    raise exception 'Expected exactly one local auth user for fixture_email';
  end if;
  if (select count(*) from fixture_guest) <> 1 then
    raise exception 'Expected exactly one unclaimed local guest for fixture_player_id';
  end if;
end $$;

create temp table fixture_phrases (
  puzzle_date date primary key,
  phrase_text text not null
) on commit drop;

insert into fixture_phrases values
  ('2026-09-01', 'The early bird catches the worm'),
  ('2026-09-02', 'Better late than never'),
  ('2026-09-03', 'Every cloud has a silver lining'),
  ('2026-09-04', 'A picture is worth a thousand words'),
  ('2026-09-05', 'When it rains it pours'),
  ('2026-09-06', 'The ball is in your court'),
  ('2026-09-07', 'Practice makes perfect'),
  ('2026-09-08', 'Break the ice'),
  ('2026-09-09', 'Under the weather'),
  ('2026-09-10', 'On the same page'),
  ('2026-09-11', 'A blessing in disguise'),
  ('2026-09-12', 'Bite the bullet'),
  ('2026-09-13', 'Burn the midnight oil'),
  ('2026-09-14', 'Hit the ground running'),
  ('2026-09-15', 'The best of both worlds'),
  ('2026-09-16', 'No pain no gain'),
  ('2026-09-17', 'Time flies when having fun'),
  ('2026-09-18', 'Keep your eyes on the prize'),
  ('2026-09-19', 'Actions have consequences'),
  ('2026-09-20', 'The calm before the storm'),
  ('2026-09-21', 'A penny for your thoughts'),
  ('2026-09-22', 'The last straw'),
  ('2026-09-23', 'Once in a blue moon'),
  ('2026-09-24', 'The tip of the iceberg'),
  ('2026-09-25', 'Out of the frying pan'),
  ('2026-09-26', 'The writing is on the wall'),
  ('2026-09-27', 'Take it with a grain of salt'),
  ('2026-09-28', 'All in a day''s work'),
  ('2026-09-29', 'A journey of a thousand miles'),
  ('2026-09-30', 'Where there''s a will there''s a way');

insert into verble.phrases (phrase_text, normalized_phrase, source_note, status, reviewed_at)
select f.phrase_text,
       regexp_replace(lower(f.phrase_text), '[^a-z0-9 ]', '', 'g'),
       'Local review fixture: September 2026',
       'approved',
       now()
from fixture_phrases f
on conflict (normalized_phrase) do nothing;

insert into verble.daily_schedule (puzzle_date, phrase_id)
select f.puzzle_date, p.id
from fixture_phrases f
join verble.phrases p
  on p.normalized_phrase = regexp_replace(lower(f.phrase_text), '[^a-z0-9 ]', '', 'g')
on conflict (puzzle_date) do nothing;

create temp table fixture_results (
  puzzle_date date primary key,
  is_win boolean not null,
  guesses_used integer not null,
  solve_duration_seconds integer not null,
  is_archive boolean not null default false
) on commit drop;

-- Eight dates remain unplayed. Wins use every attempt count from one to six.
insert into fixture_results values
  ('2026-09-03', true, 2, 230, false),
  ('2026-09-04', true, 3, 310, false),
  ('2026-09-05', false, 6, 620, false),
  ('2026-09-06', true, 4, 480, false),
  ('2026-09-08', true, 5, 700, true),
  ('2026-09-09', true, 2, 260, false),
  ('2026-09-10', true, 1, 170, false),
  ('2026-09-11', true, 6, 800, false),
  ('2026-09-13', false, 6, 540, false),
  ('2026-09-14', true, 3, 305, false),
  ('2026-09-15', true, 4, 395, false),
  ('2026-09-16', true, 1, 190, false),
  ('2026-09-18', true, 2, 280, false),
  ('2026-09-19', true, 5, 620, true),
  ('2026-09-20', false, 6, 710, false),
  ('2026-09-22', true, 3, 355, false),
  ('2026-09-23', true, 2, 240, false),
  ('2026-09-24', true, 4, 550, true),
  ('2026-09-26', true, 5, 620, false),
  ('2026-09-27', false, 6, 700, false),
  ('2026-09-28', true, 1, 165, false),
  ('2026-09-30', true, 3, 345, false);

insert into core.game_results (
  user_id, game_slug, puzzle_id, puzzle_date, is_archive, is_win,
  guesses_used, max_guesses, completed_at, solve_duration_seconds, result_payload
)
select o.id, 'verble', s.phrase_id::text, r.puzzle_date, r.is_archive, r.is_win,
       r.guesses_used, 6, (r.puzzle_date::timestamp + time '20:00') at time zone 'UTC',
       r.solve_duration_seconds, jsonb_build_object('localFixture', 'september-2026-review')
from fixture_results r
join verble.daily_schedule s on s.puzzle_date = r.puzzle_date
cross join fixture_owner o
on conflict do nothing;

insert into core.game_results (
  player_id, game_slug, puzzle_id, puzzle_date, is_archive, is_win,
  guesses_used, max_guesses, completed_at, solve_duration_seconds, result_payload
)
select g.id, 'verble', s.phrase_id::text, r.puzzle_date, r.is_archive, r.is_win,
       r.guesses_used, 6, (r.puzzle_date::timestamp + time '20:00') at time zone 'UTC',
       r.solve_duration_seconds, jsonb_build_object('localFixture', 'september-2026-review')
from fixture_results r
join verble.daily_schedule s on s.puzzle_date = r.puzzle_date
cross join fixture_guest g
on conflict do nothing;

-- Five local guest results make the September 30 standing and cohort visible.
create temp table fixture_peers (
  player_id uuid primary key,
  guesses_used integer not null,
  solve_duration_seconds integer not null
) on commit drop;

insert into fixture_peers values
  ('edcb091e-0000-4000-8000-000000000001', 1, 410),
  ('edcb091e-0000-4000-8000-000000000002', 2, 520),
  ('edcb091e-0000-4000-8000-000000000003', 3, 390),
  ('edcb091e-0000-4000-8000-000000000004', 4, 280),
  ('edcb091e-0000-4000-8000-000000000005', 5, 180);

insert into core.players (id)
select player_id from fixture_peers
on conflict (id) do nothing;

insert into core.game_results (
  player_id, game_slug, puzzle_id, puzzle_date, is_archive, is_win,
  guesses_used, max_guesses, completed_at, solve_duration_seconds, result_payload
)
select p.player_id, 'verble', s.phrase_id::text, s.puzzle_date, false, true,
       p.guesses_used, 6, '2026-09-30 21:00:00+00', p.solve_duration_seconds,
       jsonb_build_object('localFixture', 'september-2026-review-peer')
from fixture_peers p
join verble.daily_schedule s on s.puzzle_date = '2026-09-30'
on conflict do nothing;

commit;
