# WhatToEat 菜单App 开发计划

## 技术栈总览

| 层级    | 技术                      | 说明                                       |
| ------- | ------------------------- | ------------------------------------------ |
| 前端    | React Native + Expo       | 跨平台移动端，Expo 简化开发和打包          |
| 导航    | React Navigation          | App 页面路由导航                           |
| UI 样式 | NativeWind (Tailwind CSS) | 基于 Tailwind CSS 的 React Native 样式方案 |
| 认证    | Supabase Auth             | 邮箱注册登录，免费内置于 Supabase          |
| 后端    | Go + Gin                  | 高性能轻量 Web 框架                        |
| 数据库  | Supabase (PostgreSQL)     | 免费云端数据库，500MB 免费存储             |
| ORM     | GORM + PostgreSQL 驱动    | Go 主流 ORM，简化数据库操作                |

## 项目结构

```
WhatToEat/
├── mobile/                # React Native 前端 (Expo)
│   ├── src/
│   │   ├── screens/       # 页面组件
│   │   ├── components/    # 可复用组件
│   │   ├── services/      # API 调用封装
│   │   ├── contexts/      # AuthContext 等全局状态
│   │   └── navigation/    # 路由配置
│   ├── global.css         # Tailwind 入口样式
│   ├── tailwind.config.js # Tailwind 配置
│   ├── App.js
│   └── package.json
├── server/                # Go 后端
│   ├── main.go            # 入口文件
│   ├── middleware/         # JWT 认证中间件
│   ├── handlers/          # 路由处理函数
│   ├── models/            # 数据模型
│   ├── database/          # 数据库连接与初始化
│   ├── go.mod
│   └── go.sum
```

## Task 1: 初始化 Supabase 项目与数据库

- 在 [supabase.com](https://supabase.com) 注册并创建免费项目
- 获取项目 URL、Anon Key、Service Role Key 和数据库连接字符串
- 开启 Supabase Auth（邮箱注册登录）
- 在 SQL Editor 中创建以下表结构：

```sql
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
```

- 配置 RLS (Row Level Security) 策略，确保用户只能访问自己的数据和被共享的菜单

## Task 2: 搭建 Go 后端 (server/)

1. 初始化 Go 模块：`go mod init whattoeat`
2. 安装依赖：Gin、GORM、PostgreSQL 驱动、CORS 中间件、JWT 库
3. 创建数据模型 (`models/`)：`Dish`、`UserPreference`、`SharedMenu`
4. 创建数据库连接 (`database/db.go`)：连接 Supabase PostgreSQL
5. 创建 JWT 认证中间件 (`middleware/auth.go`)：验证 Supabase 签发的 JWT Token，从 Token 中提取 `user_id`
6. 实现 API 路由：

**认证相关（无需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/auth/register | 注册（调用 Supabase Auth） |
| POST | /api/auth/login | 登录（调用 Supabase Auth） |

**菜品管理（需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/dishes | 获取我的菜品 + 被共享的菜品 |
| POST | /api/dishes | 添加菜品 |
| PUT | /api/dishes/:id | 修改菜品 |
| DELETE | /api/dishes/:id | 删除菜品 |
| PUT | /api/dishes/:id/favorite | 收藏/取消收藏 |

**推荐与偏好（需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/recommend | 根据偏好推荐菜品 |
| GET | /api/preferences | 获取用户偏好 |
| POST | /api/preferences | 设置菜系偏好 |

**共享功能（需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/share | 共享菜单给指定用户（通过邮箱） |
| DELETE | /api/share/:id | 取消共享 |
| GET | /api/shared | 查看我的共享列表 |

7. 推荐逻辑：根据当前用户的 `user_preferences` 菜系权重，从自己的菜品中加权随机推荐

## Task 3: 搭建 React Native 前端 (mobile/)

1. 使用 `npx create-expo-app` 初始化项目
2. 安装依赖：React Navigation、NativeWind v4、`@supabase/supabase-js`、axios
3. 配置 NativeWind：
   - 安装 `nativewind`、`tailwindcss`，生成 `tailwind.config.js`
   - 在 `babel.config.js` 中添加 NativeWind Babel 插件
   - 创建 `global.css` 引入 Tailwind 指令，在 `App.js` 中导入
4. 配置 Supabase 客户端 (`services/supabase.js`)：用于前端认证
5. 实现 AuthContext (`contexts/AuthContext.js`)：管理登录状态，自动刷新 Token
6. 实现页面：
   - **LoginScreen / RegisterScreen** - 登录注册页
   - **HomeScreen** - 首页，推荐菜品卡片列表
   - **DishListScreen** - 我的菜品列表（区分自己的和被共享的）
   - **AddDishScreen** - 添加/编辑菜品表单
   - **PreferenceScreen** - 设置喜欢的菜系偏好
   - **ShareScreen** - 管理共享（添加/取消共享用户）
7. 导航结构：
   - 未登录：LoginScreen / RegisterScreen
   - 已登录：底部 Tab 导航（首页 / 菜单 / 偏好 / 共享）
8. 封装 API 调用层 (`services/api.js`)：axios 拦截器自动附加 JWT Token

## Task 4: 联调与测试

- 启动 Go 后端服务
- 启动 Expo 开发服务器，配置 API 地址指向后端
- 测试注册/登录、菜品增删改查、推荐、共享功能

## Task 5: 打包 APK

- 安装 EAS CLI：`npm install -g eas-cli`
- 配置 `eas.json`：
  ```json
  {
    "build": {
      "preview": {
        "android": { "buildType": "apk" }
      }
    }
  }
  ```
- 执行 `eas build --platform android --profile preview` 生成 APK
- 下载 APK 文件，安装到手机测试

## Task 6: 部署后端到云平台

推荐使用 **Render**（免费套餐）或 **Railway**（每月 $5 免费额度）：

**Render 部署步骤：**

1. 将代码推送到 GitHub 仓库
2. 在 [render.com](https://render.com) 注册并连接 GitHub
3. 创建 Web Service，选择 `server/` 目录
4. 配置环境变量：`DATABASE_URL`（Supabase 连接字符串）、`SUPABASE_URL`、`SUPABASE_KEY`
5. Render 自动检测 Go 项目并构建部署

**Railway 部署步骤：**

1. 在 [railway.app](https://railway.app) 注册并连接 GitHub
2. 新建项目 -> Deploy from GitHub repo
3. 添加环境变量（同上）
4. 自动部署，获得公网 URL

**部署后：**

- 将前端 `services/api.js` 中的 API 地址更新为部署后的公网 URL
- 重新打包 APK（Task 5）
