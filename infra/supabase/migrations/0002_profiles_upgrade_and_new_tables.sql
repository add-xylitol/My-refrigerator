-- 0002_profiles_upgrade_and_new_tables.sql
-- 升级 anon_profiles → profiles, 新增 meal_logs, shopping_items, shelf_life_refs

-- 1. 升级 anon_profiles → profiles
ALTER TABLE public.anon_profiles RENAME TO profiles;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wx_openid TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wx_unionid TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_ai_quota INT NOT NULL DEFAULT 10;

-- device_fingerprint 改为可选（微信用户没有）
ALTER TABLE public.profiles ALTER COLUMN device_fingerprint DROP NOT NULL;

-- 更新所有外键引用
ALTER TABLE public.shelves DROP CONSTRAINT shelves_profile_id_fkey,
  ADD CONSTRAINT shelves_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.photos DROP CONSTRAINT photos_profile_id_fkey,
  ADD CONSTRAINT photos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.items DROP CONSTRAINT items_profile_id_fkey,
  ADD CONSTRAINT items_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.condiments DROP CONSTRAINT condiments_profile_id_fkey,
  ADD CONSTRAINT condiments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recipes DROP CONSTRAINT recipes_profile_id_fkey,
  ADD CONSTRAINT recipes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recipe_usages DROP CONSTRAINT recipe_usages_profile_id_fkey,
  ADD CONSTRAINT recipe_usages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.sync_logs DROP CONSTRAINT sync_logs_profile_id_fkey,
  ADD CONSTRAINT sync_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. 新增 meal_logs 表
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  items_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_url TEXT,
  note TEXT,
  eaten_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS meal_logs_profile_idx ON public.meal_logs(profile_id, eaten_at DESC);

-- 3. 新增 shopping_items 表
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit public.quantity_unit NOT NULL DEFAULT '个',
  source TEXT,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS shopping_items_profile_idx ON public.shopping_items(profile_id, purchased, created_at DESC);

-- 4. 新增 shelf_life_refs 食材保质期参考表
CREATE TABLE IF NOT EXISTS public.shelf_life_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  chill_days INT,
  freeze_days INT,
  produce_days INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS shelf_life_refs_name_idx ON public.shelf_life_refs(name);

-- 5. 插入常见食材保质期初始数据
INSERT INTO public.shelf_life_refs (name, category, chill_days, freeze_days, produce_days) VALUES
  ('鸡蛋', '蛋类', 30, NULL, NULL),
  ('牛奶', '乳制品', 7, NULL, NULL),
  ('鸡胸肉', '肉类', 2, 180, NULL),
  ('猪肉', '肉类', 2, 180, NULL),
  ('牛肉', '肉类', 3, 180, NULL),
  ('鱼', '海鲜', 1, 90, NULL),
  ('虾', '海鲜', 2, 120, NULL),
  ('西红柿', '蔬菜', 7, NULL, 10),
  ('上海青', '蔬菜', 3, NULL, 5),
  ('黄瓜', '蔬菜', 5, NULL, 7),
  ('胡萝卜', '蔬菜', 14, NULL, 21),
  ('土豆', '蔬菜', 30, NULL, 30),
  ('豆腐', '豆制品', 5, NULL, NULL),
  ('草莓', '水果', 3, NULL, 5),
  ('苹果', '水果', 30, NULL, 30),
  ('香蕉', '水果', 5, NULL, 7),
  ('酸奶', '乳制品', 14, NULL, NULL),
  ('火腿', '加工肉', 7, 60, NULL),
  ('白菜', '蔬菜', 7, NULL, 10),
  ('蘑菇', '蔬菜', 3, NULL, 5)
ON CONFLICT (name) DO NOTHING;
