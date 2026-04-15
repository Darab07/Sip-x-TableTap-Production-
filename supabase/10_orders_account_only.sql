-- ==========================================
-- TABLETAP ORDERS ACCOUNT OWNERSHIP ONLY
-- ==========================================
-- Goal:
-- 1) Keep order ownership on customer_auth_user_id only
-- 2) Remove legacy customer_device_id links from orders that are already account-linked
-- 3) Preserve customer_devices for profile/device metadata outside order ownership

begin;

update public.orders
set customer_device_id = null
where customer_auth_user_id is not null
  and customer_device_id is not null;

commit;

-- Verification
select
  count(*) as total_orders,
  count(*) filter (where customer_auth_user_id is not null) as account_linked_orders,
  count(*) filter (where customer_device_id is not null) as device_linked_orders,
  count(*) filter (
    where customer_auth_user_id is not null
      and customer_device_id is not null
  ) as mixed_linked_orders
from public.orders;

select
  order_number,
  customer_auth_user_id,
  customer_device_id,
  placed_at
from public.orders
where customer_auth_user_id is not null
order by placed_at desc
limit 20;
