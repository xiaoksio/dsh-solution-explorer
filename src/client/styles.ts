/** Panel, SCM, editor, terminal and settings stylesheet (injected once into
 *  <head> by the styles effect). Uses only --dsw-alias-* tokens per repo rules. */
export const STYLES = `
.sol-exp-panel { height:100%; display:flex; flex-direction:column; background:var(--dsw-specific-sidebar-fill); color:var(--dsw-alias-label-primary); font-size:13px; line-height:20px; user-select:none; overflow:hidden; }

.sol-exp-header { flex:none; display:flex; align-items:center; justify-content:space-between; gap:4px; height:34px; padding:0 8px 0 6px; box-sizing:border-box; border-radius:12px; color:var(--dsw-alias-label-tertiary); }

.sol-exp-title { font-size:13px; font-weight:500; color:var(--dsw-alias-label-tertiary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }

.sol-exp-header-actions { display:flex; gap:2px; }

.sol-exp-toolbar-btn { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border:none; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; border-radius:6px; padding:0; }

.sol-exp-toolbar-btn:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

.sol-exp-search { display:flex; align-items:center; gap:4px; padding:0 8px 6px; flex-shrink:0; }

.sol-exp-search-icon { flex:none; color:var(--dsw-alias-label-tertiary); }

.sol-exp-search-input { flex:1; width:0; min-width:0; box-sizing:border-box; padding:2px 8px; border:none; border-radius:6px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); font-size:13px; line-height:20px; outline:none; }

.sol-exp-search-input:focus { background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-interactive-bg-hover)); }

.sol-exp-content { flex:1; overflow-y:auto; overflow-x:hidden; }

.sol-exp-loading, .sol-exp-empty, .sol-exp-error { padding:16px; text-align:center; color:var(--dsw-alias-label-tertiary); font-size:13px; }

.sol-exp-error { color:var(--dsw-color-error,#f48771); }

.sol-exp-tree { padding:2px 0; }

.sol-exp-tree-node { display:flex; align-items:center; gap:6px; min-width:0; padding:5px 10px; box-sizing:border-box; cursor:pointer; white-space:nowrap; border-radius:10px; color:var(--dsw-alias-label-primary); }

.sol-exp-tree-node:hover { background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-tree-node.sol-exp-selected { background:var(--dsw-alias-interactive-bg-active); }

.sol-exp-cut { opacity:.5; }

.sol-exp-drop-target { outline:1px solid var(--dsw-alias-state-business-primary); outline-offset:-1px; background:var(--dsw-alias-interactive-bg-active); }

.sol-exp-chevron { display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; flex-shrink:0; color:var(--dsw-alias-label-tertiary); }

.sol-exp-file-icon { margin-right:4px; flex-shrink:0; display:inline-flex; align-items:center; line-height:1; }

.sol-exp-file-name { overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }

.sol-exp-git-M { color:#e2b714; } .sol-exp-git-A { color:#4ec9b0; } .sol-exp-git-D { color:#f14c4c; }

.sol-exp-git-R { color:#4ec9b0; } .sol-exp-git-q { color:#4ec9b0; } .sol-exp-git-x { color:#6e6e6e; } .sol-exp-git-\? { color:#4ec9b0; } .sol-exp-git-U { color:#f14c4c; }

.sol-exp-scm-section { }

.sol-exp-scm-section-header { display:flex; align-items:center; gap:4px; padding:8px 12px; cursor:pointer; font-size:12px; font-weight:600; color:var(--dsw-alias-label-secondary); }

.sol-exp-scm-section-header:hover { color:var(--dsw-alias-label-primary); }

.sol-exp-scm-section-count { font-size:11px; font-weight:400; color:var(--dsw-alias-label-tertiary); }

.sol-exp-scm-item { display:flex; align-items:center; gap:6px; min-width:0; padding:5px 10px 5px 24px; box-sizing:border-box; cursor:pointer; font-size:13px; line-height:20px; border-radius:10px; }

.sol-exp-scm-item:hover { background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-scm-status { font-size:11px; font-weight:700; width:16px; text-align:center; flex-shrink:0; }

.sol-exp-scm-path { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }

.sol-exp-scm-actions { display:none; gap:2px; flex-shrink:0; }

.sol-exp-scm-item:hover .sol-exp-scm-actions { display:flex; }

.sol-exp-scm-action-btn { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border:none; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; border-radius:3px; padding:0; font-size:11px; }

.sol-exp-scm-action-btn:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

.sol-exp-diff { margin:0 12px 6px 40px; border-left:2px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-input); border-radius:6px; overflow:hidden; }

.sol-exp-diff-line { padding:0 8px; font-family:'Cascadia Code','Fira Code','Consolas',monospace; font-size:12px; line-height:18px; white-space:pre; color:var(--dsw-alias-label-secondary); }

.sol-exp-diff-line.add { background:rgba(78,201,176,0.12); color:#4ec9b0; }

.sol-exp-diff-line.del { background:rgba(241,76,76,0.12); color:#f14c4c; }

.sol-exp-diff-line.hunk { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

.sol-exp-diff-line.meta { color:var(--dsw-alias-label-tertiary); }

.sol-exp-diff-empty { padding:8px; color:var(--dsw-alias-label-tertiary); font-size:12px; }

.sol-exp-scm-header-actions { display:flex; align-items:center; gap:2px; margin-left:auto; }

.sol-exp-hdr-btn { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border:none; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; padding:0; }

.sol-exp-hdr-btn:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

.sol-exp-hdr-btn.danger { color:var(--dsw-alias-state-error-primary); }

.sol-exp-hdr-btn.danger:hover { background:var(--dsw-alias-state-error-primary); color:#fff; }

.sol-exp-commit-box { padding:8px 12px; border-bottom:1px solid var(--dsw-alias-border-l1); }

.sol-exp-commit-input { width:100%; box-sizing:border-box; padding:6px 10px; border:none; border-radius:8px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); font-size:13px; line-height:18px; outline:none; resize:none; font-family:inherit; min-height:60px; transition:background-color 120ms ease; }

.sol-exp-commit-input:focus { background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-interactive-bg-hover)); }

.sol-exp-commit-input::placeholder { color:var(--dsw-alias-label-tertiary); }

.sol-exp-commit-row { display:flex; gap:6px; margin-top:6px; }

.sol-exp-commit-btn { flex:1; width:100%; padding:5px 0; border:none; border-radius:6px; background:var(--dsw-alias-button-info-fill); color:#fff; font-size:13px; font-weight:500; cursor:pointer; line-height:20px; transition:background-color 120ms ease; }

.sol-exp-commit-btn:hover:not(:disabled) { background:var(--dsw-alias-button-info-hover); }

.sol-exp-commit-btn:disabled { opacity:.4; cursor:default; }

.sol-exp-ai-btn { flex:none; width:30px; padding:0; border:none; border-radius:6px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); font-size:13px; line-height:30px; cursor:pointer; transition:background-color 120ms ease; }

.sol-exp-ai-btn:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-active); }

.sol-exp-ai-btn:disabled { opacity:.4; cursor:default; }

.sol-exp-ai-spin { animation: sol-exp-ai-spin 1s linear infinite; }

@keyframes sol-exp-ai-spin { to { transform: rotate(360deg); } }

.sol-exp-commit-branch { font-size:11px; color:var(--dsw-alias-label-tertiary); }

.sol-exp-search-results { padding:4px 0; }

.sol-exp-search-item { display:flex; align-items:center; gap:6px; min-width:0; padding:5px 10px; box-sizing:border-box; cursor:pointer; font-size:13px; line-height:20px; border-radius:10px; }

.sol-exp-search-item:hover { background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-search-item.sol-exp-selected { background:var(--dsw-alias-interactive-bg-active); }

.sol-exp-icon { flex-shrink:0; font-size:14px; }

.sol-exp-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-shrink:0; max-width:40%; }

.sol-exp-path { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-tertiary); font-size:11px; flex:1; min-width:0; margin-left:4px; }

.sol-exp-path::before { content:'\\2014 '; }

.sol-exp-content, .sol-exp-scm-top, #sol-exp-commits-list, .sol-exp-commit-files { scrollbar-width:thin; }

.sol-exp-content::-webkit-scrollbar, .sol-exp-scm-top::-webkit-scrollbar, #sol-exp-commits-list::-webkit-scrollbar, .sol-exp-commit-files::-webkit-scrollbar { width:6px; height:6px; }

.sol-exp-content::-webkit-scrollbar-track, .sol-exp-scm-top::-webkit-scrollbar-track, #sol-exp-commits-list::-webkit-scrollbar-track, .sol-exp-commit-files::-webkit-scrollbar-track { background:transparent; }

.sol-exp-content::-webkit-scrollbar-thumb, .sol-exp-scm-top::-webkit-scrollbar-thumb, #sol-exp-commits-list::-webkit-scrollbar-thumb, .sol-exp-commit-files::-webkit-scrollbar-thumb { background:var(--dsw-alias-scrollbar-bg-l2); border-radius:3px; }

.sol-exp-body { flex:1; min-height:0; display:flex; }

.sol-exp-activity { flex:none; display:flex; flex-direction:row; align-items:stretch; padding:0 4px; gap:2px; border-bottom:1px solid var(--dsw-alias-border-l1); background:var(--dsw-specific-sidebar-fill); height:36px; }

.sol-exp-activity-btn { position:relative; flex:none; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; border-radius:6px; padding:0; margin:auto 0; }

.sol-exp-activity-btn:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-activity-btn.active { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-panel-rail { flex:1; min-height:0; display:flex; flex-direction:column; align-items:center; gap:6px; padding:18px 10px 6px; box-sizing:border-box; background:var(--dsw-specific-sidebar-fill); }
/* All rail controls (expand toggle + feature icons) sit centered on the same
   vertical axis so the folded rail reads as one symmetric column. */
.sol-exp-rail-btn { flex:none; align-self:center; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:none; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; padding:0; }
.sol-exp-rail-btn:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
/* The shell mirrors its panel glyph for the right sidebar (scaleX(-1) on its
   own 打开/收起右侧边栏 buttons); ours is a right column too, so mirror both
   toggles instead of showing a left-panel arrow. */
.sol-exp-rail-btn svg, .sol-exp-panel-toggle svg { transform: scaleX(-1); }
.sol-exp-rail-icon { position:relative; flex:none; align-self:center; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:none; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; padding:0; }
.sol-exp-rail-icon:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
/* Change-count badge: tucked into the icon's bottom-right corner and
   overlapping it (VS Code style), so icon+badge read as one unit instead
   of a floating pill. Absolute positioning keeps it out of the icon's flex
   row, so counts of any width can't squeeze the icon. */
.sol-exp-activity-badge { position:absolute; bottom:2px; right:2px; min-width:13px; height:13px; padding:0 3px; border-radius:7px; box-sizing:border-box; background:var(--dsw-alias-button-info-fill); color:#fff; font-size:8px; font-weight:600; line-height:13px; text-align:center; white-space:nowrap; z-index:1; pointer-events:none; }

/* Bottom-terminal toggle inside the folded rail, under the SCM icon, using
   the same terminal glyph as the activity bar (stroke family, 1.5). */
.sol-exp-rail-icon.sol-exp-terminal-toggle.active { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }


/* The editor scrolls inside its textarea; give it the same thin themed bar as
   the rest of the panel instead of the browser default. */
.sol-exp-editor textarea { scrollbar-width:thin; }

.sol-exp-editor textarea::-webkit-scrollbar { width:8px; height:8px; }

.sol-exp-editor textarea::-webkit-scrollbar-track { background:transparent; }

.sol-exp-editor textarea::-webkit-scrollbar-thumb { background:var(--dsw-alias-scrollbar-bg-l2); border-radius:4px; }

.sol-exp-editor textarea::-webkit-scrollbar-thumb:hover { background:var(--dsw-alias-scrollbar-hover-l2); }

/* Bottom multi-tab terminal panel (ConPTY embedded). */
.sol-exp-terminal-shell { position:relative; flex:none; display:flex; flex-direction:column; min-height:0; overflow:hidden; background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-2,#171717)); border-top:1px solid var(--dsw-alias-border-l2); }
.sol-exp-term-resize { position:absolute; top:-3px; left:0; right:0; height:6px; cursor:ns-resize; touch-action:none; z-index:2; }
.sol-exp-term-resize::after { content:''; position:absolute; left:0; right:0; top:50%; height:1px; background:var(--dsw-alias-button-floating-fill); opacity:0; transition:opacity .12s ease; }
.sol-exp-term-resize:hover::after { opacity:.8; }
.sol-exp-term-tabs { flex:none; display:flex; align-items:center; gap:2px; height:34px; padding:0 8px; border-bottom:1px solid var(--dsw-alias-border-l1); overflow-x:auto; scrollbar-width:thin; }
.sol-exp-term-tab { flex:1 0 auto; display:flex; align-items:center; gap:6px; height:26px; padding:0 8px; max-width:260px; border-radius:6px; border:none; background:transparent; color:var(--dsw-alias-label-secondary); font-size:12px; cursor:pointer; }
.sol-exp-term-tab:hover { background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-term-tab.active { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-term-tab-close { flex:none; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; border-radius:4px; font-size:11px; line-height:1; }
.sol-exp-term-tab-close:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-term-add { flex:none; width:26px; height:26px; margin-left:4px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; border-radius:6px; font-size:14px; }
.sol-exp-term-add:hover:not(:disabled) { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-term-add:disabled { opacity:.4; cursor:default; }
.sol-exp-term-body { flex:1; min-height:0; position:relative; background:var(--dsw-alias-bg-layer-1,#101010); }
.sol-exp-term-pane { position:absolute; inset:0; visibility:hidden; }
.sol-exp-term-pane.active { visibility:visible; }
.sol-exp-term-pane .xterm { height:100%; }
.sol-exp-term-exited { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--dsw-alias-label-tertiary); font-size:13px; gap:10px; }

.sol-exp-resize-handle { position:absolute; top:0; bottom:0; width:8px; margin-left:-4px; cursor:col-resize; z-index:2; touch-action:none; background:transparent; }
.sol-exp-resize-handle::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:3px; height:44px; border-radius:2px; background:var(--dsw-alias-button-floating-fill); opacity:0; transition:opacity .12s ease; }
.sol-exp-resize-handle:hover::after, .sol-exp-resize-handle[data-dragging='true']::after { opacity:1; }
.sol-exp-resize-handle[data-overlapped='true'] { pointer-events:none; }

.sol-exp-main { flex:1; min-width:0; display:flex; flex-direction:column; }

.sol-exp-git-letter { flex:none; font-size:11px; font-weight:700; width:16px; text-align:center; margin-left:6px; }

.sol-exp-context-menu { position:absolute; z-index:1000; min-width:140px; padding:4px; background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-3)); border:1px solid var(--dsw-alias-border-l2); border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.3); font-size:13px; color:var(--dsw-alias-label-primary); }
.sol-exp-modal-mask { position:fixed; inset:0; z-index:100000; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); backdrop-filter:blur(2px); animation:solExpModalFade .15s ease; }
.sol-exp-modal-box { width:min(420px, calc(100vw - 48px)); background:var(--dsw-alias-bg-overlay); border:1px solid var(--dsw-alias-border-l2); border-radius:10px; box-shadow:0 12px 40px rgba(0,0,0,0.35); overflow:hidden; animation:solExpModalPop .16s ease; }
.sol-exp-modal-title { padding:16px 16px 0; font-size:15px; font-weight:600; color:var(--dsw-alias-label-primary); }
.sol-exp-modal-message { padding:8px 16px 0; font-size:13px; line-height:1.6; color:var(--dsw-alias-label-secondary); white-space:pre-wrap; word-break:break-word; }
.sol-exp-modal-input { box-sizing:border-box; width:calc(100% - 32px); margin:12px 16px 0; padding:7px 10px; border-radius:6px; border:1px solid var(--dsw-alias-border-l2); background:transparent; color:var(--dsw-alias-label-primary); font-size:13px; outline:none; }
.sol-exp-modal-input:focus { border-color:var(--dsw-alias-border-l3); }
.sol-exp-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; padding:12px 16px; border-top:1px solid var(--dsw-alias-border-l3); }
.sol-exp-modal-btn { padding:5px 14px; border-radius:6px; border:1px solid transparent; background:transparent; color:var(--dsw-alias-label-secondary); font-size:13px; cursor:pointer; transition:background .12s ease, color .12s ease, opacity .12s ease; }
.sol-exp-modal-btn:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.sol-exp-modal-btn.primary { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); }
.sol-exp-modal-btn.primary:hover { background:var(--dsw-alias-button-primary-fill); opacity:.88; }
.sol-exp-modal-btn.danger { background:var(--dsw-alias-state-error-primary); color:var(--dsw-alias-label-primary-foreground); }
.sol-exp-modal-btn.danger:hover { background:var(--dsw-alias-state-error-primary); opacity:.88; }
@keyframes solExpModalFade { from { opacity:0; } to { opacity:1; } }
@keyframes solExpModalPop { from { opacity:0; transform:scale(.96) translateY(4px); } to { opacity:1; transform:none; } }

.sol-exp-context-menu-item { padding:6px 12px; cursor:pointer; border-radius:6px; display:flex; align-items:center; gap:8px; color:var(--dsw-alias-label-primary); }

.sol-exp-context-menu-item:hover { background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-context-menu-item.danger { color:var(--dsw-color-error,#f14c4c); }

.sol-exp-context-menu-item.danger:hover { background:var(--dsw-alias-interactive-bg-hover); }

.sol-exp-editor { flex:1; height:100%; box-sizing:border-box; display:flex; flex-direction:column; min-height:0; overflow:hidden; }

.sol-exp-editor-body { flex:1; min-height:0; box-sizing:border-box; display:flex; flex-direction:column; padding-bottom:calc(var(--dsh-composer-height, 152px) + 16px); }

.sol-exp-editor-top { flex:none; display:flex; flex-direction:column; background:var(--dsw-specific-sidebar-fill); }

.sol-exp-etabs { flex:none; display:flex; align-items:stretch; gap:2px; padding:0 4px; height:32px; box-sizing:border-box; border-bottom:1px solid var(--dsw-alias-border-l1); background:var(--dsw-specific-sidebar-fill); overflow-x:auto; overflow-y:hidden; }

.sol-exp-etab { display:flex; align-items:center; gap:6px; flex:none; max-width:200px; padding:0 6px 0 8px; margin:4px 0; border-radius:6px; cursor:pointer; color:var(--dsw-alias-label-tertiary); font-size:12px; white-space:nowrap; }

.sol-exp-etab:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }

.sol-exp-etab.active { background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover)); color:var(--dsw-alias-label-primary); }

.sol-exp-etab-icon { display:inline-flex; align-items:center; flex:none; }

.sol-exp-etab-name { overflow:hidden; text-overflow:ellipsis; }

.sol-exp-etab-dot { flex:none; font-size:9px; line-height:1; color:var(--dsw-alias-label-primary); }

.sol-exp-etab-close { display:inline-flex; align-items:center; justify-content:center; flex:none; width:16px; height:16px; padding:0; border:none; border-radius:3px; background:transparent; color:inherit; cursor:pointer; opacity:.6; }

.sol-exp-etab-close:hover { opacity:1; background:var(--dsw-alias-bg-modifier); }

.sol-exp-einfo-status { flex:none; padding:0 8px; font-size:11px; white-space:nowrap; color:var(--dsw-alias-label-tertiary); }
/* Both chrome rows pin to the top of the host's scroll container: the editor
   body grows with its content (the host's view area has no definite height), so
   the whole view scrolls underneath and the rows must stay put. */
.sol-exp-einfo { flex:none; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:3px 10px; border-bottom:1px solid var(--dsw-alias-border-l1); background:var(--dsw-specific-sidebar-fill); font-size:11px; line-height:18px; }

.sol-exp-einfo-path { min-width:0; color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.sol-exp-einfo-kind { flex:none; color:var(--dsw-alias-label-tertiary); white-space:nowrap; }
/* Diff tabs keep their before/after legend and save state in the info row
   instead of a toolbar row of their own. */
.sol-exp-einfo-diff { display:inline-flex; align-items:center; gap:10px; }

.sol-exp-einfo-before { color:#f14c4c; }

.sol-exp-einfo-after { color:#4ec9b0; }

.sol-exp-einfo-right { margin-left:auto; flex:none; display:flex; align-items:center; gap:6px; }

.sol-exp-einfo-zoom { flex:none; display:flex; align-items:center; gap:2px; padding:0 6px; }

.sol-exp-einfo-zoom .sol-exp-editor-btn { padding:1px 6px; line-height:16px; font-size:11px; }

.sol-exp-einfo-zoom-value { color:var(--dsw-alias-label-tertiary); font-size:11px; margin-left:4px; }

/* The editor's empty state: a muted glyph above the line that explains it. */
.sol-exp-editor-empty { flex:1; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:16px; color:var(--dsw-alias-label-tertiary); font-size:12px; text-align:center; }

.sol-exp-editor-empty svg { opacity:.45; }

/* The Sidebar viewer tab's body, drawn only when a surface still holds this tab. */
.sol-exp-viewer { flex:1; height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; }

/* Markdown preview: the document renderer's own scrollport. */
.sol-exp-mdview { flex:1; min-height:0; overflow:auto; padding:12px 16px; color:var(--dsw-alias-label-primary); font-size:13px; line-height:1.6; }

.sol-exp-mdview > :first-child { margin-top:0; }

.sol-exp-einfo-md { flex:none; display:inline-flex; align-items:center; gap:2px; }

/* HTML preview: the sandboxed frame fills the pane edge to edge. */
.sol-exp-htmlview { flex:1; min-height:0; width:100%; border:0; display:block; }

/* PDF preview: our own page stack. Dragging pans it, as it does an image. */
.sol-exp-pdfview { flex:1; min-height:0; overflow:auto; scrollbar-gutter:stable; padding:12px; cursor:grab; }

.sol-exp-pdfview:active { cursor:grabbing; }

.sol-exp-pdfpage { display:flex; justify-content:center; margin:0 0 12px; }

.sol-exp-pdfpage canvas { background:#fff; box-shadow:0 1px 5px rgba(0,0,0,.35); }

.sol-exp-einfo-status.saving { color:var(--dsw-alias-label-secondary); }

.sol-exp-einfo-status.dirty { color:#e2b714; }

.sol-exp-einfo-status.saved { color:#4ec9b0; }



.sol-exp-editor-header { display:flex; align-items:center; justify-content:space-between; gap:4px; padding:6px 8px; border-bottom:1px solid var(--dsw-alias-border-l1); flex-shrink:0; }

.sol-exp-editor-path { font-size:12px; color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.sol-exp-editor-actions { display:flex; gap:4px; flex-shrink:0; }

.sol-exp-editor-btn { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border:none; border-radius:4px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); cursor:pointer; font-size:12px; line-height:20px; }

.sol-exp-editor-btn:hover { opacity:.85; }

.sol-exp-editor-btn.primary { background:var(--dsw-alias-bg-modifier); color:#fff; }

.sol-exp-editor-btn.primary:disabled { opacity:.4; cursor:not-allowed; }

.sol-exp-editor-textarea { flex:1; min-height:0; width:100%; box-sizing:border-box; padding:8px 12px; border:none; background:var(--dsw-alias-bg-input); color:var(--dsw-alias-label-primary); font-family:'Cascadia Code','Fira Code','JetBrains Mono','Consolas','Courier New',monospace; font-size:13px; line-height:1.5; outline:none; resize:none; tab-size:2; }

.sol-exp-editor-textarea:focus { background:var(--dsw-alias-bg-input); }

.sol-exp-editor-status { display:flex; align-items:center; gap:6px; padding:2px 8px; border-top:1px solid var(--dsw-alias-border-l1); font-size:11px; color:var(--dsw-alias-label-tertiary); flex-shrink:0; }

.sol-exp-editor-saving { color:var(--dsw-alias-label-secondary); }

.sol-exp-editor-saved { color:#4ec9b0; }

.sol-exp-editor-unsaved { color:#e2b714; }

.sol-exp-hl .hljs { color: #c9d1d9; background: transparent; }
.sol-exp-hl .hljs-doctag, .sol-exp-hl .hljs-keyword, .sol-exp-hl .hljs-template-tag, .sol-exp-hl .hljs-template-variable, .sol-exp-hl .hljs-type, .sol-exp-hl .hljs-variable.language_ { color: #ff7b72; }
.sol-exp-hl .hljs-title, .sol-exp-hl .hljs-title.class_, .sol-exp-hl .hljs-title.class_.inherited__, .sol-exp-hl .hljs-title.function_ { color: #d2a8ff; }
.sol-exp-hl .hljs-attr, .sol-exp-hl .hljs-attribute, .sol-exp-hl .hljs-literal, .sol-exp-hl .hljs-meta, .sol-exp-hl .hljs-number, .sol-exp-hl .hljs-operator, .sol-exp-hl .hljs-variable, .sol-exp-hl .hljs-selector-attr, .sol-exp-hl .hljs-selector-class, .sol-exp-hl .hljs-selector-id { color: #79c0ff; }
.sol-exp-hl .hljs-regexp, .sol-exp-hl .hljs-string, .sol-exp-hl .hljs-meta .hljs-string { color: #a5d6ff; }
.sol-exp-hl .hljs-built_in, .sol-exp-hl .hljs-symbol { color: #ffa657; }
.sol-exp-hl .hljs-comment, .sol-exp-hl .hljs-code, .sol-exp-hl .hljs-formula { color: #8b949e; }
.sol-exp-hl .hljs-name, .sol-exp-hl .hljs-quote, .sol-exp-hl .hljs-selector-tag, .sol-exp-hl .hljs-selector-pseudo { color: #7ee787; }
.sol-exp-hl .hljs-subst { color: #c9d1d9; }
.sol-exp-hl .hljs-section { color: #1f6feb; font-weight: bold; }
.sol-exp-hl .hljs-bullet { color: #f2cc60; }
.sol-exp-hl .hljs-emphasis { color: #c9d1d9; font-style: italic; }
.sol-exp-hl .hljs-strong { color: #c9d1d9; font-weight: bold; }
.sol-exp-hl .hljs-addition { color: #aff5b4; background-color: #033a16; }
.sol-exp-hl .hljs-deletion { color: #ffdcd7; background-color: #67060c; }
.sol-exp-hl .hljs-char.escape_, .sol-exp-hl .hljs-link, .sol-exp-hl .hljs-params, .sol-exp-hl .hljs-property, .sol-exp-hl .hljs-punctuation, .sol-exp-hl .hljs-tag { }
.sol-exp-scm-section.collapsed > *:not(.sol-exp-scm-section-header) { display:none !important; }
.sol-exp-scm-section.collapsed .sol-exp-scm-section-header svg { transform: rotate(0deg) !important; }
.sol-exp-branch-pill { display:inline-flex; align-items:center; gap:4px; padding:1px 8px; border-radius:999px; background:var(--dsw-alias-interactive-bg-hover); font-size:11px; font-weight:500; color:var(--dsw-alias-label-primary); }
.sol-exp-commit-item { display:flex; align-items:center; gap:6px; min-width:0; padding:5px 10px; box-sizing:border-box; border-radius:10px; cursor:pointer; }
.sol-exp-commit-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-commit-item.selected { background:var(--dsw-alias-interactive-bg-active); }
.sol-exp-graph-svg { flex:none; display:block; }
.sol-exp-commit-hash { font-family:monospace; font-size:11px; color:var(--dsw-alias-label-tertiary); flex:none; }
.sol-exp-commit-msg { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; color:var(--dsw-alias-label-primary); }
.sol-exp-commit-date { flex:none; font-size:11px; color:var(--dsw-alias-label-tertiary); }
.sol-exp-commit-detail { margin:2px 4px 6px; padding:6px 10px; border:1px solid var(--dsw-alias-border-l2); border-radius:6px; background:var(--dsw-alias-bg-input); font-size:12px; }
.sol-exp-commit-detail-row { display:flex; gap:8px; padding:2px 0; align-items:baseline; }
.sol-exp-commit-detail-label { flex:none; width:52px; color:var(--dsw-alias-label-tertiary); }
.sol-exp-commit-detail-val { flex:1; min-width:0; word-break:break-all; color:var(--dsw-alias-label-primary); }
.sol-exp-commit-detail-file { padding:1px 0 1px 52px; color:var(--dsw-alias-label-secondary); font-family:monospace; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sol-exp-commit-detail-close { margin-left:auto; background:transparent; border:none; color:var(--dsw-alias-label-tertiary); cursor:pointer; font-size:13px; padding:0 2px; }
.sol-exp-commit-detail-close:hover { color:var(--dsw-alias-label-primary); }
.sol-exp-commit-detail-btn { background:transparent; border:1px solid var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); border-radius:4px; padding:2px 8px; font-size:11px; cursor:pointer; }
.sol-exp-commit-detail-btn:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.sol-exp-git-C { color:#58a6ff; } .sol-exp-git-T { color:#e2b714; }
/* Inline changed-file list expanded below a clicked commit row. */
.sol-exp-commit-detail-inline { margin:0 4px 6px; border:1px solid var(--dsw-alias-border-l2); border-left:3px solid var(--dsw-alias-button-info-fill); border-radius:6px; background:var(--dsw-alias-interactive-bg-hover); font-size:12px; padding:6px 8px; }
.sol-exp-commit-file-row { display:flex; align-items:center; gap:6px; min-width:0; padding:4px 8px; border-radius:8px; }
.sol-exp-commit-file-row:hover { background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-commit-file-icon { flex:none; display:inline-flex; width:16px; }
.sol-exp-commit-file-path { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-secondary); font-family:monospace; font-size:11px; }
.sol-exp-commit-file-status { flex:none; font-size:11px; font-weight:700; width:14px; text-align:center; }
.sol-exp-commit-detail-footer { display:flex; justify-content:flex-end; padding-top:4px; }
/* Hover tooltip for commit rows. */
.sol-exp-commit-tooltip { position:fixed; z-index:100001; max-width:340px; max-height:280px; overflow-y:auto; padding:8px 12px; border-radius:8px; background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-3)); border:1px solid var(--dsw-alias-border-l2); box-shadow:0 4px 16px rgba(0,0,0,0.35); font-size:12px; color:var(--dsw-alias-label-primary); }
.sol-exp-commit-tip-msg { white-space:pre-wrap; word-break:break-word; color:var(--dsw-alias-label-primary); }
.sol-exp-commit-tip-stats { margin-top:6px; color:var(--dsw-alias-label-secondary); }
.sol-exp-commit-tip-meta { margin-top:4px; color:var(--dsw-alias-label-tertiary); }
.sol-exp-commit-tip-hash { margin-top:6px; display:flex; align-items:center; gap:8px; }
.sol-exp-commit-tip-link { color:var(--dsw-alias-label-link); text-decoration:none; }
.sol-exp-commit-tip-link:hover { text-decoration:underline; }
.sol-exp-scm-status { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:4px; font-size:11px; font-weight:700; background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-scm-host { flex:1; min-height:0; display:flex; flex-direction:column; }
.sol-exp-scm-split { flex:1; min-height:0; height:100%; display:flex; flex-direction:column; }
.sol-exp-scm-top { flex:1 1 55%; min-height:0; overflow-y:auto; }
.sol-exp-scm-divider { position:relative; flex:none; height:4px; cursor:row-resize; background:var(--dsw-alias-border-l1); z-index:3; }
.sol-exp-scm-divider::before { content:''; position:absolute; left:0; right:0; top:-6px; bottom:-6px; }
.sol-exp-scm-divider:hover { background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-scm-bottom { flex:1 1 45%; min-height:0; display:flex; flex-direction:column; }
.sol-exp-scm-section[data-section="commits"] { flex:1; min-height:0; display:flex; flex-direction:column; }
.sol-exp-repo-item { display:flex; align-items:center; gap:6px; min-width:0; padding:5px 10px; box-sizing:border-box; border-radius:10px; cursor:pointer; font-size:12px; }
.sol-exp-repo-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.sol-exp-repo-item.active { background:var(--dsw-alias-interactive-bg-active); }
.sol-exp-repo-icon { flex:none; color:var(--dsw-alias-state-business-primary); }
.sol-exp-repo-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-primary); }
.sol-exp-repo-branch { flex:none; font-size:11px; color:var(--dsw-alias-label-tertiary); }
.sol-exp-rename-input { flex:1; min-width:0; box-sizing:border-box; border:1px solid var(--dsw-alias-brand-primary); border-radius:4px; background:var(--dsw-alias-bg-input); color:var(--dsw-alias-label-primary); font:inherit; font-size:13px; line-height:20px; padding:0 4px; outline:none; }

/* Settings page ("资源管理器" section) — flat grouped cards matching the
   native notification settings page style. */
.sol-set-root { display: flex; flex-direction: column; gap: 12px; max-width: 760px; color: var(--dsw-alias-label-primary); padding: 0 2px; }
.sol-set-heading { margin: 0; font-size: 18px; font-weight: 600; }
.sol-set-intro { margin: 0; font-size: 13px; color: var(--dsw-alias-label-tertiary); }
.sol-set-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-3); }
.sol-set-card-head { padding: 14px 16px 0; display: flex; flex-direction: column; gap: 4px; }
.sol-set-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.sol-set-desc { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.sol-set-card-body { padding: 4px 16px 8px; }
.sol-set-field { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; }
.sol-set-field + .sol-set-field { border-top: 1px solid var(--dsw-alias-border-l2); }
.sol-set-label { font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.sol-set-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.sol-set-input { height: 34px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); font: inherit; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-primary); box-sizing: border-box; }
.sol-set-input:focus-visible { outline: none; border-color: var(--dsw-alias-brand-primary); }
.sol-set-input:disabled { opacity: .5; cursor: default; }
.sol-set-input[type='number'] { width: 120px; }
.sol-set-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.sol-set-discard, .sol-set-save { appearance: none; border: 1px solid transparent; border-radius: 8px; padding: 5px 14px; font: inherit; font-size: 13px; line-height: 1.5; cursor: pointer; }
.sol-set-discard { border-color: var(--dsw-alias-border-l2); background: none; color: var(--dsw-alias-label-secondary); }
.sol-set-discard:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
.sol-set-save { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); }
.sol-set-save:hover { opacity: .9; }
.sol-set-saved { margin-right: auto; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-state-success-primary); }
.sol-set-sw { position: relative; display: inline-block; width: 36px; height: 20px; vertical-align: middle; cursor: pointer; }
.sol-set-sw input { opacity: 0; width: 0; height: 0; position: absolute; }
.sol-set-sw-track { position: absolute; inset: 0; background: var(--dsw-alias-bg-layer-2); border-radius: 10px; transition: background .18s; }
.sol-set-sw input:checked + .sol-set-sw-track { background: var(--dsw-alias-button-info-fill); }
.sol-set-sw-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .18s; }
.sol-set-sw input:checked + .sol-set-sw-track .sol-set-sw-thumb { left: 18px; }
`
