# Database Conventions

How to write migrations, policies and functions for JATS on Supabase Postgres. Table definitions live in `docs/architecture.md` section 3; access rules in `docs/security.md` section 3.

---

## 1. Naming and types

- Tables: `snake_case`, plural (`punches`, `shift_templates`). Columns: `snake_case`. Foreign keys: `<thing>_id`.
- Primary keys: `uuid` with `default gen_random_uuid()`, except `punches.id`, which the client generates as the idempotency key.
- Times: `timestamptz`, stored in UTC. Local times of day: `time`. Local dates: `date`.
- Enums: `user_role`, `punch_type`. Prefer a check constraint over a new enum for small, changing lists.
- Every table gets a comment (`comment on table ...`) saying what it holds and who may touch it.
- Money is not stored in this system.

---

## 2. Migrations

- Create with `supabase migration new <short_name>`. One concern per migration.
- **Never edit a migration after it is merged.** Fix forward with a new one.
- Migrations must run on an empty database (`supabase db reset`) and on `dev` without manual steps.
- No destructive changes (drop table, drop column, type change that rewrites data) without owner approval and a backup first.
- Apply to `prod` only by a human, after a fresh backup (`docs/runbooks/deploy.md`).
- After schema changes regenerate types: `supabase gen types typescript --local > lib/supabase/types.ts`.
- Include in the PR: the migration, the RLS policies for any new table, and SQL tests.

---

## 3. Row-level security patterns

Every table: enable RLS in the same migration that creates it.

```sql
alter table public.punches enable row level security;
```

Helper functions read the caller's role and branch. Use `security definer`, a fixed `search_path`, and `stable`. Do **not** name them `current_role`, which collides with a built-in.

```sql
create function public.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) and is_active $$;

create function public.app_branch_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select branch_id from public.profiles where id = (select auth.uid()) and is_active $$;
```

Policies: one per table, per action, per role family. Name them `<table>_<action>_<who>`.

```sql
create policy punches_select_own on public.punches
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy punches_select_branch_admin on public.punches
  for select to authenticated
  using (public.app_role() = 'admin' and branch_id = public.app_branch_id());

create policy punches_select_sysad on public.punches
  for select to authenticated
  using (public.app_role() = 'sysad');
```

Guidelines:

- Wrap `auth.uid()` as `(select auth.uid())` so Postgres evaluates it once per query.
- Policies target `authenticated` explicitly. No policy is written for `anon` on any table.
- Never write `using (true)`.
- Avoid policies on `profiles` that query `profiles` directly (infinite recursion); use the helper functions.
- `with check` clauses on insert and update must mirror `using`.

### Views

Views ignore RLS of the underlying tables unless told otherwise. Always:

```sql
create view public.attendance_days with (security_invoker = true) as ...
```

(`security_invoker` requires a recent Postgres, which current Supabase projects use; verify on your project.) Test the view as each persona.

---

## 4. Append-only `punches`

1. Remove default privileges, then grant only select:

```sql
revoke all on public.punches from anon, authenticated;
grant select on public.punches to authenticated;
```

2. Add a guard trigger that blocks deletes and allows only nulling `selfie_path` (needed by the photo purge):

```sql
create function public.punches_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'punches are append-only';
  end if;
  if (to_jsonb(new) - 'selfie_path') is distinct from (to_jsonb(old) - 'selfie_path')
     or new.selfie_path is not null then
    raise exception 'punches are append-only';
  end if;
  return new;
end $$;

create trigger punches_guard_trg
  before update or delete on public.punches
  for each row execute function public.punches_guard();
```

3. `audit_log` gets the same treatment, with no exceptions: revoke insert/update/delete from app roles, insert only from `SECURITY DEFINER` functions, and a trigger that blocks update and delete for everyone.

---

## 5. The `punch()` function

- `security definer`, `set search_path = ''`, fully qualified names inside.
- Signature takes only what the client can honestly claim: `punch_id`, `type`, `lat`, `lng`, `accuracy_m`, `selfie_path`, `note`, `device_hash`. **No profile id and no timestamp parameters**; it uses `auth.uid()` and `now()`.
- `grant execute ... to authenticated; revoke execute ... from anon, public;`
- Take `pg_advisory_xact_lock(hashtextextended(<profile id>::text, 0))` at the start.
- Inside the geofence means `distance_m <= radius_m`. Compute haversine with `double precision` and a documented earth radius (6371000 m).
- Errors: `raise exception` with a stable code in `message` (for example `OUTSIDE_GEOFENCE`) and map in the route. Do not put user data in error text.
- Order of checks: see `docs/architecture.md` section 4. Any change to this function needs human security review.

---

## 6. Storage policies

Bucket `selfies`: private. Object path: `{branch_id}/{yyyy-mm}/{profile_id}/{punch_id}.jpg`.

```sql
-- employees may upload only into their own folder
create policy selfies_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'selfies'
    and (storage.foldername(name))[3] = (select auth.uid())::text
  );

-- admins may read their own branch's photos; sysad reads all
create policy selfies_select_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'selfies'
    and (
      public.app_role() = 'sysad'
      or (public.app_role() = 'admin'
          and (storage.foldername(name))[1] = public.app_branch_id()::text)
    )
  );
```

No select policy for employees. Deletes happen only through the purge job. Add a size and type restriction on the bucket (JPEG only, about 100 KB cap).

---

## 7. Indexes and performance

Start with these and add only when a query needs it:

- `punches (profile_id, shift_date)`
- `punches (branch_id, punched_at desc)`
- `punches (punched_at) where selfie_path is not null` (purge query)
- `profiles (branch_id)` and unique `profiles (employee_code)`
- `shift_templates (branch_id)`

Volume is tiny (about 5,200 punches a month), so correctness beats tuning. Check `explain` on `attendance_days` for a 31-day, 100-employee period.

---

## 8. Seed data and tests

- `supabase/seed.sql`: 3 branches with distinct coordinates, about 10 fake employees, 3 shift templates per branch, one Admin per branch, one SysAd. Fake data only.
- pgTAP tests under `supabase/tests/`, one file per area: `rls_*.sql`, `punch_*.sql`, `attendance_*.sql`, `storage_*.sql`. Matrices: `docs/testing.md`.
- Each test file runs in a transaction and rolls back.

---

## 9. Review checklist for any migration PR

- [ ] RLS enabled and policies written for every new table
- [ ] No `using (true)`, no policy for `anon`
- [ ] Views use `security_invoker = true`
- [ ] Functions have a fixed `search_path`
- [ ] No grants beyond what the access table in `docs/security.md` allows
- [ ] Reversible or documented fix-forward plan
- [ ] Tests added; `supabase db reset` and `supabase test db` pass
- [ ] Marked **needs human security review**
