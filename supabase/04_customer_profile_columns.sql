-- ==========================================
-- TABLETAP CUSTOMER PROFILE COLUMNS (OPTIONAL BUT RECOMMENDED)
-- ==========================================
-- Run in Supabase SQL Editor.
-- Adds marketing-friendly profile fields on customer_devices.

begin;

alter table public.customer_devices
  add column if not exists display_name text,
  add column if not exists email text;

create index if not exists idx_customer_devices_email
  on public.customer_devices (lower(email))
  where email is not null;

commit;

-- Verification
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'customer_devices'
  and column_name in ('display_name', 'email')
order by column_name;
