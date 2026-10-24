-- Start a new Verble run while keeping accounts, display names, reminder settings,
-- and guest player IDs intact. Recreate phrase IDs so browsers cannot restore
-- completed games from the previous run's phrase-ID-based local storage keys.
begin;

create temporary table reset_original_phrases on commit drop as
select
  p.phrase_text,
  p.normalized_phrase,
  p.source_note,
  p.status,
  p.reviewed_at,
  p.created_at,
  min(s.puzzle_date) as first_scheduled_date
from verble.phrases p
left join verble.daily_schedule s on s.phrase_id = p.id
group by p.id;

delete from core.analytics_events;
delete from core.completions;
delete from core.game_results;
delete from core.players;
delete from verble.daily_schedule;
delete from verble.phrases;

with new_phrases (position, phrase_text) as (
  values
    (1, 'A penny saved is a penny earned'),
    (2, 'A picture is worth a thousand words'),
    (3, 'A rolling stone gathers no moss'),
    (4, 'Absence makes the heart grow fonder'),
    (5, 'All good things must come to an end'),
    (6, 'All roads lead to Rome'),
    (7, 'An apple a day keeps the doctor away'),
    (8, 'Any port in a storm'),
    (9, 'Beauty is only skin deep'),
    (10, 'Beggars cannot be choosers'),
    (11, 'Birds of a feather flock together'),
    (12, 'Blood is thicker than water'),
    (13, 'Do not bite the hand that feeds you'),
    (14, 'Do not count your chickens before they hatch'),
    (15, 'Do not judge a book by its cover'),
    (16, 'Easier said than done'),
    (17, 'Every cloud has a silver lining'),
    (18, 'Failing to plan is planning to fail'),
    (19, 'Fight fire with fire'),
    (20, 'First come, first served'),
    (21, 'Give credit where credit is due'),
    (22, 'Haste makes waste'),
    (23, 'He who hesitates is lost'),
    (24, 'If at first you do not succeed, try again'),
    (25, 'If it ain''t broke, don''t fix it'),
    (26, 'If the shoe fits, wear it'),
    (27, 'Laughter is the best medicine'),
    (28, 'Let sleeping dogs lie'),
    (29, 'Look before you leap'),
    (30, 'Make hay while the sun shines'),
    (31, 'Many hands make light work'),
    (32, 'No man is an island'),
    (33, 'No news is good news'),
    (34, 'Nothing ventured, nothing gained'),
    (35, 'Out of sight, out of mind'),
    (36, 'Practice makes perfect'),
    (37, 'Rome wasn''t built in a day'),
    (38, 'Still waters run deep'),
    (39, 'Strike while the iron is hot'),
    (40, 'The pen is mightier than the sword'),
    (41, 'The squeaky wheel gets the grease'),
    (42, 'Time and tide wait for no man'),
    (43, 'Too many cooks spoil the broth'),
    (44, 'Two heads are better than one'),
    (45, 'When life gives you lemons, make lemonade')
),
phrase_pool as (
  -- Unplayed existing phrases and the new batch come before previously played ones.
  select
    0 as group_number,
    row_number() over (order by reviewed_at nulls last, created_at, normalized_phrase) as phrase_order,
    phrase_text,
    normalized_phrase,
    source_note,
    status
  from reset_original_phrases
  where first_scheduled_date is null

  union all

  select
    1,
    position::bigint,
    phrase_text,
    btrim(regexp_replace(
      regexp_replace(replace(replace(lower(phrase_text), '''', ''), '-', ''), '[^a-z ]', ' ', 'g'),
      ' +', ' ', 'g'
    )),
    'Proverb',
    'approved'
  from new_phrases

  union all

  select
    2,
    row_number() over (order by first_scheduled_date, normalized_phrase),
    phrase_text,
    normalized_phrase,
    source_note,
    status
  from reset_original_phrases
  where first_scheduled_date is not null
),
deduplicated as (
  select
    *,
    row_number() over (partition by normalized_phrase order by group_number, phrase_order) as duplicate_rank
  from phrase_pool
)
insert into verble.phrases (phrase_text, normalized_phrase, source_note, status, reviewed_at)
select
  phrase_text,
  normalized_phrase,
  source_note,
  status,
  case when status = 'approved' then
    now() - interval '4 minutes'
      + row_number() over (order by group_number, phrase_order) * interval '1 second'
  else null end
from deduplicated
where duplicate_rank = 1;

-- Today's new run begins at #1. The first choice was not played in the old run.
insert into verble.daily_schedule (puzzle_date, phrase_id)
select (now() at time zone 'America/New_York')::date, id
from verble.phrases
order by case when normalized_phrase = 'once in a blue moon' then 0 else 1 end,
  reviewed_at
limit 1;

commit;
