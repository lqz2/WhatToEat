# WhatToEat 菜单App 开发计划

## 技术栈总览

| 层级    | 技术                      | 说明                                                |
| ------- | ------------------------- | --------------------------------------------------- |
| 前端    | React Native + Expo       | 跨平台移动端，Expo 简化开发和打包                   |
| 导航    | React Navigation          | App 页面路由导航                                    |
| UI 样式 | NativeWind (Tailwind CSS) | 基于 Tailwind CSS 的 React Native 样式方案          |
| 认证    | 自建 JWT (Legacy Secret)  | 模拟账号模式 (username@whattoeat.com)，后端自签 JWT |
| 后端    | Go + Gin                  | 高性能轻量 Web 框架                                 |
| 数据库  | SQLite                    | 本地文件数据库，轻量无需外部服务                    |
| LLM API | Gemini API                | Google Gemini 2.0 Flash，通过 GEMINI_API_KEY 调用   |
| ORM     | GORM + SQLite 驱动        | Go 主流 ORM，简化数据库操作                         |

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

## Task 1: 数据库设计与 SQLite 初始化

- 使用 SQLite 作为本地数据库（文件路径：`database/whattoeat.db`，可通过 `DATABASE_PATH` 环境变量覆盖）
- GORM 自动迁移创建以下表结构：

```
users: id, username, email, password_hash, created_at
fridge_items: id, user_id, name, quantity, created_at
user_preferences: id, user_id, cuisine, weight, created_at
shared_menus: id, owner_id, shared_with_id, created_at
```

- 启用外键约束（`foreign_keys(1)`）和 busy_timeout（`5000ms`）防止并发锁表
- 连接池设置：`MaxOpenConns=1` 避免 SQLite 并发写锁冲突

## Task 2: 搭建 Go 后端 (server/)

1. 初始化 Go 模块：`go mod init whattoeat`
2. 安装依赖：Gin、GORM、SQLite 驱动、HTTP 客户端（调用 Gemini API）
3. 创建数据模型 (`models/`)：`User`、`FridgeItem`、`UserPreference`、`SharedMenu`
4. 创建数据库连接 (`database/db.go`)：连接本地 SQLite，自动迁移建表
5. 创建 JWT 认证中间件 (`middleware/auth.go`)：使用 Legacy JWT Secret 验证自签 JWT Token
6. 实现 API 路由：

**认证相关（无需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/auth/register | 注册（模拟账号） |
| POST | /api/auth/login | 登录（模拟账号） |

**冰箱食材管理（需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/fridge | 获取我及被共享的冰箱食材 |
| POST | /api/fridge | 添加食材 |
| DELETE | /api/fridge/:id | 删除/消耗食材 |

**推荐与偏好（需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/recommend | 调用 Gemini API，根据冰箱食材和偏好推荐菜谱 |
| GET | /api/preferences | 获取用户偏好 |
| POST | /api/preferences | 设置菜系偏好 |

**共享功能（需 Token）：**
| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/share | 共享冰箱给指定用户（通过账号名） |
| DELETE | /api/share/:id | 取消共享 |
| GET | /api/shared | 查看我的共享列表 |

7. LLM 推荐逻辑：
   - 从数据库获取用户的 `fridge_items` 列表。
   - 获取用户的 `user_preferences`。
   - 构造 Prompt："我有这些食材：[食材列表]，我喜欢[偏好]口味，请推荐3道菜并给出简易做法。"
   - 通过 **Gemini API** 调用 `gemini-2.0-flash` 模型，强制 JSON 输出（配置 `responseSchema`）。
   - 解析 JSON 结果返回给前端。

## Task 3: 搭建 React Native 前端 (mobile/)

1. 使用 `npx create-expo-app` 初始化项目
2. 安装依赖：React Navigation、NativeWind v4、axios
3. 配置 NativeWind：
   - 适配 Web 和移动端，配置 `global.css`。
4. 封装 API 服务 (`services/api.js`)
5. 实现 AuthContext (`contexts/AuthContext.js`)：支持账号名自动补全后缀。
6. 实现页面：
   - **LoginScreen / RegisterScreen** - 登录注册页
   - **HomeScreen** - 首页，点击“生成推荐”按钮后展现 LLM 推荐的菜谱及做法。
   - **FridgeScreen** - 我的冰箱，列表展示食材。
   - **AddFridgeItemScreen** - 添加食材页面。
   - **PreferenceScreen** - 设置喜欢的菜系偏好。
   - **ShareScreen** - 管理共享。
7. 导航结构：
   - 未登录：LoginScreen / RegisterScreen
   - 已登录：底部 Tab 导航（首页 / 冰箱 / 偏好 / 共享）
8. 封装 API 调用层 (`services/api.js`)：axios 拦截器增加 ActivityIndicator 加载反馈。

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

推荐使用 **VPS + GitHub Actions** 自部署（当前方案）：

**部署流程：**

1. 代码推送到 GitHub `main` 分支
2. GitHub Actions 自动构建 Go 二进制（`GOOS=linux GOARCH=amd64`）
3. 通过 SSH 将二进制文件部署到 VPS `/var/www/whattoeat/`
4. 重启 systemd 服务 `whattoeat`

**VPS 环境要求：**

- Linux 系统（amd64 架构）
- 配置 systemd 服务单元 `/etc/systemd/system/whattoeat.service`
- 环境变量：`GEMINI_API_KEY`、`JWT_SECRET`（Legacy JWT Secret）、`LLM_MODEL`

**数据备份（Cloudflare R2）：**

- 源码在 GitHub，无需备份
- 只需备份：`whattoeat.db`（SQLite 数据库文件）+ `.env` 配置 + systemd service 文件
- 使用 rclone 定期同步到 R2 存储桶（WNAM 美西区域）

**部署后：**

- 将前端 `services/api.js` 中的 API 地址更新为 VPS 公网域名
- 重新打包 APK（Task 5）
