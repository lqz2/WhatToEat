-- WhatToEat 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 菜品表（关联用户）
CREATE TABLE dishes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  cuisine VARCHAR(50) NOT NULL,
  description TEXT,
  tags TEXT[],
  image_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
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
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_menus ENABLE ROW LEVEL SECURITY;

-- dishes 表 RLS 策略：用户可以访问自己的菜品和被共享给自己的菜品
CREATE POLICY "Users can view own dishes" ON dishes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared dishes" ON dishes
  FOR SELECT USING (
    user_id IN (
      SELECT owner_id FROM shared_menus WHERE shared_with_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own dishes" ON dishes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dishes" ON dishes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dishes" ON dishes
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
CREATE INDEX idx_dishes_user_id ON dishes(user_id);
CREATE INDEX idx_dishes_cuisine ON dishes(cuisine);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_shared_menus_owner_id ON shared_menus(owner_id);
CREATE INDEX idx_shared_menus_shared_with_id ON shared_menus(shared_with_id);
