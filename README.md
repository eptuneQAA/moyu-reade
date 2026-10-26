# moyu

本地小说阅读器，支持 TXT / EPUB / PDF / Markdown。提供终端 TUI 和浏览器 Web 两个界面：

- **TUI**：适合在终端里低调阅读，支持一键伪装
- **Web**：封面书架、字体排版、分页/滚动、翻页动画，可双击桌面图标启动，不需要终端

## 功能

- TXT / EPUB / PDF / Markdown 本地阅读，UTF-8、GBK、UTF-16 自动识别
- 章节识别、目录跳转、全文搜索、阅读进度自动续读
- 终端 Kindle 风格版式：页眉、段首缩进、页码、细进度条
- Web 书架：封面、作者、格式、进度、最近阅读、扫描书库
- Web 导入：按钮选择或拖拽文件，保存到书库目录，重名自动改名
- 书架管理：区分「下架（保留文件）」和「删除本地文件」，删除需二次确认
- `moyu://` 协议 + PWA：可安装成 Chrome 应用，浏览器“打开方式”直接打开书架或指定书
- Web 阅读器：字体、字号、行高、页边距、分页/滚动、滑动/淡入翻页
- 主题：纸张、羊皮纸、护眼绿、日光、夜间、纯黑、opencode、雾蓝、跟随系统
- TUI 和 Web 共享阅读进度（字符偏移）
- 纯本地运行，不联网、不下载内容

## 环境要求

- Node.js **22 或更高版本**（推荐用 nvm 安装）
- PDF 阅读需要 `pdftotext`：`sudo apt install poppler-utils`
- Web 版打开浏览器需要 `xdg-utils`（桌面系统通常已安装）
- 终端需要支持 UTF-8；显示彩色主题建议支持 truecolor

## 安装

### Debian / UOS

下载 `moyu_0.2.0_all.deb` 后：

```bash
sudo dpkg -i moyu_0.2.0_all.deb
moyu --version
```

安装后应用菜单里会出现 **moyu 阅读器**，双击即可启动 Web 版。

如果 Node.js 是通过 nvm 安装的，`moyu` 会自动在 `~/.config/nvm` 和 `~/.nvm` 下寻找 22+ 的版本。

### 从源码

```bash
git clone <your-repo-url> moyu-reader
cd moyu-reader
npm ci
npm run build:all
npm link          # 之后可以直接运行 moyu
```

`npm run build:all` 会生成 TUI bundle 和 Web 静态资源。不想全局安装时也可以直接运行：

```bash
node dist/moyu.bundle.js ~/Downloads/某本书.txt
node dist/moyu.bundle.js web --no-open
```

## 使用

```bash
moyu                              # 打开终端书架，扫描 ~/Documents/Books 和 ~/Downloads
moyu ~/Downloads/某本书.txt        # 直接打开文件
moyu web                          # 启动本地 Web 阅读器并打开浏览器
moyu web --no-open                # 只启动服务，打印地址
moyu web --port 9000              # 指定端口
moyu -l                           # 强制打开终端书架
moyu --no-resume <文件>            # 从头开始读
moyu --debug <文件>                # 输出错误堆栈
```

## Web 阅读器

- 书架：封面网格、书名/作者/格式、阅读进度、最近阅读、重新扫描
- 导入：点“导入文件”选择 TXT/EPUB/PDF/Markdown，或直接拖进页面；保存到第一个书库目录，重名自动加 `(1)`
- Markdown：标题、列表、引用、代码块、表格、链接；HTML 会经过净化后渲染
- 阅读：宋体/黑体/楷体/仿宋/隶书，16–32px 字号、1.2–2.4 行高、0–0.2em 字距、0.2–1.6em 段距、0–4em 首行缩进、0–120px 页边距、两端/左对齐
- 模式：分页或滚动；翻页动画：滑动、淡入、无
- 主题：纸张、羊皮纸、护眼绿、日光、夜间、纯黑、opencode、雾蓝、跟随系统
- 书架管理：每本书右上角 ⋯，支持下架/上架和删除本地文件
- 目录、全文搜索、键盘方向键/空格、点击左右区域、触屏滑动
- 默认隐藏书名和章节，浏览器标签显示 `moyu`；按 `t` 显示/隐藏
- 阅读页按 `~` 切到假构建日志，任意键或点击返回
- 进度与 TUI 共用 `progress.json`，字符偏移级续读
- 设置面板底部可以关闭本地服务

Web 设置保存在浏览器 `localStorage`，书库目录沿用 `~/.config/moyu/config.json`。导入的单个文件最大 200MB。

书架管理：

- **下架（保留本地文件）**：只从书架隐藏，文件仍在原目录；可用“显示已下架”恢复
- **删除本地文件**：永久删除原文件并清除阅读进度，需要二次确认；只允许删除书库目录内的文件

## 安装成 Chrome 应用（PWA）

moyu 自带 Web App Manifest 和 Service Worker。用 Chrome 打开 `http://127.0.0.1:8787/` 后：

- 点地址栏的安装图标，或 Chrome 菜单 →“安装页面为应用”
- 安装后会像 DeepSeek Harness 一样在独立窗口打开，没有浏览器地址栏
- Chrome 支持时，`moyu://` 链接也会由这个应用处理

PWA 只做网络透传，不缓存书库内容；使用前需要先启动 `moyu web` 或从应用菜单启动。

## moyu:// 链接协议

deb 安装后会自动注册 `moyu://` 协议。浏览器打开这类链接时会弹出“打开方式”，选择 **moyu 阅读器** 即可。如果浏览器没有弹出，执行：

```bash
xdg-mime default moyu.desktop x-scheme-handler/moyu
update-desktop-database
```

```text
moyu://shelf
moyu://read/<book-id>
```

`<book-id>` 可以从 Web 阅读器地址栏的 `#/read/<book-id>` 复制，也可以在阅读设置里点 **复制 moyu:// 链接**；安装 PWA 后由浏览器处理这个协议。

源码运行且没有安装 deb 时，需要手动注册桌面文件，并确保 `moyu` 在 PATH 中：

```bash
mkdir -p ~/.local/share/applications
cp debian/moyu.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications
xdg-mime default moyu.desktop x-scheme-handler/moyu
```

## 终端快捷键

| 按键 | 功能 |
| --- | --- |
| `空格` / `PageDown` / `f` / `↓` | 下一页 |
| `b` / `PageUp` / `↑` | 上一页 |
| `j` / `k` | 下 / 上滚动一行 |
| `d` / `u` | 下 / 上半页 |
| `n` / `p` | 下一章 / 上一章 |
| `g` | 目录 |
| `/` | 全文搜索 |
| `s` | 书架 |
| `S` 或 `,` | 设置 |
| `a` | 自动翻页开关 |
| `+` / `-` | 自动翻页间隔 -/+ 5 秒 |
| `[` / `]` | 每行字数 -/+ 10 列 |
| `{` / `}` | 每页行数 -/+ 1 |
| `t` | 显示 / 隐藏页眉 |
| `h` | 显示 / 隐藏快捷键提示 |
| `~` | 伪装界面 |
| `?` | 帮助 |
| `q` | 退出 |

终端字体和字号由终端模拟器控制；Web 版可以直接在设置里调整。Markdown 在 TUI 中去掉标记按纯文本显示，在 Web 中保留排版渲染。

## 配置

- 配置：`~/.config/moyu/config.json`
- 进度：`~/.config/moyu/progress.json`
- 默认书架目录：`~/Documents/Books`、`~/Downloads`

```json
{
  "charsPerLine": 72,
  "linesPerPage": 0,
  "autoPageSeconds": 30,
  "booksDirs": ["~/Documents/Books", "~/Downloads"],
  "showChapterTitle": true,
  "showFooter": true,
  "theme": "paper"
}
```

`theme` 可选 `paper`、`night`、`opencode`。`linesPerPage` 为 `0` 时按终端高度自适应。

## 打包 deb

```bash
npm ci
./scripts/build-deb.sh
```

产物：`release/moyu_0.2.0_all.deb` 和 `release/SHA256SUMS`。

打包脚本会运行测试，生成 `dist/moyu.bundle.js` 和 `web/dist`，然后调用 `dpkg-buildpackage`。需要安装 `debhelper`、`dpkg-dev`、`fakeroot`。

推送 `v` 开头的 tag 会触发 GitHub Actions 自动构建 deb 并创建 Release：

```bash
git tag v0.2.0
git push origin v0.2.0
```

## 开发

```bash
npm install
npm test
npm run dev -- ~/Downloads/某本书.txt

# Web 开发：两个终端分别运行
npm run dev:api
npm run dev:web
```

结构：

- `src/parsers/`：TXT / EPUB / PDF / Markdown 解析
- `src/core/`：分页、书籍模型、书架、配置与进度
- `src/ui/`：终端 Ink 界面
- `src/web/`：本地 Web 服务、封面、书库 API
- `web/`：React + TypeScript + Vite 前端
- `debian/`：Debian 打包文件

## 文档

- `docs/design.md`：整体设计
- `docs/kindle-style.md`：终端阅读界面和主题设计
- `docs/web-reader.md`：Web 阅读器设计

## 说明

- 只读取本地文件，不提供任何在线抓取或下载功能
- 扫描版 PDF 没有文字层，暂不支持 OCR
- TXT 非 UTF-8 编码时按 GB18030 解码
- 终端字体、字号、缩放由终端模拟器管理

## License

MIT
