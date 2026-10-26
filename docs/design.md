# moyu 终端阅读器 — 设计文档

日期：2026-10-23

> 2026-10-23 更新：阅读界面已改为 Kindle 风格（纸张/夜间主题、默认 72 列、页眉 + 页码 + 细进度条），详见 `docs/kindle-style.md`。本文第 6、8 节中旧状态栏/页脚描述以新文档为准。
项目路径：`~/code/moyu-reader`
命令名：`moyu`

## 1. 目标

一个本地终端小说阅读器，支持 TXT / EPUB / PDF，适合在工作间隙低调阅读。

核心目标：

- 本地文件阅读，不做任何在线抓取、下载、DRM 绕过
- 章节导航、全文搜索、进度记忆、自动翻页
- 可调阅读密度（每行字数、每页行数）
- `~` 一键切换到伪装界面

非目标：

- 不支持扫描版 PDF 的 OCR
- 不做书签、云同步、多设备同步
- 不做 GUI 窗口
- 不访问网络

## 2. 技术选型

- 运行时：Node.js 25（本机已装），项目使用 ESM（`"type": "module"`）
- TUI：Ink 8 + React 19.3+
- 依赖：`ink`、`react`、`adm-zip`（EPUB 解包）、`iconv-lite`（GBK/GB18030 解码）；CJK 宽度使用内置 `charWidth`，测试中用 `string-width` 对照校验
- PDF：调用系统 `pdftotext`（poppler-utils，本机已装）
- 测试：Node 内置 `node:test`

## 3. 目录结构

```
~/code/moyu-reader/
  package.json
  bin/moyu                 # #!/usr/bin/env node，调用 src/cli.js
  src/
    cli.js                 # 参数解析、启动
    config.js              # 配置读写（含默认值合并）
    parsers/
      index.js             # 按扩展名分派解析器
      txt.js               # 编码检测 + 分章
      epub.js              # zip/OPF/目录/正文提取
      pdf.js               # pdftotext 调用 + 按页切分
      text.js              # HTML 去标签、实体解码、章节识别（共用）
    core/
      book.js              # BookModel：元数据、章节、行索引、搜索
      paginate.js          # CJK 感知折行 + 分页
      library.js           # 书架扫描、最近打开
      store.js             # 进度/书架的原子读写
    ui/
      App.jsx              # 界面状态机 + 全局键盘
      Shelf.jsx            # 书架
      Reader.jsx           # 阅读正文 + 状态栏
      Toc.jsx              # 目录浮层
      Search.jsx           # 搜索浮层
      Settings.jsx         # 设置浮层
      Help.jsx             # 帮助浮层
      Disguise.jsx         # 伪装编译日志
      theme.js             # 颜色与宽度常量
  test/
    txt.test.js
    epub.test.js
    pdf.test.js
    paginate.test.js
    store.test.js
  fixtures/                # 测试样本（txt/epub 由脚本生成，pdf 为静态最小文件）
```

## 4. 数据模型

`BookModel`：

```js
{
  title: string,
  author: string | null,
  format: 'txt' | 'epub' | 'pdf',
  sourcePath: string,
  lines: string[],          // 全书按段落拆好的扁平行数组
  chapters: [{ title, startLine }],
  pageStarts?: number[]     // PDF 专用：每页起始行号（保留）
}
```

- 章节只存起始行号，正文不重复存储，翻页和搜索都基于扁平 `lines`
- 打开时计算每行的全局字符起点 `lineStarts`，阅读位置统一用全书字符偏移 `offset` 表示
- 搜索按行做不区分大小写的子串匹配，返回 `{ chapterIndex, lineIndex, offset, snippet }`
- 10MB 级别的 txt 直接全量驻留内存，不做流式处理

## 5. 解析

### TXT

1. 读 Buffer，检查 BOM（UTF-8 / UTF-16LE）
2. 无 BOM 时按块抽样验证 UTF-8；失败则用 `iconv-lite` 以 GB18030 解码
3. 统一换行符（`\r\n` / `\r` → `\n`），按换行拆行，连续空行压成一行空行
4. 章节正则：
   `/^\s*(第[0-9零一二三四五六七八九十百千万两]+[章节回卷集部篇][^\n]{0,40}|序章[^\n]{0,40}|楔子[^\n]{0,40}|番外[^\n]{0,40})\s*$/`
5. 匹配少于 2 处时视为无章节，按每 3000 行切一个“分卷 N”兜底

### EPUB

1. `adm-zip` 解包，读 `META-INF/container.xml` 找到 OPF
2. 解析 OPF 的 `manifest` 与 `spine`，按 spine 顺序取正文文档
3. 目录优先取 EPUB3 `nav.xhtml`，回退 `toc.ncx`；标题映射到 spine 位置
4. 正文提取：删除 `<script>/<style>`，块级标签转换行，解码常见实体，压缩连续空行
5. 目录缺失时，正文内命中章节正则的行同样作为章节

### PDF

1. 执行 `pdftotext -layout -enc UTF-8 <file> -`，捕获 stdout
2. 按 `\f` 切页，记录每页起始行号
3. 页内命中章节正则的行作为章节标题；全书命中少于 2 处时按每 10 页一组分章
4. 输出为空或仅空白时，提示“该 PDF 无文字层（可能是扫描版），暂不支持”
5. `pdftotext` 不存在时提示安装 poppler-utils

### 公共

- 章节标题去除首尾空白，最多保留 40 字
- 空章节（只有标题没有正文）合并到下一章
- 解析失败抛带用户可读信息的 `ParseError`，不打印堆栈

## 6. 分页与排版

- 每行字数 `charsPerLine`：按显示宽度计算，CJK 字符宽度 2，ASCII 宽度 1，默认 100（约 50 个汉字）
- 折行：逐字符累计显示宽度（内置 `charWidth`），ASCII 单词尽量不拆；超宽时在空格处断行
- 每页行数 `linesPerPage`：默认 0 表示按终端高度自适应（`rows - 状态栏 - 页脚`）；手动设置范围 10–60，或保持 0 自适应。按 `{`/`}` 时若当前是 0，先取当前自适应值再增减
- 阅读位置用全书字符偏移 `offset` 表示；由当前页第一行首字符计算得出
- 翻页：先按 offset 找到当前页首行，再前进/后退 `linesPerPage` 个显示行，取该行首字符的 offset
- 改变每行字数或每页行数后，用同一个 offset 重新定位，阅读位置不丢
- 状态栏显示：进度百分比、章节名、自动翻页状态；`t` 可隐藏章节名与书名
- 页脚显示快捷键提示，`h` 可隐藏

## 7. 配置与持久化

配置文件：`~/.config/moyu/config.json`

```json
{
  "charsPerLine": 100,
  "linesPerPage": 0,
  "autoPageSeconds": 30,
  "booksDirs": ["~/Documents/Books", "~/Downloads"],
  "showChapterTitle": true,
  "showFooter": true
}
```

- 启动时与默认值深合并；解析失败时备份为 `config.json.bak` 并重置
- 保存采用“写临时文件 + rename”原子替换

进度文件：`~/.config/moyu/progress.json`

```json
{
  "books": {
    "<sha1(realpath)>": {
      "path": "/abs/path/book.txt",
      "title": "书名",
      "offset": 1234,
      "percent": 42,
      "updatedAt": "2026-10-23T10:00:00Z"
    }
  }
}
```

- 任何位置变化（翻页、滚动、跳章、搜索跳转）后 500ms 防抖保存；退出时强制保存
- 打开文件时若存在记录则恢复位置，否则从第 0 行开始
- 文件不存在时进度保留，书架标红并提示“文件缺失”（不自动删除记录）

## 8. 界面与快捷键

界面状态：`shelf` / `reader` / `toc` / `search` / `settings` / `help` / `disguise`。
浮层覆盖在阅读界面之上，Esc 关闭。

### CLI 参数

| 参数 | 行为 |
| --- | --- |
| `moyu` | 打开书架 |
| `moyu <文件>` | 直接打开该书 |
| `moyu -l` / `--library` | 强制打开书架（忽略上次位置） |
| `--no-resume` | 从头开始读，不恢复进度 |
| `--debug` | 详细日志输出到 stderr |
| `-h` / `--help` | 帮助 |
| `-v` / `--version` | 版本号 |

### 书架

- 首次启动扫描 `booksDirs` 下的 `.txt/.epub/.pdf`（扫描前展开 `~`），按最近阅读时间排序
- 显示：书名、格式、进度百分比；文件丢失显示“文件缺失”
- `j/k` 移动，`Enter` 打开，`r` 重新扫描，`q` 退出

### 阅读

| 按键 | 功能 |
| --- | --- |
| `Space` / `PgDn` / `f` | 下一页 |
| `b` / `PgUp` | 上一页 |
| `j` / `k` | 下 / 上滚动一行 |
| `d` / `u` | 下 / 上半页 |
| `n` / `p` | 下一章 / 上一章 |
| `g` | 目录 |
| `/` | 全文搜索 |
| `s` | 书架 |
| `S` 或 `,` | 设置 |
| `a` | 开关自动翻页（每 N 秒翻一页，到末尾自动停） |
| `+` / `-` | 自动翻页间隔 +5s / -5s |
| `[` / `]` | 每行字数 -10 / +10 |
| `{` / `}` | 每页行数 -1 / +1 |
| `t` | 显示/隐藏章节名与书名 |
| `h` | 显示/隐藏页脚 |
| `~` | 进入伪装界面 |
| `?` | 帮助 |
| `q` | 退出 |

### 目录 / 搜索

- 目录：`j/k` 选择，`Enter` 跳转，浮层内 `g/G` 跳到首/尾
- 搜索：输入即增量搜索（当前书），`Enter` 跳到选中结果，`Esc` 取消；结果显示章节名与片段，跳转后目标行短暂高亮

### 伪装

- `~` 进入全屏“构建日志”界面：预生成带时间戳和 ANSI 颜色的 npm/webpack 风格输出，按行缓慢追加，看起来像在跑构建
- 任意按键（含 `~`）返回阅读界面，原位置不变
- 启动时通过 OSC 序列把终端标题改为 `user@host:~/project`，正常退出时恢复；异常退出不保证恢复
- 不修改 shell 历史或系统最近文件记录

### 设置

- 项：每行字数（40–120 列）、每页行数（0=自适应，或 10–60）、自动翻页间隔（5–120 秒）
- 每行字数旁显示约等于的汉字数（列数 ÷ 2）；每页行数旁显示“每页约 N 字”（列数 ÷ 2 × 行数）
- `↑/↓` 选择，`←/→` 调整并立即生效，`Enter` 或 `Esc` 关闭
- 所有改动立即生效并写盘

## 9. 错误处理

| 场景 | 行为 |
| --- | --- |
| 文件不存在 / 无权限 | 底部红字提示，留在书架 |
| TXT 不是 UTF-8 | 按 GB18030 解码（覆盖 GBK/GB2312 中文文本） |
| EPUB 结构损坏 | 提示“EPUB 解析失败”，列出一句原因，不崩溃 |
| PDF 无文字层 | 提示扫描版不支持，留在书架 |
| `pdftotext` 缺失 | 提示 `sudo apt install poppler-utils` |
| 配置/进度 JSON 损坏 | 备份后重置，仅提示一次 |
| 终端过小（< 40x10） | 显示“终端窗口太小”占位，不渲染正文 |

所有错误不打印堆栈，仅显示可读信息；`--debug` 参数可输出详细日志到 stderr。

## 10. 测试与验收

自动化测试（`npm test`）：

- `txt`：UTF-8 / GBK / UTF-16 三种编码、章节识别、无章节兜底
- `epub`：测试内用 adm-zip 生成最小 EPUB（container + OPF + nav + 两章），断言章节与正文
- `pdf`：用 `pdftotext` 解析仓库内的最小 PDF 样本，断言分页与章节；命令缺失时跳过并标记
- `paginate`：CJK 宽度、ASCII 单词不拆分、按页切分、设置变更后位置保持
- `store`：进度读写、原子写、损坏文件恢复（用临时 XDG 目录隔离）

手工验收：

1. 打开 10MB 级 GBK txt，分章正确，翻页流畅
2. 退出后重开自动回到原位置
3. 搜索关键词能跳到对应位置，目标行短暂高亮
4. `[`/`]` 调整后重新折行且位置不丢
5. `~` 切换伪装无闪烁，返回后位置不变
6. 打开扫描版 PDF 有明确提示

## 11. 实施顺序

1. 脚手架与 CLI 参数
2. TXT 解析 + 分页模型 + 进度存储（可先用简单输出验证）
3. Reader 界面 + 阅读快捷键 + 设置
4. EPUB / PDF 解析接入
5. 书架、目录、搜索
6. 伪装界面、终端标题
7. 测试补齐与手工验收

## 12. 依赖与安装

```bash
cd ~/code/moyu-reader
npm install
npm link        # 使 `moyu` 命令全局可用
moyu ~/Downloads/某本书.txt
```

仅第一次 `npm install` 需要网络。
