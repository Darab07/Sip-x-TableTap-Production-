-- ==========================================
-- TABLETAP AUTH USER LINKING FOR CUSTOMER ORDERS
-- ==========================================
-- Goal: Tie orders/history/tracking to auth.users.id so all linked identities
-- (email/password + Google with same email) map to one account-level record.

begin;

alter table public.orders
  add column if not exists customer_auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_customer_auth_user_id
  on public.orders (customer_auth_user_id, placed_at desc)
  where customer_auth_user_id is not null;

create index if not exists idx_orders_outlet_customer_auth_user
  on public.orders (outlet_id, customer_auth_user_id, placed_at desc)
  where customer_auth_user_id is not null;

-- Backfill from existing device/email mapping when possible.
with device_to_auth as (
  select
    cd.id as customer_device_id,
    au.id as auth_user_id
  from public.customer_devices cd
  join auth.users au
    on lower(au.email) = lower(cd.email)
  where cd.email is not null
),
candidate_updates as (
  select
    o.id as order_id,
    dta.auth_user_id
  from public.orders o
  join device_to_auth dta
    on dta.customer_device_id = o.customer_device_id
  where o.customer_auth_user_id is null
)
update public.orders o
set customer_auth_user_id = cu.auth_user_id
from candidate_updates cu
where o.id = cu.order_id
  and o.customer_auth_user_id is null;

commit;

-- Verification
select
  count(*) as total_orders,
  count(*) filter (where customer_auth_user_id is not null) as linked_orders,
  count(*) filter (where customer_auth_user_id is null) as unlinked_orders
from public.orders;

select
  o.order_number,
  o.customer_auth_user_id,
  o.customer_device_id,
  o.placed_at
from public.orders o
order by o.placed_at desc
limit 20;
