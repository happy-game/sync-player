# Sync Player

[简体中文](/README.md) [English](/README.en.md)

Sync Player is a web-based real-time online video synchronization player that allows multiple users to synchronously watch video content on different devices. Changes in the playback progress and pausing of the video by users in the same room will be synchronized to others.

This project does not provide any video sources. You can refer to the [Video Source Acquisition](#Video Source Acquisition) section to obtain source to videos.

You can visit the [demo site](https://player.ccnu.work) to experience its functions.

**!!! Note: Currently, this project has no security protection measures in place. Please pay attention to your information security**

## Main Features

- Real-time synchronization of playback progress among multiple users.
- The room system supports multiple independent playback groups.
- Customizable playlists.
- Support for video playback control (play, pause, progress adjustment, etc.).

## Running with Docker (Recommended)

```bash
docker pull ghcr.io/happy-game/sync-player

docker run -d \
--name sync-player \
-p 3000:3000 \
-v sync-player:/app/server/data \
ghcr.io/happy-game/sync-player

# The only data that needs to be persisted is the sqlite file. If you modify the environment variables, please modify the parameters of `-v`.
```

You can modify the configuration by changing the environment variables. For details, please refer to [player](/player/.env.example) and [server](/server/.env.example).

## Manual Build and Run

### Backend

1. Clone the repository and install dependencies

```bash
git clone https://github.com/happy-game/sync-player.git
cd sync-player/server
npm install
```

2. Copy the `.env.example` file to `.env` and modify the configuration as needed:

```bash
cp .env.example .env
```

3. Build and start the server

```bash
npm run build
npm start
```

The server will run on http://localhost:3000. If you need to change the port or other configurations, please modify the environment variables or `.env`.

### Front End

1. Enter the player directory and install dependencies

```bash
cd ../player
npm install
```

2. Copy the `.env.example` file to `.env` and modify the configuration as needed:

```bash
cp .env.example .env
```

3. Run

```bash
npm run dev
```

4. Use a static page server (optional)

```bash
npm run build
```

This will generate a `dist` directory. You can copy this directory to a static page server for hosting. For example, for `nginx`, you can copy it to `/usr/share/nginx/html`.


## Using nginx to Proxy the Back End

Add the following configuration:
```
location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Video Source Acquisition

| Method                                        | Cost                                                         | Speed                           | Complexity | Recommendation Level | Description                                                  |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------- | ---------- | -------------------- | ------------------------------------------------------------ |
| Alibaba Cloud (or other cloud) Object Storage | Traffic at 0.5 yuan/GB                                       | Very fast                       | Simple     | 1                    | Generally, the cost of object storage is quite high. Watching a movie might make you owe Alibaba a house. |
| Cloudflare R2                                 | 10GB storage is free, and 0.015 dollars/GB/month after exceeding | Fast                            | Medium     | 5                    | The video playback speed is fast, but the space is small and you need to  delete while watching. Moreover, large files can only be uploaded via  API, and a domain name binding is also required. |
| Cloud Server                                  | Varies depending on your choice                              | Varies depending on your choice | Medium     | 3                    | It's best to use overseas servers, which are cheap and have large bandwidth. Since all traffic goes through the server bandwidth, the concurrency is poor. |
| Using Local Files                             | 0                                                            | Very fast                       | Simple     | 5                    | The drawback is that everyone needs to have downloaded the video. |
| Converting Network Disk Video to Direct Link  | 0                                                            | Depends on the network disk     | High       | 1                    | You can refer to other projects for converting network disk videos to direct links. |
| Video Resource Websites                       | 0                                                            | -                               | Medium     | 1                    | It doesn't seem very ethical to steal others' videos.        |

## Open Source Projects Used

1. Used [vue3](https://github.com/vuejs/core) to write the front-end pages.
2. Used [tailwindcss](https://github.com/tailwindlabs/tailwindcss) to handle styles.
3. Used [shadcn](https://ui.shadcn.com/) as the component library.
4. Used [video.js](https://github.com/videojs/video.js) as the video player.
5. Used [express](https://github.com/expressjs/express) to write the back-end services.
6. Used [sequelize](https://github.com/sequelize/sequelize) to handle database connections.

## License

This project is released under the [MIT](/LICENSE) license.
