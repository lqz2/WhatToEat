-- WhatToEat 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 冰箱食材表
CREATE TABLE fridge_items (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  quantity VARCHAR(50), -- 例如 "2个" 或 "500g"
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户菜系偏好表
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cuisine VARCHAR(50) NOT NULL,
  weight INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, cuisine)
);

-- 菜单共享表
CREATE TABLE shared_menus (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, shared_with_id)
);

-- 启用 RLS (Row Level Security)
ALTER TABLE fridge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_menus ENABLE ROW LEVEL SECURITY;

-- fridge_items 表 RLS 策略：用户可以访问自己的食材和被共享给自己的冰箱食材
CREATE POLICY "Users can view own fridge items" ON fridge_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared fridge items" ON fridge_items
  FOR SELECT USING (
    user_id IN (
      SELECT owner_id FROM shared_menus WHERE shared_with_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own fridge items" ON fridge_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fridge items" ON fridge_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fridge items" ON fridge_items
  FOR DELETE USING (auth.uid() = user_id);

-- user_preferences 表 RLS 策略
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- shared_menus 表 RLS 策略
CREATE POLICY "Users can view own shares" ON shared_menus
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can create shares" ON shared_menus
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own shares" ON shared_menus
  FOR DELETE USING (auth.uid() = owner_id);

-- 创建索引提升查询性能
CREATE INDEX idx_fridge_items_user_id ON fridge_items(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_shared_menus_owner_id ON shared_menus(owner_id);
CREATE INDEX idx_shared_menus_shared_with_id ON shared_menus(shared_with_id);
