# 星路工具箱 · PDF 图片工具箱

一个本地优先的 PDF / 图片处理网站。普通文件只在浏览器内处理，不会上传；用户主动切换“后端”后，超大 PDF 才会发送到 Express + Ghostscript 兜底服务。

## 功能

- PDF 转 JPG / PNG / WebP，支持单张下载和浏览器端 JSZip 打包
- 多张图片转 PDF，支持 A4、Letter、原图适配、方向和边距
- 横向、纵向、网格图片拼接，可设间隙、背景色和输出格式
- JPG / PNG / WebP 压缩与质量调整，并保持原始图片尺寸
- PNG / JPG / WebP 批量互转
- 大文件后端兜底；Ghostscript 只负责 PDF 渲染，Sharp 负责图片编码

## 本地开发

要求 Node.js 22+、npm 10+。仅开发前端时不需要安装 Ghostscript。

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。Vite 会把 `/api` 代理到 `http://localhost:3000`。

常用命令：

```bash
npm run typecheck
npm run build
npm start
```

`npm start` 会由 Express 同时提供已经构建的前端和 API，访问 `http://localhost:3000`。

## Docker 部署

Docker 镜像已预装 Ghostscript，且使用只读根文件系统、非 root 用户和独立临时目录。

```bash
docker compose up --build -d
```

访问 `http://localhost:3000`。停止服务：

```bash
docker compose down
```

如需反向代理，请限制请求体大小不低于 `MAX_UPLOAD_MB`，并配置 HTTPS。公网部署建议增加网关层限流与身份验证。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | ---: | --- |
| `PORT` | `3000` | Express 监听端口 |
| `MAX_UPLOAD_MB` | `250` | 后端单个 PDF 上限，代码硬限制在 10–500MB |
| `GS_BIN` | `gs` | Ghostscript 可执行文件名或绝对路径 |
| `RENDER_TIMEOUT_MS` | `300000` | 后端单次渲染超时，限制在 30 秒至 15 分钟 |

## 安全与资源边界

- 前端同时校验扩展名和 MIME；后端额外检查 `%PDF-` 文件签名。
- Ghostscript 使用 `-dSAFER -dBATCH -dNOPAUSE`，且通过参数数组启动，不经过 shell。
- 后端上传落盘到系统临时目录，不把超大文件缓存在 Node 堆中；ZIP 以流式方式返回。
- 临时文件在成功、失败或连接中断后删除；容器 `/tmp` 的默认上限为 2GB。
- PDF 页渲染和图片压缩均按顺序执行；超大 Canvas 会提前拒绝并提示用户。
- 仅支持 PDF、PNG、JPEG、WebP。加密 PDF、损坏文件和内存不足均有友好错误信息。

## 目录结构

```text
client/                 Vue 3 + TypeScript + Vite 前端
  src/components/       通用上传、页面、结果组件
  src/views/            五个独立工具页面
  src/utils/            浏览器 PDF、Canvas、文件函数
server/                 Express 后端兜底
  src/pdf-renderer.ts    Ghostscript + Sharp 渲染链路
Dockerfile              多阶段生产镜像
docker-compose.yml      可直接启动的部署配置
```

Fabric 作为复杂画布扩展依赖保留；当前明确需求的三种规则拼接使用更轻量的原生 Canvas API。
