# moyu V0.2 — 本地 Web 阅读器

日期：2026-10-23
状态：试作，未提交

## 目标

保留终端 TUI，同时增加一个可直接双击启动的本地 Web 阅读器：

- 书架：封面、作者、格式、进度、最近阅读、扫描书库
- 导入：按钮选择或拖拽文件，保存到书库目录，重名自动加序号
- 阅读页：字体/字号/行高/页边距、纸张/夜间/opencode 主题
- 支持 Markdown：标题、列表、引用、代码块、表格、链接，HTML 经 DOMPurify 净化
- 分页 + 滚动两种模式，滑动/淡入/无翻页动画
- 浏览器打开，不依赖终端；deb 安装桌面图标

## 非目标

- 不做 TTS、划线笔记、多设备同步
- 不扩展 MOBI/AZW3
- 不做 3D 仿真翻页
- 不做账号和云服务

## 技术栈

- 后端：Node 25，复用现有 `src/parsers`、`src/core`，零额外运行时框架
- 前端：React 19 + TypeScript + Vite
- 样式：原生 CSS 变量，主题通过 `data-theme` 切换
- 打包：Vite 产物 `web/dist`，与 TUI 一起进 deb

## 目录

```
src/web/
  server.js          # HTTP 服务、API、静态资源
  library.js         # 书库扫描、元数据缓存
  covers.js          # EPUB/PDF 封面
web/
  index.html
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    api.ts
    types.ts
    styles.css
    Bookshelf.tsx
    Reader.tsx
    PagedView.tsx
    ScrollView.tsx
    SettingsPanel.tsx
    TocPanel.tsx
    SearchPanel.tsx
    Cover.tsx
```

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/ping` | 服务存活 |
| GET | `/api/library` | 书库列表（含进度） |
| GET | `/api/books/:id` | 书籍元数据、章节、进度 |
| GET | `/api/books/:id/chapter/:index` | 章节正文与偏移 |
| GET | `/api/books/:id/cover` | 封面图片，404 时前端生成占位 |
| GET | `/api/books/:id/search?q=` | 全文搜索 |
| GET/PUT | `/api/books/:id/progress` | 读取/保存进度 |
| POST | `/api/import?name=` | 导入本地文件，原始 body 写入书库 |
| POST | `/api/books/:id/hide` | 下架，保留本地文件 |
| POST | `/api/books/:id/unhide` | 重新上架 |
| DELETE | `/api/books/:id/file` | 删除书库内的本地文件 |
| POST | `/api/shutdown` | 关闭服务 |

- 只绑定 `127.0.0.1`
- 书籍 ID 复用 `bookKey()`（realpath 的 sha1）
- 解析结果按 mtime 缓存
- 进度沿用 `~/.config/moyu/progress.json`，TUI 和 Web 共享字符偏移

## 导入

- 前端按钮选择或拖拽文件；支持多选
- 只接受 `.txt` / `.epub` / `.pdf` / `.md`，单个文件最大 200MB
- 服务端用文件名 basename 防路径穿越，先写隐藏临时文件再原子改名
- 保存到 `booksDirs[0]`（默认 `~/Documents/Books`），目录不存在时自动创建
- 重名时自动生成 `书名 (1).ext`，不覆盖原文件
- 导入完成后重新扫描书库

## 书架管理

- 下架：把路径写入 `config.json` 的 `hiddenBooks`，扫描时标记隐藏，不删除文件
- 重新上架：从 `hiddenBooks` 移除
- 删除：只允许 `booksDirs` 内的文件，删除原文件、进度和隐藏记录；需要前端二次确认
- 隐藏书籍在 Web 书架通过“显示已下架”恢复；TUI 书架也不会显示隐藏项

## 封面

- EPUB：从 OPF manifest 提取 `cover-image`，失败则用占位
- PDF：`pdftoppm` 渲染第一页，缓存到 `~/.cache/moyu/covers/`
- TXT：前端按书名生成渐变色封面

## 分页

- 分页模式用 CSS 多列：固定页高、列宽 = 页宽，横向溢出形成页
- 页数 = `round((scrollWidth + gap) / (pageWidth + gap))`
- 翻页通过 `translateX` 实现，动画项：`slide` / `fade` / `none`
- 章节切换：最后一页继续下一页进入下一章，第一页向前进入上一章最后一页
- 滚动模式：连续滚动，按滚动比例保存进度

## 阅读设置

- 主题：paper / sepia / green / solarized / night / black / opencode / blue / auto
- 字体：宋体 / 黑体 / 楷体 / 仿宋 / 隶书
- 默认隐藏书名/章节，标签页标题为 `moyu`；按 `t` 切换显示
- 阅读页按 `~` 切换假构建日志，任意键或点击返回
- 字号：16–32；字距、段距、首行缩进、对齐
- 行高：1.4–2.2
- 页边距：0–96
- 模式：分页 / 滚动
- 动画：滑动 / 淡入 / 无

设置存 `localStorage`；进度存服务端。

## 启动

```bash
moyu web              # 启动并打开浏览器
moyu web --no-open    # 只启动，打印 URL
moyu web --port 9000
moyu web moyu://shelf
moyu web moyu://read/<book-id>
```

### PWA

- `web/public/manifest.webmanifest`：standalone、SVG 图标、`protocol_handlers: moyu`
- `web/public/sw.js`：只做 network passthrough，不缓存书库
- `main.tsx` 在生产构建注册 Service Worker
- 安装后 Chrome 可把 moyu 作为独立应用打开，类似 DeepSeek Harness

## moyu:// 协议

- deb 的 desktop 文件注册 `x-scheme-handler/moyu`
- `moyu://shelf` 打开书架
- `moyu://read/<40 位 id>`、`moyu://book/<id>` 打开指定书
- Web 设置面板提供“复制 moyu:// 链接”
- 浏览器会显示“打开方式”确认框；这是外部协议，不是浏览器扩展

- 重复执行检测 `~/.cache/moyu/web.json`，复用已有服务，只打开浏览器
- deb 安装 `moyu.desktop`，`Terminal=false`，双击即可
- 设置面板提供“关闭服务”

## 验收

1. 双击桌面图标能在浏览器打开书架
2. EPUB 有封面；TXT/PDF 有占位封面
3. 书架显示书名、作者、格式、进度，能继续阅读
4. 分页模式按视口分页，左右键、空格、点击左右区域可翻页
5. 切换字体、字号、行高、边距后重新分页且位置不丢
6. 各主题正常，字体/字距/段距/缩进/对齐生效
7. 目录、搜索可跳转
8. 按钮或拖拽能导入 TXT/EPUB/PDF/Markdown，重名不覆盖
9. 关闭服务后浏览器断开，进程退出
10. TUI 仍可正常使用，进度与 Web 共享
