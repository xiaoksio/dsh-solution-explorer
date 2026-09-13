<div align="center">

# 🗂️ Solution Explorer for DSH

**A drop-in replacement for the DSH Web GUI's right sidebar** — VS Code-style file explorer, a multi-tab editor with in-place previews, and full source control.

[![npm](https://img.shields.io/npm/v/dsh-solution-explorer)](https://www.npmjs.com/package/dsh-solution-explorer)
[![npm downloads](https://img.shields.io/npm/dm/dsh-solution-explorer)](https://www.npmjs.com/package/dsh-solution-explorer)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![dshfind](https://dshfind.com/api/badge/xiaoksio/dsh-solution-explorer?lang=zh)](https://dshfind.com/zh/plugins/xiaoksio/dsh-solution-explorer?ref=badge)
[![license](https://img.shields.io/github/license/xiaoksio/dsh-solution-explorer)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/xiaoksio/dsh-solution-explorer)](https://github.com/xiaoksio/dsh-solution-explorer)

[![DSH](https://img.shields.io/badge/DSH-0.1.5--rc.1%2B-4d6bfe)](https://www.npmjs.com/package/@deepseek-ai/dsh?activeTab=versions)

![File explorer + git status](https://img.shields.io/badge/-File_explorer_%2B_git_status-4d6bfe) ![Multi-tab editor](https://img.shields.io/badge/-Multi--tab_editor-4d6bfe) ![Previews](https://img.shields.io/badge/-Previews-4d6bfe) ![Diff](https://img.shields.io/badge/-Diff-4d6bfe) ![Commit graph](https://img.shields.io/badge/-Commit_graph-4d6bfe) ![Terminal](https://img.shields.io/badge/-Terminal-4d6bfe) ![Sidebar takeover](https://img.shields.io/badge/-Sidebar_takeover-4d6bfe)

[English](README.md) · [简体中文](README.zh.md)

![dsh-solution-explorer demo](demo.gif)

</div>

## Features

- **Takes over the sidebar** — every file opened from the conversation, the
  sidebar's own file list or source control lands in this plugin's editor view:
  as long as this plugin can read a file, the shipped preview panel never takes
  it over.
- **File Explorer** — browse the current session workspace as a directory tree
  with expand/collapse, VS Code-style file-type icons (TS/JS/Vue/JSON/image/
  archive/script and 30+ more extensions), git status markers (M/A/D/R/?), names
  color-coded by status (green untracked / yellow modified / grey ignored),
  `.gitignore`-excluded files and folders shown grey, and directory "modified"
  indicators.
- **Source Control** — staged / unstaged / untracked change lists with
  stage / unstage / discard (per-file or all), commit with a message, and a
  branch info bar. **AI commit message**: pick a host-configured model in
  Settings and tap the ✨-icon beside the commit box to generate a Conventional
  Commits draft from the staged diff (optionally guided by the repo's
  AGENTS.md). **Diff view**: full-file side-by-side compare with an
  editable right column (Enter splits lines, backspace/delete merges, NBSP
  placeholders), a middle gutter to stage (⤒) or revert (↩) individual hunks,
  Ctrl+S to save. **Commit Graph**: an SVG history view with
  branch lanes and merge lines; click a commit to expand its changed files
  (with file-type icons and status letters M/A/D/R) below the row, hover for
  a tooltip with the full message, stats, and a GitHub link; plus checkout. **Sync**: fetch / pull / push / sync (pull +
  push) with ahead/behind counts, each remote-write confirmed. **Branches**:
  switch / create / rename / delete / merge / publish. **Remotes**: add /
  remove / set URL. **Git Init**: initialize a repository from a plain
  directory. **Merge changes**: pull/merge conflicts (UU/AA/DD/…) are
  detected and listed for manual resolution. **Multi-repo support**:
  auto-discovers git repositories under the workspace and lets you switch
  between them; the SCM panel follows the selected repo. **Split panes**: drag
  the divider between changes and repository to resize, history fills the
  bottom. Bulk actions live in the section headers; discard all asks for
  confirmation.
- **Syntax highlighting** — editor and diff views colorize 15 languages
  (TS/JS/Python/JSON/Markdown/...) with a GitHub Dark theme; the editor
  re-highlights live while typing, lightweight.
- **File Search** — live name search across the workspace.
- **File Editor** — a multi-tab editor in the conversation view's "Editor" tab:
  open any text file, edit, and save (button or Ctrl+S). Images open in an
  in-editor preview with zoom/pan; `.md`/`.markdown` and `.html` open in rendered
  previews with a preview/source toggle; `.pdf` renders in place. Other binary
  files are detected and refused instead of corrupted.
- **Collapsible rail** — collapse the whole panel into a narrow icon rail
  (expand panel, explorer, search, source control, terminal). The source-control icon
  shows a live change-count badge; clicking an icon reopens the panel on that
  tab, matching the native sidebar's look.
- **Multi-tab terminal** — a bottom terminal panel opened from the rail
  (native ConPTY, PowerShell/cmd by default); multiple tabs, drag to resize,
  and auto cleanup of processes when a tab closes or the connection drops.
- **File operations** — context menu with new file/folder, delete (confirm
  dialog), copy / cut / paste, copy relative / absolute path; drag files within
  the tree, drag files in from the OS, multi-select bulk actions.
- **i18n** — English and Chinese, follows the browser language.
- **Dark theme** — matches the DSH Web UI tokens.

## Screenshots

| File Explorer | Source Control | Diff |
| --- | --- | --- |
| ![File Explorer](assets/screenshot-1-file-explorer.png) | ![Source Control](assets/screenshot-2-source-control.png) | ![Diff](assets/screenshot-3-diff.png) |

## Installation

> [!WARNING]
> This is a third-party community plugin. Installing it runs its code on your
> machine with your own permissions. It can read, modify, and delete files and
> run git operations (including destructive ones such as discard and delete)
> inside your session workspace. Review the source before use and back up
> important work first. You are responsible for what this plugin does with your
> repositories.

### From dsh-market (GUI)

Open the marketplace in the DSH Web UI, search for "solution-explorer", and
click install.

### From npm

```sh
dsh plugin --profile web add dsh-solution-explorer
```

### From a local checkout

```sh
dsh plugin --profile web add /path/to/dsh-solution-explorer
```

After installing, reload the Web UI. The explorer panel appears as its own right
column once a session with a workspace is active.

## Configuration

The plugin accepts an optional `config` in the bundle row
(`cordis.patch.yml`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultWidth` | `number` | `280` | Panel width in px, clamped to 264–560. |
| `autoOpen` | `boolean` | `true` | Auto-open the panel when a session activates. |
| `filterPatterns` | `string[]` | `[]` | Name patterns to hide from the file tree. |
| `showHidden` | `boolean` | `false` | Show dot-prefixed (hidden) files in the tree. |

## Development

```sh
pnpm install
pnpm build    # tsc declarations + tsdown bundles (lib/index.js, lib/client.js)
pnpm watch    # rebuild on change
```

See [CONTRIBUTING.md](https://github.com/xiaoksio/dsh-solution-explorer/blob/main/CONTRIBUTING.md) for development conventions.

`pnpm install` also runs the `prepare` script, so a git-based install
(`dsh plugin add github:xiaoksio/dsh-solution-explorer`) builds `lib/` on
the target machine without manual steps.

## How it works

The plugin is a single npm package with two halves, both declared in
`package.json` under the `dsh` key:

- **Host half** (`src/index.ts`, exports `.` → `lib/index.js`): runs in the
  dsh host process and serves the workspace-gated filesystem and git API over
  HTTP routes under `/solution-explorer/*` (`tree`, `read`, `write`,
  `delete`, `search`, `git-repos`, `git-status`, `git-diff`, `git-log`,
  `git-stage`, `git-unstage`, `git-discard`, `git-commit`, `paste`, `move`,
  `upload`, `create`). All routes
  resolve paths strictly inside the session workspace root. It also announces
  itself in the system prompt so the agent knows what the panel can do.
- **Browser half** (`src/client/index.ts`, exports `./client` →
  `lib/client.js`): loaded by the Web GUI's `__ModuleLoader__` as a
  closure-factory bundle. It appends the explorer column to the frame grid
  (`[data-dsh-frame]`), follows the active session's `cwd`, and mounts the
  file editor into the `conversation.view` slot. A `sidebarRightTabs`
  registration claims every `dsh-resource://file/**` address, so a file opened
  anywhere in the GUI is handed to that editor view instead of the shipped
  preview panel.

## License

MIT
