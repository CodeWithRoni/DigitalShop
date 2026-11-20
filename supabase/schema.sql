-- DigitalShop schema. Run once in Supabase SQL Editor (or via migration).

-- ===== Tables =====
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

-- ===== RLS =====
-- All reads/writes go through the Next.js server using the service-role key,
-- so RLS is enabled with NO policies: anon/browser clients can access nothing.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
