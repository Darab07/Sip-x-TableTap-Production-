-- ==========================================
-- TABLETAP MENU CLEANUP (KEEP ONLY LIVE MENU)
-- ==========================================
-- Run in Supabase SQL Editor.
-- If needed, change branch_code in the target_outlet CTE below.

begin;

create temporary table if not exists _allowed_menu (
  category_slug text not null,
  item_name text not null
) on commit drop;

truncate _allowed_menu;

insert into _allowed_menu (category_slug, item_name) values
  -- Breakfast
  ('breakfast', 'Turkish Eggs'),
  ('breakfast', 'Sunny Hummus Bowl'),
  ('breakfast', 'Avocado Toast'),
  ('breakfast', 'French Toast'),
  ('breakfast', 'Steak & Eggs'),

  -- Salads
  ('salads', 'Golden Crunch'),
  ('salads', 'Ceaser salad'),

  -- Sandwiches
  ('sandwiches', 'Grilled Chicken Pesto'),
  ('sandwiches', 'Mexi Beef Focaccia'),
  ('sandwiches', 'Sun Kissed Chicken'),
  ('sandwiches', 'Classic Club'),
  ('sandwiches', 'Focaccia Fillet'),
  ('sandwiches', 'Beef Melt'),

  -- Coffee
  ('coffee', 'Espresso'),
  ('coffee', 'Cappuccino'),
  ('coffee', 'Macchiato'),
  ('coffee', 'Cortado'),
  ('coffee', 'Flat White'),
  ('coffee', 'Latte'),
  ('coffee', 'Spanish Latte'),
  ('coffee', 'French Vanilla Gingerbread'),
  ('coffee', 'Caramel Cinnamon'),
  ('coffee', 'Hazelnut'),
  ('coffee', 'Butter Scotch'),
  ('coffee', 'Tiramisu'),
  ('coffee', 'Coconut'),
  ('coffee', 'Mocha'),

  -- Slow Bar
  ('slow-bar', 'Tier 1'),
  ('slow-bar', 'Tier 2'),
  ('slow-bar', 'Tier 3'),

  -- Not Coffee
  ('not-coffee', 'Hot/Iced Chocolate'),
  ('not-coffee', 'Sip Signature Chocolate'),
  ('not-coffee', 'Apple Mojito'),
  ('not-coffee', 'Raspberry Mojito'),
  ('not-coffee', 'Pina Coco and Green Apple Mojito'),
  ('not-coffee', 'Passion Fruit Mojito'),
  ('not-coffee', 'Lemon Iced Tea'),
  ('not-coffee', 'Peach Iced Tea'),

  -- Matcha
  ('matcha', 'Matcha'),
  ('matcha', 'Spanish Matcha'),
  ('matcha', 'Stawberry Matcha'),
  ('matcha', 'Coconut Matcha');

with target_outlet as (
  select id
  from public.outlets
  where branch_code = 'f7-islamabad'
  limit 1
),
items_to_delete as (
  select mi.id
  from public.menu_items mi
  join public.menu_categories mc on mc.id = mi.category_id
  join target_outlet t on t.id = mi.outlet_id
  where not exists (
    select 1
    from _allowed_menu am
    where am.category_slug = mc.slug
      and lower(am.item_name) = lower(mi.name)
  )
)
delete from public.menu_option_values mov
using public.menu_option_groups mog, items_to_delete itd
where mov.option_group_id = mog.id
  and mog.menu_item_id = itd.id;

with target_outlet as (
  select id
  from public.outlets
  where branch_code = 'f7-islamabad'
  limit 1
),
items_to_delete as (
  select mi.id
  from public.menu_items mi
  join public.menu_categories mc on mc.id = mi.category_id
  join target_outlet t on t.id = mi.outlet_id
  where not exists (
    select 1
    from _allowed_menu am
    where am.category_slug = mc.slug
      and lower(am.item_name) = lower(mi.name)
  )
)
delete from public.menu_option_groups mog
using items_to_delete itd
where mog.menu_item_id = itd.id;

with target_outlet as (
  select id
  from public.outlets
  where branch_code = 'f7-islamabad'
  limit 1
)
delete from public.menu_items mi
using public.menu_categories mc, target_outlet t
where mi.category_id = mc.id
  and mi.outlet_id = t.id
  and not exists (
    select 1
    from _allowed_menu am
    where am.category_slug = mc.slug
      and lower(am.item_name) = lower(mi.name)
  );

with target_outlet as (
  select id
  from public.outlets
  where branch_code = 'f7-islamabad'
  limit 1
)
delete from public.menu_categories mc
using target_outlet t
where mc.outlet_id = t.id
  and mc.slug not in (select distinct category_slug from _allowed_menu)
  and not exists (
    select 1
    from public.menu_items mi
    where mi.category_id = mc.id
  );

commit;

-- Verification
with target_outlet as (
  select id
  from public.outlets
  where branch_code = 'f7-islamabad'
  limit 1
)
select
  mc.slug as category_slug,
  mi.name as item_name,
  mi.is_available,
  mi.base_price
from public.menu_items mi
join public.menu_categories mc on mc.id = mi.category_id
join target_outlet t on t.id = mi.outlet_id
order by mc.sort_order, mi.sort_order, mi.name;
