-- ==========================================
-- TABLETAP STRICT RLS + GRANTS (STEP 1)
-- Run after the base schema/seed script.
-- ==========================================

-- ---------- Helper functions ----------
create or replace function public.is_staff_for_outlet(p_outlet_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    where sm.profile_id = auth.uid()
      and sm.outlet_id = p_outlet_id
      and sm.is_active = true
  );
$$;

create or replace function public.can_access_menu_item(p_menu_item_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.menu_items mi
    where mi.id = p_menu_item_id
      and public.is_staff_for_outlet(mi.outlet_id)
  );
$$;

create or replace function public.can_access_session(p_session_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.table_sessions s
    where s.id = p_session_id
      and public.is_staff_for_outlet(s.outlet_id)
  );
$$;

create or replace function public.can_access_order(p_order_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.is_staff_for_outlet(o.outlet_id)
  );
$$;

create or replace function public.can_access_group_order(p_group_order_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_orders g
    join public.table_sessions s on s.id = g.table_session_id
    where g.id = p_group_order_id
      and public.is_staff_for_outlet(s.outlet_id)
  );
$$;

-- ---------- Grants ----------
grant usage on schema public to anon, authenticated;

-- Lock down everything first.
revoke all on table
  public.restaurants,
  public.outlets,
  public.profiles,
  public.staff_memberships,
  public.customer_devices,
  public.restaurant_tables,
  public.table_qr_codes,
  public.menu_categories,
  public.menu_items,
  public.menu_option_groups,
  public.menu_option_values,
  public.table_sessions,
  public.session_participants,
  public.personal_carts,
  public.personal_cart_items,
  public.group_orders,
  public.group_order_members,
  public.group_order_items,
  public.orders,
  public.order_items,
  public.order_item_options,
  public.order_status_history,
  public.push_subscriptions,
  public.order_watchers
from anon, authenticated;

-- Public/customer read-only menu surface.
grant select on
  public.restaurants,
  public.outlets,
  public.menu_categories,
  public.menu_items,
  public.menu_option_groups,
  public.menu_option_values
to anon, authenticated;

-- Staff app privileges (RLS will filter rows).
grant select, insert, update, delete on
  public.profiles,
  public.staff_memberships,
  public.restaurant_tables,
  public.table_qr_codes,
  public.table_sessions,
  public.session_participants,
  public.personal_carts,
  public.personal_cart_items,
  public.group_orders,
  public.group_order_members,
  public.group_order_items,
  public.orders,
  public.order_items,
  public.order_item_options,
  public.order_status_history
to authenticated;

-- Customer-device + push are backend/service-only in strict mode.
-- (No grants for anon/authenticated)

-- ---------- Enable RLS ----------
alter table public.restaurants enable row level security;
alter table public.outlets enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.customer_devices enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.table_qr_codes enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_option_groups enable row level security;
alter table public.menu_option_values enable row level security;
alter table public.table_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.personal_carts enable row level security;
alter table public.personal_cart_items enable row level security;
alter table public.group_orders enable row level security;
alter table public.group_order_members enable row level security;
alter table public.group_order_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.order_status_history enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.order_watchers enable row level security;

-- ---------- Drop old policies if they exist ----------
-- Public tables
drop policy if exists p_restaurants_read on public.restaurants;
drop policy if exists p_outlets_read on public.outlets;
drop policy if exists p_menu_categories_read on public.menu_categories;
drop policy if exists p_menu_items_read on public.menu_items;
drop policy if exists p_menu_option_groups_read on public.menu_option_groups;
drop policy if exists p_menu_option_values_read on public.menu_option_values;

-- Profile/staff
drop policy if exists p_profiles_self on public.profiles;
drop policy if exists p_staff_memberships_self_read on public.staff_memberships;

-- Menu write
drop policy if exists p_menu_categories_staff_write on public.menu_categories;
drop policy if exists p_menu_items_staff_write on public.menu_items;
drop policy if exists p_menu_option_groups_staff_write on public.menu_option_groups;
drop policy if exists p_menu_option_values_staff_write on public.menu_option_values;

-- Outlet/session/order policies
drop policy if exists p_staff_outlet_tables on public.restaurant_tables;
drop policy if exists p_staff_outlet_qr on public.table_qr_codes;
drop policy if exists p_staff_outlet_sessions on public.table_sessions;
drop policy if exists p_staff_session_participants on public.session_participants;
drop policy if exists p_staff_personal_carts on public.personal_carts;
drop policy if exists p_staff_personal_cart_items on public.personal_cart_items;
drop policy if exists p_staff_group_orders on public.group_orders;
drop policy if exists p_staff_group_order_members on public.group_order_members;
drop policy if exists p_staff_group_order_items on public.group_order_items;
drop policy if exists p_staff_orders on public.orders;
drop policy if exists p_staff_order_items on public.order_items;
drop policy if exists p_staff_order_item_options on public.order_item_options;
drop policy if exists p_staff_order_status_history on public.order_status_history;

-- Backend-only tables
drop policy if exists p_customer_devices_none on public.customer_devices;
drop policy if exists p_push_subscriptions_none on public.push_subscriptions;
drop policy if exists p_order_watchers_none on public.order_watchers;

create policy p_customer_devices_none on public.customer_devices
for all to anon, authenticated
using (false)
with check (false);

create policy p_push_subscriptions_none on public.push_subscriptions
for all to anon, authenticated
using (false)
with check (false);

create policy p_order_watchers_none on public.order_watchers
for all to anon, authenticated
using (false)
with check (false);

-- ---------- Create strict policies ----------
-- Public menu read
create policy p_restaurants_read on public.restaurants
for select
using (true);

create policy p_outlets_read on public.outlets
for select
using (true);

create policy p_menu_categories_read on public.menu_categories
for select
using (true);

create policy p_menu_items_read on public.menu_items
for select
using (true);

create policy p_menu_option_groups_read on public.menu_option_groups
for select
using (true);

create policy p_menu_option_values_read on public.menu_option_values
for select
using (true);

-- Profile/self
create policy p_profiles_self on public.profiles
for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy p_staff_memberships_self_read on public.staff_memberships
for select to authenticated
using (profile_id = auth.uid());

-- Staff menu write
create policy p_menu_categories_staff_write on public.menu_categories
for all to authenticated
using (public.is_staff_for_outlet(outlet_id))
with check (public.is_staff_for_outlet(outlet_id));

create policy p_menu_items_staff_write on public.menu_items
for all to authenticated
using (public.is_staff_for_outlet(outlet_id))
with check (public.is_staff_for_outlet(outlet_id));

create policy p_menu_option_groups_staff_write on public.menu_option_groups
for all to authenticated
using (public.can_access_menu_item(menu_item_id))
with check (public.can_access_menu_item(menu_item_id));

create policy p_menu_option_values_staff_write on public.menu_option_values
for all to authenticated
using (
  exists (
    select 1
    from public.menu_option_groups og
    where og.id = option_group_id
      and public.can_access_menu_item(og.menu_item_id)
  )
)
with check (
  exists (
    select 1
    from public.menu_option_groups og
    where og.id = option_group_id
      and public.can_access_menu_item(og.menu_item_id)
  )
);

-- Staff operational tables
create policy p_staff_outlet_tables on public.restaurant_tables
for all to authenticated
using (public.is_staff_for_outlet(outlet_id))
with check (public.is_staff_for_outlet(outlet_id));

create policy p_staff_outlet_qr on public.table_qr_codes
for all to authenticated
using (public.is_staff_for_outlet(outlet_id))
with check (public.is_staff_for_outlet(outlet_id));

create policy p_staff_outlet_sessions on public.table_sessions
for all to authenticated
using (public.is_staff_for_outlet(outlet_id))
with check (public.is_staff_for_outlet(outlet_id));

create policy p_staff_session_participants on public.session_participants
for all to authenticated
using (public.can_access_session(table_session_id))
with check (public.can_access_session(table_session_id));

create policy p_staff_personal_carts on public.personal_carts
for all to authenticated
using (public.can_access_session(table_session_id))
with check (public.can_access_session(table_session_id));

create policy p_staff_personal_cart_items on public.personal_cart_items
for all to authenticated
using (
  exists (
    select 1 from public.personal_carts c
    where c.id = personal_cart_id
      and public.can_access_session(c.table_session_id)
  )
)
with check (
  exists (
    select 1 from public.personal_carts c
    where c.id = personal_cart_id
      and public.can_access_session(c.table_session_id)
  )
);

create policy p_staff_group_orders on public.group_orders
for all to authenticated
using (public.can_access_session(table_session_id))
with check (public.can_access_session(table_session_id));

create policy p_staff_group_order_members on public.group_order_members
for all to authenticated
using (public.can_access_group_order(group_order_id))
with check (public.can_access_group_order(group_order_id));

create policy p_staff_group_order_items on public.group_order_items
for all to authenticated
using (public.can_access_group_order(group_order_id))
with check (public.can_access_group_order(group_order_id));

create policy p_staff_orders on public.orders
for all to authenticated
using (public.is_staff_for_outlet(outlet_id))
with check (public.is_staff_for_outlet(outlet_id));

create policy p_staff_order_items on public.order_items
for all to authenticated
using (public.can_access_order(order_id))
with check (public.can_access_order(order_id));

create policy p_staff_order_item_options on public.order_item_options
for all to authenticated
using (
  exists (
    select 1 from public.order_items oi
    where oi.id = order_item_id
      and public.can_access_order(oi.order_id)
  )
)
with check (
  exists (
    select 1 from public.order_items oi
    where oi.id = order_item_id
      and public.can_access_order(oi.order_id)
  )
);

create policy p_staff_order_status_history on public.order_status_history
for all to authenticated
using (public.can_access_order(order_id))
with check (public.can_access_order(order_id));
