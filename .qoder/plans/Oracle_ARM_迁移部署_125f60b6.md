# Oracle Cloud ARM 迁移部署方案

## 当前状况

| 项目 | 架构 | 当前部署 | 域名 |
|------|------|---------|------|
| WhatToEat | Go + SQLite | CloudCone VPS (amd64) + GitHub Actions | eat.13129988.xyz |
| case-converter | Vite + Tailwind 静态站 | CloudCone VPS + GitHub Actions SCP | tools.13129988.xyz |

## 关键变更点

- Oracle ARM 实例是 **arm64 架构**，当前 GitHub Actions 构建的是 amd64 二进制，必须修改
- Ubuntu 防火墙用 `iptables`/`ufw`，和 CloudCone 的 Debian/CentOS 类似
- SSL 证书需要在新实例重新申请（Let's Encrypt）

---

## Task 1: Oracle 实例环境搭建

SSH 登录 Oracle 实例后执行：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Nginx, Certbot, rclone
apt install -y nginx certbot python3-certbot-nginx

# 安装 rclone (备份用)
curl https://rclone.org/install.sh | sudo bash

# 创建项目目录
mkdir -p /var/www/whattoeat
mkdir -p /var/www/case-converter
mkdir -p /home/ubuntu/whattoeat_data
```

检查 Oracle 防火墙（iptables 层）：
```bash
# Oracle Ubuntu 默认可能有 iptables 规则阻止流量，开放 80 和 443
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save
```

---

## Task 2: 修改 GitHub Actions 适配 ARM64

修改 `WhatToEat/.github/workflows/deploy.yml`：

```yaml
# 将构建命令从 amd64 改为 arm64
GOOS=linux GOARCH=arm64 go build -o whattoeat-server main.go
```

同时更新 SSH 连接的目标服务器为 Oracle 实例的 IP 和密钥（通过 GitHub Secrets）。

修改 `Tool/case-converter/.github/workflows/deploy.yml`：

```yaml
# 将 target 保持不变，但更新 SSH 连接信息为 Oracle 实例
```

---

## Task 3: 更新 GitHub Secrets

在两个仓库的 GitHub Settings > Secrets 中更新：

| Secret | 新值 |
|--------|------|
| VPS_HOST / VPS_IP | Oracle 实例公网 IP |
| VPS_USER / VPS_USERNAME | ubuntu (Oracle 默认用户) |
| VPS_SSH_KEY | Oracle 实例的 SSH 私钥 |

---

## Task 4: 迁移 SQLite 数据库

在 Oracle 实例上执行（从 CloudCone VPS 拉取）：

```bash
# 从旧 VPS 复制数据库
scp root@旧VPS_IP:/home/lqzz/whattoeat_data/whattoeat.db /home/ubuntu/whattoeat_data/

# 复制 .env 配置
scp root@旧VPS_IP:/var/www/whattoeat/.env /var/www/whattoeat/
```

或者从 R2 备份恢复（如果之前已经备份到 R2）：

```bash
rclone copy r2:vpsbackup/whattoeat/db/whattoeat.db /home/ubuntu/whattoeat_data/
rclone copy r2:vpsbackup/whattoeat/config/.env /var/www/whattoeat/
```

---

## Task 5: 配置 Nginx 站点

在 Oracle 实例上创建 Nginx 配置：

`/etc/nginx/sites-available/whattoeat.conf`：
```nginx
server {
    listen 80;
    server_name eat.13129988.xyz;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

`/etc/nginx/sites-available/case-converter.conf`：
```nginx
server {
    listen 80;
    server_name tools.13129988.xyz;
    root /var/www/case-converter;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用站点：
```bash
ln -s /etc/nginx/sites-available/whattoeat.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/case-converter.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Task 6: 配置 SSL 证书

先确保 DNS 已指向 Oracle IP（Task 7），然后：

```bash
certbot --nginx -d eat.13129988.xyz -d tools.13129988.xyz
```

Certbot 会自动修改 Nginx 配置并设置自动续签。

---

## Task 7: DNS 切换

在域名注册商/DNS 管理面板中：

| 记录 | 旧值 (CloudCone IP) | 新值 (Oracle IP) |
|------|---------------------|------------------|
| eat.13129988.xyz (A) | 旧 IP | Oracle 公网 IP |
| tools.13129988.xyz (A) | 旧 IP | Oracle 公网 IP |

等待 DNS 生效后（通常几分钟），再执行 Task 6 申请 SSL。

---

## Task 8: 创建 systemd 服务

`/etc/systemd/system/whattoeat.service`：

```ini
[Unit]
Description=WhatToEat API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/whattoeat
ExecStart=/var/www/whattoeat/whattoeat-server
Restart=always
RestartSec=5
Environment=DATABASE_PATH=/home/ubuntu/whattoeat_data/whattoeat.db

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable whattoeat
systemctl start whattoeat
```

---

## Task 9: 配置备份

1. 在 Oracle 实例上配置 rclone 连接 R2（同之前的步骤）
2. 创建 backup.sh 脚本（路径需调整为 ubuntu 用户）
3. 设置 crontab 定时任务

---

## Task 10: 触发部署并验证

1. 推送代码变更（修改后的 deploy.yml）到 GitHub，触发 Actions
2. 验证 WhatToEat API：`curl https://eat.13129988.xyz/health`
3. 验证 case-converter：浏览器访问 `https://tools.13129988.xyz`
4. 测试 App 登录和基本功能

---

## 执行顺序

Task 1 (环境搭建) -> Task 2+3 (改 Actions + Secrets) -> Task 4 (迁移数据) -> Task 5+8 (Nginx + systemd) -> Task 7 (DNS 切换) -> Task 6 (SSL) -> Task 9 (备份) -> Task 10 (验证)
