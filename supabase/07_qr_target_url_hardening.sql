-- ==========================================
-- TABLETAP QR TARGET URL HARDENING
-- ==========================================
-- Run in Supabase SQL Editor after base schema.

begin;

alter table public.table_qr_codes
  add column if not exists target_url text;

-- Backfill target_url for rows that are linked to restaurant_tables.
update public.table_qr_codes q
set target_url =
  case
    when coalesce(t.table_number, 0) >= 9000
      then '/sip/menu?table=' || 'Takeaway' || (t.table_number - 8999)::text
    when coalesce(t.table_number, 0) > 0
      then '/sip/menu?table=' || 'Table' || t.table_number::text
    else '/sip/menu'
  end
from public.restaurant_tables t
where q.table_id = t.id
  and (q.target_url is null or btrim(q.target_url) = '');

-- Fallback for any orphan/legacy rows without table mapping.
update public.table_qr_codes
set target_url = '/sip/menu'
where target_url is null or btrim(target_url) = '';

alter table public.table_qr_codes
  alter column target_url set not null;

create unique index if not exists idx_table_qr_codes_outlet_table_unique
  on public.table_qr_codes (outlet_id, table_id);

commit;

-- Verification
select
  count(*) as total_qr_rows,
  count(*) filter (where target_url is null or btrim(target_url) = '') as missing_target_url
from public.table_qr_codes;

select
  id,
  outlet_id,
  table_id,
  target_url,
  created_at
from public.table_qr_codes
order by created_at desc
limit 20;