-- A puzzle may have one official daily result and one first archive result.
-- Later archive replays are practice and do not replace either record.
drop index if exists core.game_results_user_game_date_uidx;
drop index if exists core.game_results_player_game_date_uidx;

create unique index game_results_user_game_date_uidx
  on core.game_results (user_id, game_slug, puzzle_date, is_archive)
  where user_id is not null;

create unique index game_results_player_game_date_uidx
  on core.game_results (player_id, game_slug, puzzle_date, is_archive)
  where player_id is not null;
