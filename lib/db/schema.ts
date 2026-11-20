// Auto-generated from the schema below; database/schema.sql is the same SQL for manual use.
// Bump SCHEMA_VERSION whenever SCHEMA changes so existing databases get migrated on next start.
export const SCHEMA_VERSION = 2;

export const SCHEMA = String.raw`
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  category_id bigint references public.categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  image_url text,
  delivery_label text not null default 'Email / Account info',
  delivery_hint text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_id_idx on public.products(category_id);

create table if not exists public.packages (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists packages_product_id_idx on public.packages(product_id);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  note text,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending','processing','delivered','cancelled','refunded')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','failed','refunded')),
  payment_method text,
  tran_id text unique,
  val_id text,
  bank_tran_id text,
  paid_at timestamptz,
  delivery_message text,       -- shown to customer (e.g. login info)
  admin_note text,             -- internal only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_phone_idx on public.orders(customer_phone);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  package_id bigint references public.packages(id) on delete set null,
  product_name text not null,
  package_name text not null,
  unit_price numeric(12,2) not null,
  quantity int not null default 1 check (quantity between 1 and 50),
  delivery_info text
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_package_id_idx on public.order_items(package_id);

-- ===== Helpers =====
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ===== v2: admin features =====
alter table public.orders add column if not exists subtotal numeric(12,2);
alter table public.orders add column if not exists discount numeric(12,2) not null default 0;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists auto_delivered boolean not null default false;

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text,
  password_hash text not null,
  role text not null default 'staff' check (role in ('owner','staff')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  entity text,
  entity_id text,
  details text,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log(created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log(entity, entity_id);

create table if not exists public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique,
  type text not null default 'percent' check (type in ('percent','fixed')),
  value numeric(12,2) not null check (value > 0),
  min_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  method text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists refunds_order_id_idx on public.refunds(order_id);
create index if not exists refunds_created_idx on public.refunds(created_at);

create table if not exists public.stock_items (
  id bigint generated always as identity primary key,
  package_id bigint not null references public.packages(id) on delete cascade,
  content text not null,
  status text not null default 'available' check (status in ('available','delivered')),
  order_id bigint references public.orders(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists stock_items_package_status_idx on public.stock_items(package_id, status);
create index if not exists stock_items_order_id_idx on public.stock_items(order_id);

create table if not exists public.message_templates (
  id bigint generated always as identity primary key,
  name text not null,
  body text not null,
  product_id bigint references public.products(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists message_templates_product_idx on public.message_templates(product_id);

create table if not exists public.images (
  id bigint generated always as identity primary key,
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists reviews_product_status_idx on public.reviews(product_id, status);
`;
