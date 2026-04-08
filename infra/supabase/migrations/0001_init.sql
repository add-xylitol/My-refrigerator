-- 基础扩展
create extension if not exists "pgcrypto";

-- 枚举类型
do $$
begin
  if not exists (select 1 from pg_type where typname = 'shelf_type') then
    create type public.shelf_type as enum ('chill', 'freeze', 'produce');
  end if;
  if not exists (select 1 from pg_type where typname = 'quantity_unit') then
    create type public.quantity_unit as enum ('个', '克', '毫升', '把', '袋');
  end if;
  if not exists (select 1 from pg_type where typname = 'recipe_tag') then
    create type public.recipe_tag as enum ('临期优先', '快速上桌', '冷冻解压', '定制');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_level') then
    create type public.stock_level as enum ('充足', '缺货', '临期');
  end if;
  if not exists (select 1 from pg_type where typname = 'condiment_category') then
    create type public.condiment_category as enum ('酱油/醋', '香料', '油/脂', '其他');
  end if;
end$$;

-- 更新时间触发器
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- 匿名会话（MVP 阶段单账号，但为未来多账号预留）
create table if not exists public.anon_profiles (
  id uuid primary key default gen_random_uuid(),
  device_fingerprint text not null unique,
  display_name text,
  last_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create trigger anon_profiles_set_updated_at
before update on public.anon_profiles
for each row execute function public.set_updated_at();

-- 冰箱层位
create table if not exists public.shelves (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  name text not null,
  sort smallint not null default 1,
  type public.shelf_type not null default 'chill',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists shelves_profile_id_idx on public.shelves(profile_id);
create trigger shelves_set_updated_at
before update on public.shelves
for each row execute function public.set_updated_at();

-- 拍照记录
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  shelf_id uuid references public.shelves(id) on delete set null,
  original_url text not null,
  annotated_url text,
  taken_at timestamptz,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists photos_profile_id_idx on public.photos(profile_id, taken_at desc);
create trigger photos_set_updated_at
before update on public.photos
for each row execute function public.set_updated_at();

-- 库存食材
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  shelf_id uuid not null references public.shelves(id) on delete cascade,
  name text not null,
  unit public.quantity_unit not null default '个',
  qty numeric(10, 2) not null default 1,
  exp_date date,
  barcode text,
  photo_id uuid references public.photos(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists items_profile_shelf_idx on public.items(profile_id, shelf_id);
create index if not exists items_exp_date_idx on public.items(exp_date);
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- 调味品
create table if not exists public.condiments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  name text not null,
  category public.condiment_category not null default '其他',
  stock_level public.stock_level not null default '充足',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists condiments_profile_id_idx on public.condiments(profile_id);
create trigger condiments_set_updated_at
before update on public.condiments
for each row execute function public.set_updated_at();

-- 菜谱
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  title text not null,
  minutes integer,
  summary text,
  tag public.recipe_tag,
  cover_url text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists recipes_profile_id_idx on public.recipes(profile_id);
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

-- 菜谱与库存使用记录
create table if not exists public.recipe_usages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  qty numeric(10, 2) not null,
  unit public.quantity_unit not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists recipe_usages_profile_recipe_idx on public.recipe_usages(profile_id, recipe_id);

-- 同步日志
create table if not exists public.sync_logs (
  id bigserial primary key,
  profile_id uuid not null references public.anon_profiles(id) on delete cascade,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists sync_logs_profile_idx on public.sync_logs(profile_id);
