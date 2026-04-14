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
      then
        '/' || route.restaurant_segment || '/menu?table=' || 'Takeaway' || (t.table_number - 8999)::text
        || '&branchCode=' || route.branch_code
        || '&restaurant=' || route.restaurant_segment
    when coalesce(t.table_number, 0) > 0
      then
        '/' || route.restaurant_segment || '/menu?table=' || 'Table' || t.table_number::text
        || '&branchCode=' || route.branch_code
        || '&restaurant=' || route.restaurant_segment
    else '/' || route.restaurant_segment || '/menu?branchCode=' || route.branch_code || '&restaurant=' || route.restaurant_segment
  end
from public.restaurant_tables t
cross join (
  select
    o.id as outlet_id,
    coalesce(nullif(lower(o.branch_code), ''), 'f7-islamabad') as branch_code,
    coalesce(
      nullif(split_part(lower(coalesce(r.slug, r.name, 'sip')), '-', 1), ''),
      'sip'
    ) as restaurant_segment
  from public.outlets o
  left join public.restaurants r on r.id = o.restaurant_id
) as route
where q.table_id = t.id
  and route.outlet_id = q.outlet_id;

-- Fallback for any orphan/legacy rows without table mapping.
update public.table_qr_codes
set target_url = '/menu'
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
