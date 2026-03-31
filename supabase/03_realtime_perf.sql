-- ==========================================
-- TABLETAP REALTIME + PERFORMANCE HARDENING
-- ==========================================
-- Run in Supabase SQL Editor after your base schema.

begin;

-- Core read/query indexes
create index if not exists idx_orders_outlet_placed_at
  on public.orders (outlet_id, placed_at desc);

create index if not exists idx_orders_order_number
  on public.orders (order_number);

create index if not exists idx_orders_table_id_placed_at
  on public.orders (table_id, placed_at desc);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

create index if not exists idx_menu_items_outlet_category_sort
  on public.menu_items (outlet_id, category_id, sort_order);

create index if not exists idx_menu_items_outlet_name
  on public.menu_items (outlet_id, name);

create index if not exists idx_menu_option_groups_menu_item
  on public.menu_option_groups (menu_item_id, sort_order);

create index if not exists idx_menu_option_values_option_group
  on public.menu_option_values (option_group_id, sort_order);

create index if not exists idx_restaurant_tables_outlet_table_number
  on public.restaurant_tables (outlet_id, table_number);

create index if not exists idx_table_sessions_outlet_status_started
  on public.table_sessions (outlet_id, status, started_at desc);

create index if not exists idx_session_participants_session
  on public.session_participants (table_session_id);

create index if not exists idx_table_qr_codes_outlet_table
  on public.table_qr_codes (outlet_id, table_id);

-- Realtime publication: ensure live tables are included
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'restaurant_tables'
  ) then
    alter publication supabase_realtime add table public.restaurant_tables;
  end if;
end $$;

commit;

-- Verification
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_orders_outlet_placed_at',
    'idx_orders_order_number',
    'idx_orders_table_id_placed_at',
    'idx_order_items_order_id',
    'idx_menu_items_outlet_category_sort',
    'idx_menu_items_outlet_name',
    'idx_menu_option_groups_menu_item',
    'idx_menu_option_values_option_group',
    'idx_restaurant_tables_outlet_table_number',
    'idx_table_sessions_outlet_status_started',
    'idx_session_participants_session',
    'idx_table_qr_codes_outlet_table'
  )
order by indexname;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('orders', 'menu_items', 'restaurant_tables')
order by tablename;
