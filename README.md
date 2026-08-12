# WallCraft

WallCraft 是一个桌面与移动端高清壁纸浏览、筛选和下载站点。

- 在线地址：[wallpaper.gpb.cc](https://wallpaper.gpb.cc/)
- React 19 + TypeScript + Vite
- Cloudflare Pages 与 Pages Functions
- 匿名产品埋点接入现有 SQLite 遥测服务

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

登录 Wrangler 后部署到现有 Cloudflare Pages 项目：

```bash
npm run deploy
```

生产环境中的页面访问、壁纸详情查看与成功下载事件会匿名上报到产品统计服务。埋点不采集搜索内容或个人信息。

本地凭据、缓存壁纸、构建产物和 NAS 运维脚本不会进入仓库。
