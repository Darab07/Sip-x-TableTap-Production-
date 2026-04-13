-- ==========================================
-- TABLETAP OUTLET ORDERING SETTINGS
-- ==========================================
-- Run in Supabase SQL Editor.

begin;

alter table public.outlets
  add column if not exists service_start_time time,
  add column if not exists service_end_time time,
  add column if not exists last_takeaway_time time,
  add column if not exists timezone text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'outlets'
      and column_name = 'last_order_time'
  ) then
    execute '
      update public.outlets
      set last_takeaway_time = coalesce(last_takeaway_time, last_order_time)
      where last_order_time is not null
    ';
    execute 'alter table public.outlets drop column if exists last_order_time';
  end if;
end $$;

alter table public.outlets
  alter column service_start_time set default '08:00:00'::time,
  alter column service_end_time set default '01:00:00'::time,
  alter column last_takeaway_time set default '00:30:00'::time,
  alter column timezone set default 'Asia/Karachi';

update public.outlets
set
  service_start_time = coalesce(service_start_time, '08:00:00'::time),
  service_end_time = coalesce(service_end_time, '01:00:00'::time),
  last_takeaway_time = coalesce(last_takeaway_time, '00:30:00'::time),
  timezone = coalesce(nullif(trim(timezone), ''), 'Asia/Karachi')
where
  service_start_time is null
  or service_end_time is null
  or last_takeaway_time is null
  or timezone is null
  or trim(timezone) = '';

commit;

-- Verification
select
  branch_code,
  service_start_time,
  last_takeaway_time,
  service_end_time,
  timezone
from public.outlets
order by branch_code;
