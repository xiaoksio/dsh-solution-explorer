# Contributing

Thanks for considering a contribution. This project follows the official
[DeepSeek Harness plugin development guide](https://deepseek-harness.github.io/deepseek-harness/develop/basic/).

## Development

```sh
pnpm install
pnpm build      # clean → inline PDF.js runtime assets → tsc -b (types) → tsdown (both halves)
pnpm watch      # tsdown in watch mode
```

`lib/` is git-ignored build output. `pnpm build` starts by clearing it: `tsc -b`
does not re-emit for deleted output, and stale `lib/types/*.d.ts` from removed
modules used to end up in the published tarball.

One npm package, two halves — declared in `package.json`'s `dsh` manifest and
mounted by `cordis.patch.yml`:

- **Host half** `src/index.ts` → `lib/index.js` (ESM): the `/solution-explorer/*`
  routes (workspace-gated filesystem I/O, git read/write/sync, branches and
  remotes, model-backed commit messages, terminal over ConPTY), the
  system-prompt announcement, and the persisted `Config` schema in
  `src/host/`.
- **Browser half** `src/client/index.ts` → `lib/client.js` (CJS closure factory
  for the Web GUI's `__ModuleLoader__`): appends the explorer column to the
  frame grid, registers the editor view in the `conversation.view` slot and the
  page in `settings.section`, and claims every `dsh-resource://file/**` address
  in the right sidebar so file opens land in this plugin.

Client code is split by domain, each with a React component plus its commands
and loaders:

```
src/client/
  panel.ts            assembly: React root, panelActions, per-domain command
                      registration, cross-domain deps injection
  PanelRoot.ts        the panel shell (activity bar, rail, three views, menu portal)
  explorer/           tree, search, clipboard, context menu, file-kind
  scm/                changes panel, history, actions, branches, graph, commands
  editor/             editor view, tabs, info bar, Markdown/HTML/PDF previews, diff parse
  viewer/             file-address parsing and the right-sidebar takeover
  terminal-client/    xterm shell and tab strip
  layout/             frame grid and mount lifecycle
  state/              store.ts (the single AppState) and editor-store.ts
  settings/, locales.ts, styles.ts
```

## Conventions

- **State lives in the store.** Add fields to the matching domain in
  `state/store.ts` + `createInitialState()`; never keep a second copy in a
  closure inside `panel.ts`.
- **Views are React.** Components use `createElement` (no JSX/TSX build step),
  render nothing through `innerHTML`, and touch no `window` global; overlays go
  through `createPortal`.
- **Domain modules take their deps.** Loaders and commands receive
  `{ state, render, ... }`, are registered by `registerXxxCommands(deps)`, and
  are deleted in the disposer. Cross-domain capabilities (`loadGitStatus`,
  `loadRecentCommits`, …) are injected from `panel.ts` — a domain module never
  imports it.
- **Icons come from the official package**
  (`@deepseek-ai/dsh-client-ui-primitives`: `FileTypeIcon`, `IconXxx16`); no
  hand-written SVG strings.
- **Styles use `--dsw-alias-*` tokens** (never literal colors), and product copy
  goes through `t("key")` with both Chinese and English in `locales.ts`.
- **Host routes answer `{ ok: true, value }` or `{ ok: false, error: { message } }`.**
  Git runs through `execFileSync('git', args, { cwd })` (never a shell string),
  porcelain output is only `trimEnd()`, and every filesystem path passes the
  workspace gate.

## Verifying a change

```sh
pnpm build
pnpm exec tsc -p tsconfig.client.json --noUnusedLocals --noUnusedParameters --noEmit
pnpm exec tsc -p tsconfig.host.json   --noUnusedLocals --noUnusedParameters --noEmit
pnpm pack --dry-run     # one lib/index.js + one lib/client.js (+ types), nothing stale
```

- Render discipline: new code adds no `innerHTML` and no `window.__*` — a search
  over `src/client` should still match comments only (plus the one documented
  highlight.js exception in `editor-view.ts`).
- Smoke the path you changed in the Web GUI: panel, file tree, editor, source
  control, terminal.
- **Development loop:** the browser half is reloaded by refreshing the page; the
  host half is only loaded when DSH starts, so route changes need a DSH restart.

## Docs to update with a feature

- `README.md` and `README.zh.md` feature lists (both languages),
- `package.json`'s `description` (it is the npm page's headline),
- `assets/` screenshots and `screenshots.json` when the UI changed,
- `demo.gif` / the demo video when the flow changed.

## Releasing

```sh
pnpm build && pnpm pack --dry-run     # verify the published contents
git push origin main
git tag vX.Y.Z && git push origin vX.Y.Z
gh release create vX.Y.Z dsh-solution-explorer-X.Y.Z.tgz --notes-file notes.md
npm publish --ignore-scripts
```

Release notes are grouped as 新增 / 修复 / 文档同步 (feat / fix / docs), one line
per change.

## License

MIT
