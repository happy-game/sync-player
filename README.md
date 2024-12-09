# Sync Player

[简体中文](/README.md) [English](/README.en.md)

Sync Player 是一个基于 Web 的实时在线视频同步播放器，允许多个用户在不同设备上同步观看视频内容, 位于同一房间的用户的播放进度变更、暂停视频都会同步给其他人。

本项目不提供任何视频源, 可以参照[视频源获取](#视频源获取)一节获取视频直链.

可以访问[演示站点](https://player.ccnu.work)体验功能。

**!!!注意: 目前本项目未做任何安全性防护, 请注意你的信息安全.**

## 主要功能

- 多用户实时同步播放进度
- 房间系统支持多个独立的播放组
- 可自定义播放列表
- 支持视频播放控制（播放、暂停、进度调整等）

## 使用docker运行(推荐)

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

## 视频源获取 

| 方法         | 成本   | 速度   | 复杂程度 | 推荐程度 | 说明                                                         |
|--------------|--------|--------|----------|----------|--------------------------------------------------------------|
| 阿里云(或其他云)对象存储| 流量 0.5 ￥/GB |嘎嘎快 | 简单 | 1  | 一般的对象存储成本都很高, 看一场电影下来欠阿里一套房.|
| cloudflare R2| 10GB存储免费,超出后0.015 $/GB/每月   | 快 | 中等 | 5 | 播放视频速度很快, 但是空间较小需要边看边删, 且大文件只能通过api上传, 还需要有一个域名绑定.|
| 云服务器| 丰俭由人| 丰俭由人| 中等| 3   | 最好用境外服务器，便宜且带宽大. 由于都走服务器带宽, 所有并发较差. |
| 使用本地文件| 0 | 嘎嘎快   | 简单     | 5     | 缺点是需要所有人都下载了视频. |
| 网盘视频转直链| 0   | 看网盘 | 高     | 1     | 可以参考一下别的网盘转直链的项目|
| 视频资源网站 | 0 | - | 中等 | 1 | 感觉偷别人的视频不太道德 |

以上各种方法可以混合使用, 本项目支持为同一个视频指定不同的源, 各个用户可以自行切换.

如果有其他方法欢迎补充.

## 使用的开源项目

1. 使用了[vue3](https://github.com/vuejs/core)编写前端页面
2. 使用了[tailwindcss](https://github.com/tailwindlabs/tailwindcss)处理样式
3. 使用了[shadcn](https://ui.shadcn.com/)作为组件库
4. 使用了[video.js](https://github.com/videojs/video.js)作为视频播放器
5. 使用了[express](https://github.com/expressjs/express)编写后端服务
6. 使用了[sequelize](https://github.com/sequelize/sequelize)处理数据库连接

## 许可证

本项目使用 [MIT](/LICENSE) 许可证发布.