-- ==========================================
-- TABLETAP ONBOARDING: KARO CAFE
-- ==========================================
-- Run in Supabase SQL Editor.
-- Idempotent: safe to run multiple times.

begin;

-- 1) Core restaurant + outlet identity

insert into public.restaurants (name, slug)
select 'Karo Cafe', 'karo-cafe'
where not exists (
  select 1
  from public.restaurants r
  where lower(r.name) = lower('Karo Cafe')
     or lower(r.slug) = lower('karo-cafe')
);

update public.restaurants
set
  name = 'Karo Cafe',
  slug = 'karo-cafe'
where lower(name) = lower('Karo Cafe')
   or lower(slug) = lower('karo-cafe');

with restaurant_target as (
  select r.id
  from public.restaurants r
  where lower(r.slug) = lower('karo-cafe')
     or lower(r.name) = lower('Karo Cafe')
  limit 1
)

insert into public.outlets (
  restaurant_id,
  name,
  branch_code,
  service_start_time,
  service_end_time,
  last_takeaway_time,
  timezone
)
select
  rt.id,
  'Karo Cafe / Roman Grove II, DHA 1, Bahria Phase 7',
  'karo-dha-phase-7',
  '11:00:00'::time,
  '00:00:00'::time,
  '00:00:00'::time,
  'Asia/Karachi'
from restaurant_target rt
where not exists (
  select 1
  from public.outlets o
  where o.branch_code = 'karo-dha-phase-7'
);

update public.outlets
set
  name = 'Karo Cafe / Roman Grove II, DHA 1, Bahria Phase 7',
  service_start_time = '11:00:00'::time,
  service_end_time = '00:00:00'::time,
  last_takeaway_time = '00:00:00'::time,
  timezone = 'Asia/Karachi'
where branch_code = 'karo-dha-phase-7';

-- 2) Categories
create temporary table if not exists _karo_categories (
  slug text primary key,
  name text not null,
  sort_order int not null
) on commit drop;

truncate _karo_categories;

insert into _karo_categories (slug, name, sort_order) values
  ('hot-coffee', 'Hot Coffee', 1),
  ('iced-coffee', 'Iced Coffee', 2),
  ('signature-drinks', 'Signature Drinks', 3),
  ('matcha-ceremonial-grade', 'Matcha Ceremonial Grade', 4);

with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
)
insert into public.menu_categories (outlet_id, slug, name, sort_order)
select
  ot.id,
  c.slug,
  c.name,
  c.sort_order
from _karo_categories c
cross join outlet_target ot
where not exists (
  select 1
  from public.menu_categories mc
  where mc.outlet_id = ot.id
    and mc.slug = c.slug
);

with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
)
update public.menu_categories mc
set
  name = c.name,
  sort_order = c.sort_order
from _karo_categories c, outlet_target ot
where mc.outlet_id = ot.id
  and mc.slug = c.slug;

-- 3) Menu items
create temporary table if not exists _karo_items (
  category_slug text not null,
  name text not null,
  description text not null,
  base_price numeric(10,2) not null,
  sort_order int not null,
  is_available boolean not null default true
) on commit drop;

truncate _karo_items;

insert into _karo_items (category_slug, name, description, base_price, sort_order, is_available) values
  -- Hot Coffee
  ('hot-coffee', 'Espresso', 'Rich and concentrated espresso shot.', 350, 1, true),
  ('hot-coffee', 'Americano', 'Espresso balanced with hot water.', 550, 2, true),
  ('hot-coffee', 'Latte', 'Smooth espresso with steamed milk.', 750, 3, true),
  ('hot-coffee', 'Karo Signature Latte', 'House signature latte blend.', 800, 4, true),
  ('hot-coffee', 'Flat White', 'Velvety microfoam and espresso.', 700, 5, true),
  ('hot-coffee', 'Cappuccino', 'Classic cappuccino with thick foam.', 750, 6, true),
  ('hot-coffee', 'Mocha', 'Espresso with chocolate and milk.', 800, 7, true),
  ('hot-coffee', 'Spanish', 'Sweetened Spanish-style latte.', 800, 8, true),
  ('hot-coffee', 'Cortado', 'Espresso cut with warm milk.', 750, 9, true),
  ('hot-coffee', 'Hot Chocolate', 'Creamy chocolate drink.', 750, 10, true),

  -- Iced Coffee
  ('iced-coffee', 'Americano', 'Chilled americano over ice.', 650, 1, true),
  ('iced-coffee', 'Latte', 'Iced latte with balanced espresso.', 850, 2, true),
  ('iced-coffee', 'Mocha', 'Iced mocha with chocolate notes.', 850, 3, true),
  ('iced-coffee', 'Spanish', 'Iced Spanish latte, sweet and smooth.', 850, 4, true),

  -- Signature Drinks
  ('signature-drinks', 'Karo Signature Iced Latte', 'Karo''s signature iced latte.', 900, 1, true),
  ('signature-drinks', 'Coco Cloud Espresso', 'Espresso with a coconut cloud finish.', 900, 2, true),
  ('signature-drinks', 'Strawberry Mojito', 'Fresh strawberry mojito.', 900, 3, true),
  ('signature-drinks', 'Mix Berry Mojito', 'Mixed berry mojito refreshment.', 900, 4, true),
  ('signature-drinks', 'Peach Passion Fruit Iced Tea', 'Peach and passion fruit iced tea.', 800, 5, true),
  ('signature-drinks', 'Summer Fruits Iced Tea', 'Fruity iced tea blend.', 800, 6, true),

  -- Matcha Ceremonial Grade
  ('matcha-ceremonial-grade', 'Vanilla Matcha', 'Ceremonial matcha with vanilla profile.', 950, 1, true),
  ('matcha-ceremonial-grade', 'Coconut Matcha', 'Ceremonial matcha with coconut profile.', 950, 2, true),
  ('matcha-ceremonial-grade', 'Coconut Cloud Matcha', 'Ceremonial matcha with coconut cloud finish.', 950, 3, true),
  ('matcha-ceremonial-grade', 'Strawberry Matcha', 'Ceremonial strawberry matcha.', 1000, 4, true);

with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
category_map as (
  select mc.id as category_id, mc.slug
  from public.menu_categories mc
  join outlet_target ot on ot.id = mc.outlet_id
)
insert into public.menu_items (
  outlet_id,
  category_id,
  name,
  slug,
  description,
  base_price,
  is_price_on_request,
  is_available,
  sort_order
)
select
  ot.id,
  cm.category_id,
  i.name,
  lower(trim(both '-' from regexp_replace(i.category_slug || '-' || i.name, '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
  i.description,
  i.base_price,
  false,
  i.is_available,
  i.sort_order
from _karo_items i
join category_map cm on cm.slug = i.category_slug
cross join outlet_target ot
where not exists (
  select 1
  from public.menu_items mi
  where mi.outlet_id = ot.id
    and mi.category_id = cm.category_id
    and lower(mi.name) = lower(i.name)
);

with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
category_map as (
  select mc.id as category_id, mc.slug
  from public.menu_categories mc
  join outlet_target ot on ot.id = mc.outlet_id
)
update public.menu_items mi
set
  slug = lower(trim(both '-' from regexp_replace(i.category_slug || '-' || i.name, '[^a-zA-Z0-9]+', '-', 'g'))),
  description = i.description,
  base_price = i.base_price,
  is_available = i.is_available,
  sort_order = i.sort_order
from _karo_items i
join category_map cm on cm.slug = i.category_slug
cross join outlet_target ot
where mi.category_id = cm.category_id
  and mi.outlet_id = ot.id
  and lower(mi.name) = lower(i.name);

-- 4) Add-ons as option groups/values (applied to all Karo menu items)
with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
karo_menu_items as (
  select mi.id
  from public.menu_items mi
  join outlet_target ot on ot.id = mi.outlet_id
)
insert into public.menu_option_groups (
  menu_item_id,
  name,
  input_type,
  pricing_mode,
  required,
  min_select,
  max_select,
  sort_order
)
select
  kmi.id,
  'Add-ons',
  'multi',
  'delta',
  false,
  0,
  5,
  1
from karo_menu_items kmi
where not exists (
  select 1
  from public.menu_option_groups mog
  where mog.menu_item_id = kmi.id
    and mog.name = 'Add-ons'
);

create temporary table if not exists _karo_addons (
  label text not null,
  price_delta numeric(10,2) not null,
  sort_order int not null
) on commit drop;

truncate _karo_addons;

insert into _karo_addons (label, price_delta, sort_order) values
  ('Extra Shot Espresso', 150, 1),
  ('Lactose-Free Milk', 100, 2),
  ('Skimmed Milk', 100, 3),
  ('Extra Flavour Shot', 80, 4);

with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
addon_groups as (
  select mog.id
  from public.menu_option_groups mog
  join public.menu_items mi on mi.id = mog.menu_item_id
  join outlet_target ot on ot.id = mi.outlet_id
  where mog.name = 'Add-ons'
)
insert into public.menu_option_values (
  option_group_id,
  label,
  price_delta,
  sort_order
)
select
  ag.id,
  a.label,
  a.price_delta,
  a.sort_order
from addon_groups ag
cross join _karo_addons a
where not exists (
  select 1
  from public.menu_option_values mov
  where mov.option_group_id = ag.id
    and lower(mov.label) = lower(a.label)
);

-- Matcha-specific strawberry flavour (+50)
with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
matcha_items as (
  select mi.id
  from public.menu_items mi
  join public.menu_categories mc on mc.id = mi.category_id
  join outlet_target ot on ot.id = mi.outlet_id
  where mc.slug = 'matcha-ceremonial-grade'
),
matcha_groups as (
  insert into public.menu_option_groups (
    menu_item_id,
    name,
    input_type,
    pricing_mode,
    required,
    min_select,
    max_select,
    sort_order
  )
  select
    mi.id,
    'Matcha Upgrades',
    'single',
    'delta',
    false,
    0,
    1,
    2
  from matcha_items mi
  where not exists (
    select 1
    from public.menu_option_groups mog
    where mog.menu_item_id = mi.id
      and mog.name = 'Matcha Upgrades'
  )
  returning id
),
all_matcha_groups as (
  select id from matcha_groups
  union
  select mog.id
  from public.menu_option_groups mog
  join matcha_items mi on mi.id = mog.menu_item_id
  where mog.name = 'Matcha Upgrades'
)
insert into public.menu_option_values (
  option_group_id,
  label,
  price_delta,
  sort_order
)
select
  amg.id,
  'Strawberry Flavour',
  50,
  1
from all_matcha_groups amg
where not exists (
  select 1
  from public.menu_option_values mov
  where mov.option_group_id = amg.id
    and lower(mov.label) = lower('Strawberry Flavour')
);

-- 5) Tables (10 dine-in) + takeaway stand
with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
numbers as (
  select generate_series(1, 10) as table_number
)
insert into public.restaurant_tables (outlet_id, table_number)
select
  ot.id,
  n.table_number
from numbers n
cross join outlet_target ot
where not exists (
  select 1
  from public.restaurant_tables rt
  where rt.outlet_id = ot.id
    and rt.table_number = n.table_number
);

-- Takeaway stand table number base: 9000 => "Stand 1"
with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
)
insert into public.restaurant_tables (outlet_id, table_number)
select
  ot.id,
  9000
from outlet_target ot
where not exists (
  select 1
  from public.restaurant_tables rt
  where rt.outlet_id = ot.id
    and rt.table_number = 9000
);

-- 6) QR rows for all Karo tables (including takeaway)
with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
karo_tables as (
  select
    rt.id as table_id,
    rt.table_number,
    case
      when rt.table_number >= 9000
        then '/karo/menu?table=' || 'Takeaway' || (rt.table_number - 8999)::text || '&branchCode=karo-dha-phase-7&restaurant=karo'
      else '/karo/menu?table=' || 'Table' || rt.table_number::text || '&branchCode=karo-dha-phase-7&restaurant=karo'
    end as target_url
  from public.restaurant_tables rt
  join outlet_target ot on ot.id = rt.outlet_id
)
insert into public.table_qr_codes (outlet_id, table_id, target_url)
select
  ot.id,
  kt.table_id,
  kt.target_url
from karo_tables kt
cross join outlet_target ot
where not exists (
  select 1
  from public.table_qr_codes q
  where q.outlet_id = ot.id
    and q.table_id = kt.table_id
);

with outlet_target as (
  select id
  from public.outlets
  where branch_code = 'karo-dha-phase-7'
  limit 1
),
karo_tables as (
  select
    rt.id as table_id,
    case
      when rt.table_number >= 9000
        then '/karo/menu?table=' || 'Takeaway' || (rt.table_number - 8999)::text || '&branchCode=karo-dha-phase-7&restaurant=karo'
      else '/karo/menu?table=' || 'Table' || rt.table_number::text || '&branchCode=karo-dha-phase-7&restaurant=karo'
    end as target_url
  from public.restaurant_tables rt
  join outlet_target ot on ot.id = rt.outlet_id
)
update public.table_qr_codes q
set
  target_url = kt.target_url
from karo_tables kt, outlet_target ot
where q.outlet_id = ot.id
  and q.table_id = kt.table_id;

commit;

-- ==========================================
-- STAFF ASSIGNMENT (RUN AFTER YOU SHARE EMAILS)
-- ==========================================
-- Example run blocks:
-- 1) Replace target_email and target_role values.
-- 2) Run once per role/email.
--
-- with params as (
--   select
--     lower('owner@karocafe.com')::text as target_email,
--     'owner'::public.staff_role as target_role,
--     'karo-dha-phase-7'::text as branch_code
-- ),
-- target_user as (
--   select u.id
--   from auth.users u
--   join params p on lower(u.email) = p.target_email
--   limit 1
-- ),
-- outlet as (
--   select o.id
--   from public.outlets o
--   join params p on o.branch_code = p.branch_code
--   limit 1
-- )
-- insert into public.profiles (id)
-- select tu.id
-- from target_user tu
-- where not exists (
--   select 1
--   from public.profiles pr
--   where pr.id = tu.id
-- );
--
-- with params as (
--   select
--     lower('owner@karocafe.com')::text as target_email,
--     'owner'::public.staff_role as target_role,
--     'karo-dha-phase-7'::text as branch_code
-- ),
-- target_user as (
--   select u.id
--   from auth.users u
--   join params p on lower(u.email) = p.target_email
--   limit 1
-- ),
-- outlet as (
--   select o.id
--   from public.outlets o
--   join params p on o.branch_code = p.branch_code
--   limit 1
-- )
-- insert into public.staff_memberships (profile_id, outlet_id, role, is_active)
-- select
--   tu.id,
--   o.id,
--   p.target_role,
--   true
-- from target_user tu
-- cross join outlet o
-- cross join params p
-- where not exists (
--   select 1
--   from public.staff_memberships sm
--   where sm.profile_id = tu.id
--     and sm.outlet_id = o.id
--     and sm.role = p.target_role
-- );

-- ==========================================
-- VERIFICATION
-- ==========================================
select id, name, slug from public.restaurants where lower(slug) = lower('karo-cafe');

select
  branch_code,
  name,
  service_start_time,
  service_end_time,
  last_takeaway_time,
  timezone
from public.outlets
where branch_code = 'karo-dha-phase-7';

select
  mc.slug,
  mc.name as category_name,
  mc.sort_order,
  count(mi.id) as items_count
from public.menu_categories mc
left join public.menu_items mi on mi.category_id = mc.id
where mc.outlet_id = (
  select id from public.outlets where branch_code = 'karo-dha-phase-7' limit 1
)
group by mc.slug, mc.name, mc.sort_order
order by mc.sort_order;

select
  rt.table_number,
  q.target_url
from public.restaurant_tables rt
left join public.table_qr_codes q on q.table_id = rt.id
where rt.outlet_id = (
  select id from public.outlets where branch_code = 'karo-dha-phase-7' limit 1
)
order by rt.table_number;
