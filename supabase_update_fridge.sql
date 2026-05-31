-- WhatToEat 数据库更新脚本：冰箱食材版
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 删除旧的菜品相关的策略和表（如果存在）
DROP POLICY IF EXISTS "Users can view own dishes" ON dishes;
DROP POLICY IF EXISTS "Users can view shared dishes" ON dishes;
DROP POLICY IF EXISTS "Users can insert own dishes" ON dishes;
DROP POLICY IF EXISTS "Users can update own dishes" ON dishes;
DROP POLICY IF EXISTS "Users can delete own dishes" ON dishes;
DROP TABLE IF EXISTS dishes;

-- 2. 创建冰箱食材表
CREATE TABLE fridge_items (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  quantity VARCHAR(50), -- 例如 "2个" 或 "500g"
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 启用 RLS
ALTER TABLE fridge_items ENABLE ROW LEVEL SECURITY;

-- 4. 配置 fridge_items 的 RLS 策略
-- 策略：用户可以访问自己的食材和被共享给自己的冰箱食材
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

-- 5. 索引优化
CREATE INDEX idx_fridge_items_user_id ON fridge_items(user_id);

-- 注：user_preferences 和 shared_menus 表结构保持不变，可以复用。
