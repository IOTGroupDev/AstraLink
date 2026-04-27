begin;

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.charts enable row level security;

drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Service role full access" on public.users;

create policy "users: owner can read own"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "users: owner can update own"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users: service role full access"
on public.users
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;

create policy "user_profiles: owner can read own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_profiles: owner can insert own"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_profiles: owner can update own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_profiles: service role full access"
on public.user_profiles
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can view own charts" on public.charts;
drop policy if exists "Users can create own charts" on public.charts;
drop policy if exists "Users can update own charts" on public.charts;

create policy "charts: owner can read own"
on public.charts
for select
to authenticated
using (auth.uid() = user_id);

create policy "charts: owner can insert own"
on public.charts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "charts: owner can update own"
on public.charts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "charts: service role full access"
on public.charts
for all
to service_role
using (true)
with check (true);

commit;
