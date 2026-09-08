<div align="center">

# 🗂️ Solution Explorer for DSH

**给 DeepSeek Harness (DSH) Web GUI 右侧边栏的 VS Code 风格文件浏览器 + 完整源代码管理。**

[![npm](https://img.shields.io/npm/v/dsh-solution-explorer)](https://www.npmjs.com/package/dsh-solution-explorer)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![dshfind](https://dshfind.com/api/badge/xiaoksio/dsh-solution-explorer?lang=zh)](https://dshfind.com/zh/plugins/xiaoksio/dsh-solution-explorer?ref=badge)
[![license](https://img.shields.io/github/license/xiaoksio/dsh-solution-explorer)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/xiaoksio/dsh-solution-explorer)](https://github.com/xiaoksio/dsh-solution-explorer)

[English](README.md) · [简体中文](README.zh.md)

![dsh-solution-explorer demo](demo.gif)

</div>

## 功能

- **文件浏览器** — 以目录树浏览当前会话工作区，支持展开/收起；文件与文件夹带 VS Code 风格类型图标（TS/JS/Vue/JSON/图片/压缩包/脚本等 30+ 扩展名）；文件带 VS Code 风格 git 状态标记（M/A/D/R/?）且**名称与标记同步着色**（未跟踪绿色、已修改黄色、已排除灰色），被 `.gitignore` 排除的文件/目录灰显，目录有"已修改"指示。
- **源代码管理** — 暂存/未暂存/未跟踪变更清单，支持逐个或全部暂存、取消暂存、放弃变更，带提交信息的提交与分支信息。**AI 提交描述**：在设置中选择宿主已配置的模型后，点提交框旁的 ✨ 图标，即可基于暂存 diff 生成 Conventional Commits 规范的中文提交信息（可选注入仓库 AGENTS.md 风格）。**差异视图**：全文左右对照，右侧可逐行编辑（回车插行/合并行、NBSP 占位）、中间 gutter 支持逐块暂存（⤒）与还原（↩）、Ctrl+S 保存。**提交图形（Commit Graph）**：SVG 分支线/合并线历史视图，点击提交在行下方展开变更文件列表（带文件类型图标与状态字母 M/A/D/R），悬浮显示完整提交信息、变更统计与 GitHub 链接；支持 Checkout。**仓库同步**：抓取/拉取/推送/同步（拉取+推送），显示 ahead/behind 计数，远程写操作均二次确认。**分支管理**：切换/新建/重命名/删除/合并/发布。**远程仓库**：添加/删除/修改地址。**Git 初始化**：普通目录一键初始化。**合并冲突**：pull/merge 冲突（UU/AA/DD…）自动检测并列出，手动解决。**多仓库支持**：自动发现工作区下多个 git 仓库，可点击切换，SCM 面板跟随选中仓库。**上下分栏**：更改区与存储库区可拖拽调整占比，历史列表填满底部。批量操作位于分区头，放弃所有需二次确认。
- **语法高亮** — 编辑器与差异视图均支持 15 种语言（TS/JS/Python/JSON/Markdown/…）的语法着色（GitHub Dark 主题），编辑器输入实时高亮，性能轻量。
- **文件搜索** — 按文件名实时搜索整个工作区。
- **文件编辑器** — 在会话视图的"编辑"页签打开任意文本文件，编辑后保存（按钮或 Ctrl+S）；图片在编辑器内以缩放/平移预览打开，其余二进制文件会被识别并拒绝打开，避免损坏。
- **折叠窄条（rail）** — 整个面板可收起为一条窄图标栏（展开面板、文件浏览器、搜索、源代码管理、终端）；源代码管理图标带实时变更计数徽标，点击任一图标即在对应页签重新展开面板，视觉与原生侧边栏一致。
- **多标签终端** — 从折叠窄条上的终端图标展开底部终端面板（DSH 原生 ConPTY，默认 pwsh/cmd），支持多标签页；可拖拽调整高度，关闭标签或断线时自动清理进程。
- **文件操作** — 右键菜单支持新建文件/文件夹、删除（确认对话框）、复制/剪切/粘贴、复制相对/绝对路径；支持树内拖拽移动、从系统拖入文件、多选批量操作。
- **国际化** — 中英双语，跟随浏览器语言。
- **深色主题** — 与 DSH Web UI 主题 token 一致。

## 截图

| 文件浏览器 | 源代码管理 | 变更对比 |
| --- | --- | --- |
| ![文件浏览器](assets/screenshot-1-file-explorer.png) | ![源代码管理](assets/screenshot-2-source-control.png) | ![变更对比](assets/screenshot-3-diff.png) |

## 安装

> [!WARNING]
> 这是第三方社区插件。安装后，其代码将以你自己的权限在你的机器上运行。它可以在会话工作区内读取、修改、删除文件，并执行 git 操作（包括"放弃变更""删除"等破坏性操作）。使用前请审阅源代码，并先备份重要内容。插件对你仓库所做的一切，责任由你自行承担。

### 从 dsh-market 安装（GUI）

在 DSH Web UI 中打开插件市场，搜索"solution-explorer"，点击安装。

### 从 npm 安装

```sh
dsh plugin --profile web add dsh-solution-explorer
```

### 本地目录安装

```sh
dsh plugin --profile web add /path/to/dsh-solution-explorer
```

安装后刷新 Web UI。会话打开工作区后，资源管理器面板会作为独立右列出现。

## 配置

插件接受 bundle 行（`cordis.patch.yml`）中的可选 `config`：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultWidth` | `number` | `280` | 面板宽度（px），限制在 264–560。 |
| `autoOpen` | `boolean` | `true` | 会话激活时自动打开面板。 |
| `filterPatterns` | `string[]` | `[]` | 从文件树中隐藏的名称模式。 |
| `showHidden` | `boolean` | `false` | 在文件树中显示点前缀（隐藏）文件。 |

## 开发

```sh
pnpm install
pnpm build    # tsc 产类型 + tsdown 打包（lib/index.js、lib/client.js）
pnpm watch    # 改动自动重建
```

收录提交指引见 [CONTRIBUTING.md](CONTRIBUTING.md)。

`pnpm install` 也会执行 `prepare` 脚本，因此基于 git 的安装（`dsh plugin add github:xiaoksio/dsh-solution-explorer`）会在目标机器上自动构建 `lib/`，无需手动步骤。

## 工作原理

插件是单个 npm 包，两个半区都声明在 `package.json` 的 `dsh` 键下：

- **Host 半区**（`src/index.ts`，导出 `.` → `lib/index.js`）：运行在 dsh 宿主进程中，通过 `/solution-explorer/*` 下的 HTTP 路由提供工作区受限的文件系统与 git API（`tree`、`read`、`write`、`delete`、`search`、`git-repos`、`git-status`、`git-diff`、`git-log`、`git-stage`、`git-unstage`、`git-discard`、`git-commit`、`paste`、`move`、`upload`、`create`）。所有路由都把路径严格限制在会话工作区根目录内。它还会在系统提示词中宣告自身，让 agent 知道面板能做什么。
- **浏览器半区**（`src/client/index.ts`，导出 `./client` → `lib/client.js`）：由 Web GUI 的 `__ModuleLoader__` 以闭包工厂 bundle 形式加载。它向框架网格追加资源管理器列（`[data-dsh-frame]`），跟随当前会话的 `cwd`，并把文件编辑器挂载到 `conversation.view` 槽位。

开发约定与向 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提交收录的指引见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT
