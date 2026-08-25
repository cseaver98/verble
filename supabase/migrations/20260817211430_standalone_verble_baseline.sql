-- Standalone Verble database baseline.
-- Game answers and player activity are accessed only by trusted server routes.

create extension if not exists pgcrypto;
create schema if not exists core;
create schema if not exists verble;

create table core.players (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_guest boolean not null default true,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

create table core.completions (
  id bigint generated always as identity primary key,
  player_id uuid not null references core.players(id) on delete cascade,
  game_slug text not null check (game_slug = 'verble'),
  puzzle_date date not null,
  completed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (player_id, game_slug, puzzle_date)
);

create index completions_player_date_idx on core.completions (player_id, puzzle_date);
create index players_claimed_by_idx on core.players (claimed_by) where claimed_by is not null;

create table core.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text,
  marketing_email_opt_in boolean not null default false,
  daily_reminder_opt_in boolean not null default false,
  daily_reminder_opted_in_at timestamptz,
  daily_reminder_prompted_at timestamptz,
  daily_reminder_last_sent_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table core.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  player_id uuid references core.players(id) on delete cascade,
  game_slug text not null check (game_slug = 'verble'),
  puzzle_id text not null,
  puzzle_date date not null,
  is_archive boolean not null default false,
  is_win boolean not null,
  guesses_used integer not null check (guesses_used >= 0),
  max_guesses integer not null check (max_guesses > 0),
  completed_at timestamptz not null default now(),
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_results_has_owner check (user_id is not null or player_id is not null)
);

create unique index game_results_user_game_date_uidx
  on core.game_results (user_id, game_slug, puzzle_date) where user_id is not null;
create unique index game_results_player_game_date_uidx
  on core.game_results (player_id, game_slug, puzzle_date) where player_id is not null;
create index game_results_user_date_idx on core.game_results (user_id, puzzle_date) where user_id is not null;
create index game_results_player_date_idx on core.game_results (player_id, puzzle_date) where player_id is not null;
create index game_results_game_date_idx on core.game_results (game_slug, puzzle_date);

create table core.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'canceled', 'expired')),
  tier text not null default 'plus' check (tier = 'plus'),
  source text,
  started_at timestamptz,
  ends_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on core.subscriptions (status);

create table core.analytics_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  event_name text not null check (event_name in (
    'homepage_viewed', 'game_opened', 'game_started', 'game_completed',
    'next_game_clicked', 'result_shared', 'account_wall_shown',
    'signup_started', 'signup_completed', 'reminder_prompt_shown', 'reminder_enabled'
  )),
  player_id uuid references core.players(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid not null,
  game_slug text check (game_slug is null or game_slug = 'verble'),
  puzzle_date date,
  is_archive boolean not null default false,
  page_path text not null,
  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text not null check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index analytics_events_created_at_idx on core.analytics_events (created_at desc);
create index analytics_events_name_created_at_idx on core.analytics_events (event_name, created_at desc);
create index analytics_events_player_created_at_idx on core.analytics_events (player_id, created_at desc) where player_id is not null;
create index analytics_events_user_created_at_idx on core.analytics_events (user_id, created_at desc) where user_id is not null;
create index analytics_events_session_created_at_idx on core.analytics_events (session_id, created_at desc);
create index analytics_events_game_created_at_idx on core.analytics_events (game_slug, created_at desc) where game_slug is not null;

create table verble.phrases (
  id uuid primary key default gen_random_uuid(),
  phrase_text text not null,
  normalized_phrase text not null unique,
  source_note text,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table verble.daily_schedule (
  puzzle_date date primary key,
  phrase_id uuid not null references verble.phrases(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table verble.dictionary_words (
  word text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index verble_phrases_created_at_idx on verble.phrases (created_at desc);
create index verble_phrases_status_idx on verble.phrases (status);
create index verble_daily_schedule_phrase_id_idx on verble.daily_schedule (phrase_id);
create index verble_dictionary_words_active_idx on verble.dictionary_words (is_active);

create or replace function core.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on core.profiles
for each row execute function core.touch_updated_at();
create trigger game_results_touch_updated_at before update on core.game_results
for each row execute function core.touch_updated_at();
create trigger subscriptions_touch_updated_at before update on core.subscriptions
for each row execute function core.touch_updated_at();
create trigger phrases_touch_updated_at before update on verble.phrases
for each row execute function core.touch_updated_at();

alter table core.players enable row level security;
alter table core.completions enable row level security;
alter table core.profiles enable row level security;
alter table core.game_results enable row level security;
alter table core.subscriptions enable row level security;
alter table core.analytics_events enable row level security;
alter table verble.phrases enable row level security;
alter table verble.daily_schedule enable row level security;
alter table verble.dictionary_words enable row level security;

create policy "profiles are readable by owner" on core.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles are writable by owner" on core.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "game results are readable by owner" on core.game_results
  for select to authenticated using (auth.uid() = user_id);
create policy "subscriptions are readable by owner" on core.subscriptions
  for select to authenticated using (auth.uid() = user_id);

revoke all on all tables in schema core from anon, authenticated;
revoke all on all tables in schema verble from anon, authenticated;
grant usage on schema core, verble to authenticated, service_role;
grant select, insert, update, delete on core.profiles to authenticated;
grant select on core.game_results, core.subscriptions to authenticated;
grant all privileges on all tables in schema core to service_role;
grant all privileges on all sequences in schema core to service_role;
grant all privileges on all tables in schema verble to service_role;
grant all privileges on all sequences in schema verble to service_role;

alter role authenticator set pgrst.db_schemas = 'public,storage,graphql_public,core,verble';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

insert into verble.phrases (phrase_text, normalized_phrase, source_note, status, reviewed_at)
values ('Actions speak louder than words.', 'actions speak louder than words', 'Proverb', 'approved', now())
on conflict (normalized_phrase) do nothing;

insert into verble.dictionary_words (word)
select word from unnest(array[
  'actions', 'speak', 'louder', 'than', 'words', 'and', 'to', 'of', 'for', 'with',
  'from', 'you', 'your', 'this', 'that', 'never', 'always', 'better', 'best', 'good',
  'great', 'today', 'tomorrow', 'dream', 'build', 'learn', 'focus', 'trust', 'work',
  'hard', 'smart', 'think', 'quick', 'slow', 'grow', 'shine'
]) as word
on conflict (word) do nothing;
