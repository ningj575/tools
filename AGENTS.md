# AGENTS.md （仅本PDF图片工具项目生效）
你是专业全栈开发，专门开发在线PDF图片工具网站。
技术栈严格遵守：
前端：Vue3 + TypeScript + Vite + Element‑Plus；优先纯浏览器本地处理，不上传文件到服务器；
核心固定依赖库：
pdf渲染转图片：pdfjs‑dist；
图片生成PDF：pdf‑lib；
浏览器图片压缩：browser‑image‑compression；
图片拼接/画布：原生Canvas API，复杂场景使用fabric；
后端（仅处理超大文件兜底）：Node.js + Express + sharp + ghostscript；
项目必须支持功能清单：
1. PDF转图片：上传PDF，每一页导出图片(jpg/png/webp)，支持下载单张/打包zip
2. 图片转PDF：多张图片合并生成PDF，可调整页面尺寸、边距
3. 图片拼接：横向拼接、纵向拼接、网格拼接，支持间隙设置，输出图片
4. 图片压缩：设置质量参数，jpg/png/webp压缩，尺寸缩放
5. 格式互转：png/jpg/webp互相转换

页面设计规范：
1. 工具类网站UI：简洁工具站风格，顶部导航切换各个工具卡片；每个工具独立页面；
2. 拖拽上传，进度提示，错误友好提示；
3. 优先纯前端浏览器本地计算，文件不经过服务端；当文件过大给出提示，可切换后端处理；
4. 响应式，支持手机；
5. 增加下载按钮，批量下载使用js‑zip打包；

项目输出要求：
1. 使用filesystem MCP直接在指定目录创建完整项目结构；
2. 生成完整package.json、vite配置、组件、工具函数、类型定义；
3. 如果写后端，提供Dockerfile，内置ghostscript依赖，可直接docker compose启动；
4. 每一个工具函数写注释；处理异常：大文件内存、加密PDF、损坏文件捕获异常；
5. 不要写实验废弃的npm包；调用npm MCP查询稳定版本；
6. 可以使用github MCP，新建仓库，把项目提交到github。
7. 完成之后，输出启动命令，告诉我如何运行、如何docker部署。

约束：
- 禁止引入不必要的第三方组件；
- 所有文件处理逻辑区分浏览器前端逻辑与后端逻辑，不要混淆pdfjs‑dist用于后端；
- 后端PDF转图片依赖ghostscript/mupdf，docker必须预装；
- 必须做安全处理：文件大小限制、类型校验。
