# Sync Player

Sync Player 是一个基于 Web 的实时在线视频同步播放器，允许多个用户在不同设备上同步观看视频内容。

## 主要功能

- 多用户实时同步播放进度
- 房间系统支持多个独立的播放组
- 可自定义播放列表
- 支持视频播放控制（播放、暂停、进度调整等）

## 使用docker运行

```bash
docker pull ghcr.io/happy-game/sync-player

docker run -d \
--name sync-player \
-p 3000:3000 \
-v sync-player:/app/server/data \
ghcr.io/happy-game/sync-player

# 唯一需要持久化存储的数据就是sqlite文件，如果你修改了环境变量请修改 `-v`的参数
```
可以通过修改环境变量修改配置，具体请参照 [player](/player/.env.example)和 [server](/server/.env.example)

## 手动构建运行

### 后端服务器

1. 克隆仓库并安装依赖

```bash
git clone https://github.com/happy-game/sync-player.git
cd sync-player/server
npm install
```

2. 复制 .env.example 文件为 .env，并根据需要修改配置：

```bash
cp .env.example .env
```

3. 构建并启动服务器

```bash
npm run build
npm start
```
服务器将运行在 http://localhost:3000, 如需更换端口或其他配置请修改环境变量或者`.env`

### 前端

1. 进入player目录并安装依赖

```bash
cd ../player
npm install
```

2. 复制 .env.example 文件为 .env，并根据需要修改配置：

```bash
cp .env.example .env
```

3. 运行

```bash
npm run dev
```

4. 使用静态页面服务器 (可选)

```bash
npm run build
```

这样会生成一个`dist`目录，将该目录复制到静态页面服务器托管即可, 如 `nginx` 可复制到`/usr/share/nginx/html`.

<!-- ## 使用 docker 运行

1. 确保已安装 Docker 和 Docker Compose.

2. 在[docker-compose.yml](/docker-compose.yml)中修改必要的环境变量

3. 在项目根目录下，使用以下命令构建并启动所有服务：

```bash
docker-compose up --build
``` -->

## 使用 nginx 代理后端

添加以下配置:
```
location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket 支持
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
## 许可证

本项目使用 [MIT](/LICENSE) 许可证发布.