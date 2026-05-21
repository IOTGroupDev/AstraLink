create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_constraint text;
  v_email text;
begin
  v_email := lower(nullif(trim(new.email), ''));

  -- Custom OAuth providers can create auth.users rows before Supabase has a
  -- normalized email on auth.users. Do not abort the auth transaction here;
  -- the backend /auth/ensure-profile endpoint creates public.users after the
  -- client resolves the provider email.
  if v_email is null then
    return new;
  end if;

  begin
    insert into public.users (id, email, created_at, updated_at)
    values (new.id, v_email, now(), now())
    on conflict (id) do update
      set email = excluded.email,
          updated_at = now();
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;

      -- If we already have a row with this email, don't abort auth.users insert.
      -- The backend will decide whether the email row is stale or belongs to an
      -- active auth user in /auth/ensure-profile.
      if v_constraint = 'users_email_key' then
        update public.users
          set updated_at = now()
          where email = v_email;
      else
        raise;
      end if;
  end;

  return new;
end;
$$;
