alter table public.users
  add column if not exists birth_date_encrypted text,
  add column if not exists birth_time_encrypted text,
  add column if not exists birth_place_encrypted text;
