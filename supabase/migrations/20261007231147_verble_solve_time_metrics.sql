-- Timed results begin with this release. Existing results remain untimed.
alter table core.game_results
  add column solve_duration_seconds integer
  check (solve_duration_seconds between 1 and 86400);

create index game_results_daily_ranking_idx
  on core.game_results (puzzle_id, guesses_used, solve_duration_seconds)
  where game_slug = 'verble' and not is_archive and is_win;
