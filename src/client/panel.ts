import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client"

import { Terminal } from "@xterm/xterm"

import { FitAddon } from "@xterm/addon-fit"

import { STYLES } from "./styles.ts"

import { XTERM_CSS } from "./xterm-css.ts"

import { setLanguage, t } from "./locales.ts"

import { editorStore, notifyEditorListeners } from "./state/editor-store.ts"

import { diffStore, notifyDiffListeners } from "./state/diff-store.ts"

import { escapeHtml, relTime } from "./shared/dom.ts"

import { showToast, showConfirm, showPrompt } from "./shared/ui.ts"

import { folderIcon, fileIcon, isImageFile, gitStatusClass } from "./explorer/icons.ts"

import { createInitialState } from "./state/store.ts"

import { buildExplorerContent, loadTree, refreshTreeSilent, registerTreeBridges } from "./explorer/tree-render.ts"

import { buildSearchContent, searchFiles, registerSearchBridges } from "./explorer/search.ts"

import { registerClipboardBridges } from "./explorer/clipboard.ts"

import { registerContextMenuBridges } from "./explorer/context-menu.ts"

import { buildSCMTopHTML, buildSCMContent } from "./scm/scm-view.ts"

import { resetGraph, commitsListHTML, renderGraphRow } from "./scm/graph.ts"

import { getCommitDetail, ensureCommitDetailInline, reapplyCommitDetailInline, hideCommitTooltip, scheduleHideCommitTooltip, cancelHideCommitTooltip, showCommitTooltip, loadRecentCommits, loadCommitsPage } from "./scm/history.ts"

import { loadGitStatus, loadRepos, doStage, doUnstage, doDiscard, doCommit } from "./scm/actions.ts"

import { loadRemotes, loadBranches, loadTags } from "./scm/branches.ts"

import { registerScmBridges } from "./scm/bridges.ts"

import { applyGrid, mountColumn, registerGridBridges } from "./layout/grid.ts"

import { waitForFrame } from "./layout/lifecycle.ts"

import { createTerminalController } from "./terminal-client/terminal.ts"

import { registerEditorBridges } from "./editor/editor-bridges.ts"

export function mountPanel(ctx: ClientContext): void {
			ctx.effect(() => {

				const state = createInitialState();









				// Persisted collapsed state of SCM sections. Kept in state (not
				// only as a DOM class) so any render() / silent refresh rebuilds
				// the section with the class — otherwise the repository section
				// (and the top-half sections after a status refresh) silently
				// re-expand and the collapse button looks broken.








				const gitRoot = () => state.scm.activeRepo || state.root;


				// Cached innerHTML of the recent-commits list: null = not loaded
				// yet (render shows the loading placeholder), "" = loaded but
				// empty. render() rebuilds the list from this cache, so a render
				// landing after the git-log response can never wipe a filled
				// list back to the placeholder (e.g. tree/repos loads finishing
				// late after a conversation switch).
				// Generation counter: bumped on every reload/switch so a git-log
				// fetch still in flight for the previous repo/branch is discarded
				// instead of writing stale commits into the current list.
				// Commit-detail cache (hash -> detail) shared by the inline
				// expansion and the hover tooltip; cleared on session change.
				// Hover tooltip state for commit rows (custom tooltip replaces
				// the native title attribute).
				// Remotes fetch guard for the "open on GitHub" tooltip link.



				let loadSeq = 0;

				function render() {

					// During a divider drag the SCM DOM must stay untouched: any
					// rebuild here would reset flex-basis from the dragged pixel
					// value back to the percentage default and make the divider
					// jump (visible on the first drag after startup).
					if (state.scm.scmDragging) return;

					if (!state.activeEl) return;

					setLanguage(document.documentElement.lang?.startsWith("zh") ? "zh" : "en");

					// Folded: render only the compact rail — the expand control
					// plus the three feature icons — instead of the activity
					// bar + body. The shell column keeps its border, so the
					// rail reads as a sibling of the native collapsed sidebar.
					if (state.layout.panelCollapsed) {

						// Rail expand control mirrors the native sidebar rail: a
						// 16px panel-left glyph (same Figma source the shell
						// swaps in on rail hover), so the folded panel reads as
						// a sibling of the native collapsed rail.
						state.activeEl.innerHTML = `<div class="sol-exp-panel sol-exp-panel-rail"><button class="sol-exp-rail-btn" title="${document.documentElement.lang?.startsWith("zh") ? "展开面板" : "Expand panel"}" onclick="window.__solExpTogglePanel()"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z"/></svg></button><button class="sol-exp-rail-icon" title="${t("panel.explorer")}" onclick="window.__solExpRailOpen('explorer')"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h5l1.5 1.5h6a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button><button class="sol-exp-rail-icon" title="${t("file.search")}" onclick="window.__solExpRailOpen('search')"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M9.8 9.8L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button><button class="sol-exp-rail-icon" title="${t("panel.scm")}" onclick="window.__solExpRailOpen('scm')"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M6 5C6 4.44772 6.44772 4 7 4C7.55228 4 8 4.44772 8 5C8 5.55228 7.55228 6 7 6C6.44772 6 6 5.55228 6 5ZM8 7.82929C9.16519 7.41746 10 6.30622 10 5C10 3.34315 8.65685 2 7 2C5.34315 2 4 3.34315 4 5C4 6.30622 4.83481 7.41746 6 7.82929V16.1707C4.83481 16.5825 4 17.6938 4 19C4 20.6569 5.34315 22 7 22C8.65685 22 10 20.6569 10 19C10 17.7334 9.21506 16.6501 8.10508 16.2101C8.45179 14.9365 9.61653 14 11 14H13C16.3137 14 19 11.3137 19 8V7.82929C20.1652 7.41746 21 6.30622 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.30622 15.8348 7.41746 17 7.82929V8C17 10.2091 15.2091 12 13 12H11C9.87439 12 8.83566 12.3719 8 12.9996V7.82929ZM18 6C18.5523 6 19 5.55228 19 5C19 4.44772 18.5523 4 18 4C17.4477 4 17 4.44772 17 5C17 5.55228 17.4477 6 18 6ZM6 19C6 18.4477 6.44772 18 7 18C7.55228 18 8 18.4477 8 19C8 19.5523 7.55228 20 7 20C6.44772 20 6 19.5523 6 19Z" fill="currentColor"/></svg>${state.scm.gitChangesCount > 0 ? `<span class="sol-exp-activity-badge">${state.scm.gitChangesCount}</span>` : ""}</button><button class="sol-exp-rail-icon sol-exp-terminal-toggle${state.terminal.terminalOpen ? " active" : ""}" title="${document.documentElement.lang?.startsWith("zh") ? "终端" : "Terminal"}" onclick="window.__solExpToggleTerminal()"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 5.5l2.5 2.5-2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 10.5h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>`;

						return;

					}

					state.activeEl.innerHTML = buildHTML();
					hideCommitTooltip(historyDeps);
					reapplyCommitDetailInline(historyDeps);

				}

				

				// Silent auto-refresh: pull a new tree and reconcile it into the
				// existing DOM (no loading state, no flash); failures keep the
				// current tree untouched.
				

				

				
				


				

				

				

				

				function buildHTML() {

					const activityBarHTML = `

        <div class="sol-exp-activity">

          <div class="sol-exp-activity-btn ${state.currentTab === "explorer" ? "active" : ""}" onclick="window.__solExpTab('explorer')" title="${t("panel.explorer")}">

            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h5l1.5 1.5h6a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>

          </div>

          <div class="sol-exp-activity-btn ${state.currentTab === "search" ? "active" : ""}" onclick="window.__solExpTab('search')" title="${t("file.search")}">

            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.3"/><path d="M9.8 9.8L14 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>

          </div>

          <div class="sol-exp-activity-btn ${state.currentTab === "scm" ? "active" : ""}" onclick="window.__solExpTab('scm')" title="${t("panel.scm")}">

            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M6 5C6 4.44772 6.44772 4 7 4C7.55228 4 8 4.44772 8 5C8 5.55228 7.55228 6 7 6C6.44772 6 6 5.55228 6 5ZM8 7.82929C9.16519 7.41746 10 6.30622 10 5C10 3.34315 8.65685 2 7 2C5.34315 2 4 3.34315 4 5C4 6.30622 4.83481 7.41746 6 7.82929V16.1707C4.83481 16.5825 4 17.6938 4 19C4 20.6569 5.34315 22 7 22C8.65685 22 10 20.6569 10 19C10 17.7334 9.21506 16.6501 8.10508 16.2101C8.45179 14.9365 9.61653 14 11 14H13C16.3137 14 19 11.3137 19 8V7.82929C20.1652 7.41746 21 6.30622 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.30622 15.8348 7.41746 17 7.82929V8C17 10.2091 15.2091 12 13 12H11C9.87439 12 8.83566 12.3719 8 12.9996V7.82929ZM18 6C18.5523 6 19 5.55228 19 5C19 4.44772 18.5523 4 18 4C17.4477 4 17 4.44772 17 5C17 5.55228 17.4477 6 18 6ZM6 19C6 18.4477 6.44772 18 7 18C7.55228 18 8 18.4477 8 19C8 19.5523 7.55228 20 7 20C6.44772 20 6 19.5523 6 19Z" fill="currentColor"/></svg>

            ${state.scm.gitChangesCount > 0 ? `<span class="sol-exp-activity-badge">${state.scm.gitChangesCount}</span>` : ""}

          </div>

          <div class="sol-exp-activity-btn ${state.terminal.terminalOpen ? "active" : ""}" onclick="window.__solExpToggleTerminal()" title="${t("panel.terminal")}">

            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 5.5l2.5 2.5-2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 10.5h2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>

          </div>

          <div style="flex:1"></div>

          <div class="sol-exp-activity-btn" onclick="window.__solExpTogglePanel()" title="${document.documentElement.lang?.startsWith("zh") ? "收起面板" : "Collapse panel"}">

            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z"/></svg>

          </div>

          </div>

      `;

					let contentHTML = "";

					if (state.currentTab === "scm") contentHTML = '<div class="sol-exp-scm-host" data-sol-exp-scm-host>' + buildSCMContent(state.scm, state.commits, state.root) + '</div>';

					else if (state.currentTab === "search") contentHTML = buildSearchContent(state.search, state.tree, state.root);

					else contentHTML = buildExplorerContent(state.tree, state.clipboard, state.root);

					return `

        <div class="sol-exp-panel" ondragover="event.preventDefault()" ondrop="event.preventDefault();window.__solExpDrop('', event)" oncontextmenu="window.__solExpPanelContextMenu(event)">

          ${activityBarHTML}

          <div class="sol-exp-body"><div class="sol-exp-main">${contentHTML}</div></div>

        </div>

      `;

				}

				

				

				// The change-list half of the SCM panel (conflicts + commit box +
				// changes + staged). Extracted so a git-status refresh can
				// update ONLY this region, leaving the repository/commits half
				// (and its scroll/loading state) untouched.
				

				

				

				// ─── File-type icons (VS Code style, inline SVG) ────────────────
				// Type colors are content colors (like diff +/- and git status hues),
				// intentionally fixed for cross-theme recognition. Badges are white
				// strokes on the colored file outline.

				

				// Incremental tree update: reconcile the existing tree DOM against
				// a new tree, patching only the nodes that changed (keyed by
				// data-sol-exp-path). Unchanged nodes keep their DOM, so the
				// expanded state and scroll position survive and nothing flashes.
				


				window.__solExpTab = (tab) => {

					state.currentTab = tab as "explorer" | "search" | "scm";

					render();

					if (tab === "scm") {

						// Reload status and commit history when the SCM tab
						// opens — the commit list is only populated here and
						// on explicit refresh, never by background polling.
						loadGitStatus(actionsDeps);

						loadRecentCommits(historyDeps);

					}

				};

				// A rail feature icon expands the column back and opens that
				// tab in one click (the rail itself has no body to render).
				window.__solExpRailOpen = (tab) => {

					state.layout.panelCollapsed = false;

					window.__solExpTab(tab);

					applyGrid(gridDeps);

				};








				// ── Commit-row hover tooltip (event delegation) ─────────────
				document.addEventListener("mouseover", (e) => {
					const target = e.target;
					if (!(target instanceof Element)) return;
					// Hovering the tooltip itself keeps it alive.
					if (target.closest(".sol-exp-commit-tooltip")) { cancelHideCommitTooltip(historyDeps); return; }
					const row = target.closest(".sol-exp-commit-item");
					if (row && row.closest("#sol-exp-commits-list")) {
						cancelHideCommitTooltip(historyDeps);
						const hash = row.getAttribute("data-hash") || "";
						if (hash && hash !== state.commits.commitTipPending) {
							if (state.commits.commitTipShowTimer) clearTimeout(state.commits.commitTipShowTimer);
							state.commits.commitTipPending = hash;
							state.commits.commitTipShowTimer = setTimeout(() => {
								state.commits.commitTipShowTimer = 0;
								if (state.commits.commitTipPending === hash) showCommitTooltip(row, hash, historyDeps);
							}, 350);
						}
						return;
					}
					scheduleHideCommitTooltip(historyDeps);
				});
				document.addEventListener("mouseout", (e) => {
					const target = e.target;
					if (!(target instanceof Element)) return;
					const row = target.closest(".sol-exp-commit-item");
					if (row && !row.contains(e.relatedTarget as Node)) scheduleHideCommitTooltip(historyDeps);
				});
				// Hide tooltip on any scroll (row position is stale after scroll).
				document.addEventListener("scroll", () => hideCommitTooltip(historyDeps), true);

				const dragGuard = (e) => {

					if (state.activeEl?.contains(e.target as Node)) e.preventDefault();

				};

				document.addEventListener("dragenter", dragGuard);

				document.addEventListener("dragover", dragGuard);

				document.addEventListener("drop", dragGuard);

				document.addEventListener("click", (e) => {

					if (!state.activeEl?.contains(e.target as Node)) return;

					const el = e.target as HTMLElement;

					if (el.closest(".sol-exp-tree-node") || el.closest(".sol-exp-search-item") || el.closest(".sol-exp-scm-item") || el.closest(".sol-exp-context-menu") || el.closest(".sol-exp-commit-item") || el.closest(".sol-exp-commit-detail-inline")) return;

					if (state.tree.selectedPaths.size || state.tree.selectedPath) {

						state.tree.selectedPaths = /* @__PURE__ */ new Set<string>();

						state.tree.selectionAnchor = null;

						state.tree.selectedPath = null;

						render();

					}

				});

				document.addEventListener("dragend", () => {

					if (state.clipboard.dragPaths.length || state.clipboard.dropTargetPath) {

						state.clipboard.dragPaths = [];

						state.clipboard.dropTargetPath = null;

						render();

					}

				});



				window.__solExpTogglePanel = () => {

					// Expand back: drop the folded rail, restore the column at
					// its stored width preference (panelWidth was never
					// rewritten while folded).
					if (state.layout.panelCollapsed) {

						state.layout.panelCollapsed = false;

						render();

						applyGrid(gridDeps);

						return;

					}

					// Nothing to fold while the panel is closed (auto-open off
					// or no session root): the control is only reachable from
					// the expanded column, but guard anyway.
					if (state.layout.panelWidth <= 0) return;

					state.layout.panelCollapsed = true;

					render();

					applyGrid(gridDeps);

				};


				const PANEL_WIDTH_DEFAULT = 280;




				const PANEL_MIN = 264;

				const PANEL_MAX = 560;

				// Collapsed rail width mirrors the native sidebar rail (56px:
				// 10px side padding + 36px control box) so the folded panel
				// reads as a sibling of the shell's own collapsed sidebar.
				const PANEL_RAIL = 56;



				// Whole-panel fold state: folded shows the compact rail instead
				// of the full column. panelWidth keeps the expanded preference
				// untouched while folded, so expanding restores the exact width.

				// ── Embedded multi-tab terminal (ConPTY via the host service) ──
				const terminal = createTerminalController({ state, render });

				// Pull the user-editable panel config (settings page). Settings
				// are STARTUP DEFAULTS only: they decide the initial width when
				// the panel first appears. After that the drag owns the width —
				// nothing here follows the sidebar or rewrites a dragged value.
				const applySettings = () => {
					fetch("/solution-explorer/settings").then((r) => r.json()).then((res) => {
						if (res && res.ok && res.value) {
							// Hide the DSH built-in right-bar expand button while it is
							// collapsed (the right-bar service stays intact — only the
							// button's CSS is suppressed).
							const hideRightbar = !!res.value.hideOfficialRightbarExpand;
							const styleId = "sol-exp-hide-rightbar-expand";
							const existing = document.getElementById(styleId);
							if (hideRightbar && !existing) {
								const style = document.createElement("style");
								style.id = styleId;
								style.textContent = "[data-sidebar-right-expand]{display:none !important}";
								document.head.appendChild(style);
							} else if (!hideRightbar && existing) {
								existing.remove();
							}
							if (typeof res.value.defaultWidth === "number" && res.value.defaultWidth >= PANEL_MIN && res.value.defaultWidth <= PANEL_MAX) state.layout.PANEL_WIDTH = res.value.defaultWidth;
							if (typeof res.value.autoOpen === "boolean") state.layout.panelAutoOpen = res.value.autoOpen;
							if (typeof res.value.terminalHeight === "number") state.terminal.terminalHeight = res.value.terminalHeight;
							if (typeof res.value.terminalMaxHeight === "number") state.terminal.terminalMaxHeight = res.value.terminalMaxHeight;
							if (state.terminal.terminalHeight > state.terminal.terminalMaxHeight) state.terminal.terminalHeight = state.terminal.terminalMaxHeight;
							if (typeof res.value.terminalMaxTabs === "number") state.terminal.terminalMaxTabs = res.value.terminalMaxTabs;
							if (typeof res.value.terminalShell === "string") state.terminal.terminalShell = res.value.terminalShell;
							// Re-apply immediately to an already-open terminal:
							// height follows the saved value; the + button and tab
							// cap follow maxTabs. (Shell changes affect NEW tabs.)
							if (state.terminal.terminalOpen && state.terminal.terminalShellEl !== null) {
								state.terminal.terminalShellEl.style.height = state.terminal.terminalHeight + "px";
								terminal.placeTerminal();
								window.setTimeout(terminal.fitTerminal, 60);
								terminal.renderTerminalTabs();
							}
							state.layout.settingsLoaded = true;
							// Width/visibility are first-time defaults only —
							// never after a drag. The tree, however, always
							// reloads so filter/show-hidden changes apply.
							if (state.root !== "" && !state.layout.panelDragged && state.layout.panelFrame !== null) {
								state.layout.panelWidth = state.layout.panelAutoOpen ? state.layout.PANEL_WIDTH : 0;
								// A zero width means "closed": no folded rail may
								// linger after settings re-apply (e.g. autoOpen off).
								if (state.layout.panelWidth === 0) state.layout.panelCollapsed = false;
								applyGrid(gridDeps);
							}
							if (state.root !== "") loadTree({ state, render });
						}
					}).catch(() => {});
				};
				applySettings();
				window.addEventListener("sol-exp-settings-saved", applySettings);

				// Grid deps: injected into layout/grid + lifecycle functions.
				const gridDeps = { state, render, applySettings };








				

				

				

				

				



				

				function handleSessionChange() {

					const snapshot = ctx.sessions.list.getSnapshot();

					const sessionId = snapshot.current;

					const cwd = sessionId === void 0 ? void 0 : snapshot.byId[sessionId]?.cwd;

					const newRoot = typeof cwd === "string" && cwd !== "" ? cwd : "";

					// The snapshot fires on any session-list change; only a
					// cwd switch may reset the panel width, otherwise a live
					// session event during a drag would snap the panel back
					// to its default (a "wrong direction" jump).
					if (newRoot === state.root) return;

					if (newRoot !== "") {
						// Settings have not loaded yet: do not flash the panel
						// open with defaults; mountColumn re-applies once ready.
						if (!state.layout.settingsLoaded) {
							state.layout.panelWidth = 0;
						} else if (!state.layout.panelDragged) {
							state.layout.panelWidth = state.layout.panelAutoOpen ? state.layout.PANEL_WIDTH : 0;
						}
						// panelDragged: keep the dragged width across session
						// switches — the user's drag owns it until restart.
					} else {
						state.layout.panelWidth = 0;
					}

					// A zero width means "closed": no folded rail may linger
					// when the panel is closed (no root yet, or auto-open off).
					if (state.layout.panelWidth === 0) state.layout.panelCollapsed = false;

					if (state.layout.panelFrame !== null) applyGrid(gridDeps);

					state.root = newRoot;

					state.tree.treeState = null;

					state.scm.gitStatus = null;

					state.scm.gitChangesCount = 0;

					// Invalidate any in-flight commits fetch from the previous
					// conversation and drop the cached list so the new repo's
					// history starts from the loading placeholder.
					state.commits.commitsSeq++;

					state.commits.commitsHTML = null;

					state.commits.commitsPage = 0;

					state.commits.commitsAllLoaded = false;

					state.commits.commitsLoading = false;
					state.commits.commitDetailCache.clear();
					state.commits.remotesResolved = false;

					state.tree.loading = state.root !== "";

					render();

					if (state.root) {

						state.scm.activeRepo = "";

						loadTree({ state, render });

						loadRepos(actionsDeps);

						loadGitStatus(actionsDeps);

					}

				}

				// History deps: injected into scm/history functions.
				const historyDeps = { state, loadRemotes };

				// Actions deps: injected into scm/actions functions.
				const actionsDeps = { state, render, loadRecentCommits };

				// Editor bridges deps: injected into editor/editor-bridges.
				const editorBridgesDeps = { state, render, loadGitStatus, actionsDeps };

				// Branches deps: injected into scm/branches functions.
				const branchesDeps = { state };

				// SCM bridges deps: injected into scm/bridges.
				const scmBridgesDeps = {
					state, render,
					actionsDeps, historyDeps, branchesDeps,
					loadGitStatus, loadRepos, loadRecentCommits, loadRemotes, loadBranches, loadTags,
					loadCommitsPage, getCommitDetail, ensureCommitDetailInline, hideCommitTooltip,
					doStage, doUnstage, doDiscard, doCommit,
				};

				const unsub = ctx.sessions.list.subscribe(handleSessionChange);

				handleSessionChange();

				waitForFrame(gridDeps);

				// Auto-refresh the visible tab in place (incremental reconcile —
				// no loading flash): the file tree or the SCM region, whichever
				// is on screen, patched locally every few seconds.
				const autoRefreshTimer = setInterval(() => {

					if (state.root === "" || document.visibilityState !== "visible" || state.scm.scmDragging) return;

					if (state.currentTab === "scm") loadGitStatus(actionsDeps);

					else if (state.currentTab === "explorer") refreshTreeSilent({ state, render });

				}, 4000);

				console.log("[sol-exp] injecting __solExpOpenFile");

				// Explorer bridges (tree interaction + search + clipboard +
				// context-menu) — registered from their domain modules.
				const explorerDisposers = [
					registerTreeBridges({ state, render, loadGitStatus }),
					registerSearchBridges({ state, render }),
					registerClipboardBridges({ state, render, loadGitStatus }),
					registerContextMenuBridges({ state, render, loadGitStatus }),
					registerScmBridges(scmBridgesDeps),
					registerGridBridges(gridDeps),
					registerEditorBridges(editorBridgesDeps),
				];

				return () => {

					for (const d of explorerDisposers) d();

					unsub();

					state.layout.styleObs?.disconnect();

					state.layout.sizeObs?.disconnect();

					state.layout.mountObs?.disconnect();

					if (state.layout.panelFrame !== null && state.layout.panelCol !== null) state.layout.panelCol.remove();

					terminal.dispose();

					state.layout.resizeHandle?.remove();

					[

						"__solExpTab",

						"__solExpToggleExpand",

						"__solExpSelectFile",

						"__solExpCollapseAll",

						"__solExpExpandAll",

						"__solExpRefresh",

						"__solExpSearch",

						"__solExpRefreshSCM", "__solExpCommitsScroll", "__solExpScmDividerDown", "__solExpSelectRepo", "__solExpCommitDetail", "__solExpCommitCheckout",

						"__solExpCommitMsg",

						"__solExpCommit",

						"__solExpStage",

						"__solExpUnstage",

						"__solExpDiscard",

						"__solExpStageAll",

						"__solExpUnstageAll",

						"__solExpDiscardAll",

						"__solExpToggleSection",

						"__solExpTogglePanel",

						"__solExpRailOpen",

						"__solExpToggleTerminal",

						"__solExpClearSearch",

						"__solExpDeleteFile",

						"__solExpRename",

						"__solExpRenameCommit",

						"__solExpRenameCancel",

						"__solExpContextMenu",

						"__solExpOpenFile",

						"__solExpSaveFile",

						"__solExpGetEditorState",

						"__solExpEditorListeners",

						"__solExpOpenDiff",

						"__solExpGetDiffState",

						"__solExpDiffListeners",

						"__solExpSelect",

						"__solExpCopy",

						"__solExpCut",

						"__solExpPaste",

						"__solExpDragStart",

						"__solExpDragOver",

						"__solExpDrop",

						"__solExpDropFiles",

						"__solExpDeletePaths",

						"__solExpPanelContextMenu",

						"__solExpClearSelection",

						"__solExpNew",

						"__solExpGitInit",

						"__solExpFetch",

						"__solExpPull",

						"__solExpPush",

						"__solExpSync",

						"__solExpRemotePanel",

						"__solExpRemoteName",

						"__solExpRemoteUrl",

						"__solExpRemoteAdd",

						"__solExpRemoteRemove",

						"__solExpRemoteSetUrl",

						"__solExpBranchPanel",

						"__solExpBranchName",

						"__solExpBranchFrom",

						"__solExpBranchCreate",

						"__solExpBranchCheckout",

						"__solExpBranchDelete",

						"__solExpBranchRename",

						"__solExpBranchMerge",

						"__solExpBranchPublish"

					].forEach((k) => delete window[k]);


					document.removeEventListener("dragenter", dragGuard);

					document.removeEventListener("dragover", dragGuard);

					document.removeEventListener("drop", dragGuard);

					window.removeEventListener("sol-exp-settings-saved", applySettings);

					clearInterval(autoRefreshTimer);

					document.getElementById("sol-exp-hide-rightbar-expand")?.remove();

				};

			}, "dsh-solution-explorer: wiring");
}
