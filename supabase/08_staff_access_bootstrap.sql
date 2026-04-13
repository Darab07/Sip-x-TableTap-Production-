-- ==========================================
-- TABLETAP STAFF ACCESS BOOTSTRAP (ADMIN/OWNER/MANAGER)
-- ==========================================
-- Run in Supabase SQL Editor.
-- Update target_email / target_role / branch_code as needed.

begin;

-- Set these values before running.
-- Example roles: 'admin', 'owner', 'manager'
with params as (
  select
    lower('admin@tabletap.com')::text as target_email,
    'admin'::public.staff_role as target_role,
    'f7-islamabad'::text as branch_code
),
target_user as (
  select u.id, lower(u.email) as email
  from auth.users u
  join params p on lower(u.email) = p.target_email
  limit 1
),
outlet as (
  select o.id, o.branch_code
  from public.outlets o
  join params p on o.branch_code = p.branch_code
  limit 1
)
insert into public.profiles (id)
select tu.id
from target_user tu
where not exists (
  select 1
  from public.profiles pr
  where pr.id = tu.id
);

with params as (
  select
    lower('admin@tabletap.com')::text as target_email,
    'admin'::public.staff_role as target_role,
    'f7-islamabad'::text as branch_code
),
target_user as (
  select u.id
  from auth.users u
  join params p on lower(u.email) = p.target_email
  limit 1
),
outlet as (
  select o.id
  from public.outlets o
  join params p on o.branch_code = p.branch_code
  limit 1
)
insert into public.staff_memberships (profile_id, outlet_id, role, is_active)
select
  tu.id,
  o.id,
  p.target_role,
  true
from target_user tu
cross join outlet o
cross join params p
where not exists (
  select 1
  from public.staff_memberships sm
  where sm.profile_id = tu.id
    and sm.outlet_id = o.id
    and sm.role = p.target_role
);

commit;

-- Verification
with params as (
  select
    lower('admin@tabletap.com')::text as target_email,
    'f7-islamabad'::text as branch_code
),
target_user as (
  select u.id, lower(u.email) as email
  from auth.users u
  join params p on lower(u.email) = p.target_email
  limit 1
)
select
  tu.id as profile_id,
  tu.email,
  sm.role,
  sm.is_active,
  o.branch_code,
  o.name as outlet_name
from target_user tu
left join public.staff_memberships sm on sm.profile_id = tu.id
left join public.outlets o on o.id = sm.outlet_id
order by sm.role;