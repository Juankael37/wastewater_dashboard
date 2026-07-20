-- Enforce email confirmation before any write access to app data.
-- Supabase issues a JWT on signup even when the email is unconfirmed, so the
-- existing `auth.uid()` checks alone do not block unconfirmed users. This adds
-- an explicit `email_confirmed_at IS NOT NULL` guard to all write policies.

-- Helper: returns true only for confirmed, signed-in users.
create or replace function public.is_confirmed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
      and deleted_at is null
  )
$$;

-- profiles: own read/update only when confirmed
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id and public.is_confirmed())
  with check (auth.uid() = id and public.is_confirmed());

-- measurements: insert only by confirmed operators/admins
drop policy if exists "Operators can insert own measurements" on public.measurements;
create policy "Operators can insert own measurements"
  on public.measurements for insert
  with check (
    operator_id = auth.uid()
    and public.is_confirmed()
    and auth.uid() in (
      select id from public.profiles
      where role in ('operator','company_admin','super_admin')
    )
  );

-- alerts: tighten the overly-permissive insert (was WITH CHECK true)
drop policy if exists "Authenticated users can insert alerts" on public.alerts;
create policy "Confirmed users can insert alerts"
  on public.alerts for insert
  with check (public.is_confirmed());

-- parameters admin writes require confirmation
drop policy if exists "Admins can insert parameters" on public.parameters;
create policy "Admins can insert parameters"
  on public.parameters for insert
  with check (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

drop policy if exists "Admins can update parameters" on public.parameters;
create policy "Admins can update parameters"
  on public.parameters for update
  using (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ))
  with check (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

drop policy if exists "Admins can delete parameters" on public.parameters;
create policy "Admins can delete parameters"
  on public.parameters for delete
  using (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

-- standards admin writes require confirmation
drop policy if exists "Admins can insert standards" on public.standards;
create policy "Admins can insert standards"
  on public.standards for insert
  with check (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

drop policy if exists "Admins can update standards" on public.standards;
create policy "Admins can update standards"
  on public.standards for update
  using (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ))
  with check (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

drop policy if exists "Admins can delete standards" on public.standards;
create policy "Admins can delete standards"
  on public.standards for delete
  using (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

-- companies: confirm-read guard for company admins
drop policy if exists "Company admins can view their company" on public.companies;
create policy "Company admins can view their company"
  on public.companies for select
  using (auth.uid() in (
    select id from public.profiles
    where company_id = companies.id
      and role in ('company_admin','super_admin')
      and public.is_confirmed()
  ));

-- alerts update guard
drop policy if exists "Admins can update alerts" on public.alerts;
create policy "Admins can update alerts"
  on public.alerts for update
  using (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ))
  with check (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));

-- report_settings admin guard
drop policy if exists "Admins can manage report settings" on public.report_settings;
create policy "Admins can manage report settings"
  on public.report_settings for all
  using (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ))
  with check (public.is_confirmed() and auth.uid() in (
    select id from public.profiles where role in ('company_admin','super_admin')
  ));
