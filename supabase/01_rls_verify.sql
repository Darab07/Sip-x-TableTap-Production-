-- ==========================================
-- TABLETAP RLS VERIFICATION QUERIES (STEP 1)
-- ==========================================

-- 1) RLS enabled state
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'restaurants','outlets','profiles','staff_memberships','customer_devices',
    'restaurant_tables','table_qr_codes','menu_categories','menu_items',
    'menu_option_groups','menu_option_values','table_sessions','session_participants',
    'personal_carts','personal_cart_items','group_orders','group_order_members',
    'group_order_items','orders','order_items','order_item_options',
    'order_status_history','push_subscriptions','order_watchers'
  )
order by tablename;

-- 2) Policies summary
select schemaname, tablename, policyname, cmd, roles, permissive
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Grants for anon/authenticated
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 4) Quick sanity checks for required key policies
select
  exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='p_staff_orders') as has_orders_staff_policy,
  exists (select 1 from pg_policies where schemaname='public' and tablename='menu_items' and policyname='p_menu_items_read') as has_menu_public_read,
  exists (select 1 from pg_policies where schemaname='public' and tablename='customer_devices' and policyname='p_customer_devices_none') as has_customer_devices_blocked;
