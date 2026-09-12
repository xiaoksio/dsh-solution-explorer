import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client"




import { commands } from "./commands.ts"


import { setLanguage } from "./locales.ts"






import { createInitialState } from "./state/store.ts"

import { loadTree, refreshTreeSilent, registerTreeCommands } from "./explorer/tree-render.ts"

import { registerSearchCommands } from "./explorer/search.ts"

import { registerClipboardCommands } from "./explorer/clipboard.ts"

import { registerContextMenuCommands } from "./explorer/context-menu.ts"


import { getCommitDetail, hideCommitTooltip, scheduleHideCommitTooltip, cancelHideCommitTooltip, showCommitTooltip, loadRecentCommits, loadCommitsPage } from "./scm/history.ts"

import { loadGitStatus, loadRepos, doStage, doUnstage, doDiscard, doCommit } from "./scm/actions.ts"

import { loadRemotes, loadBranches, loadTags } from "./scm/branches.ts"

import { registerScmCommands } from "./scm/commands.ts"

import { applyGrid, registerGridCommands } from "./layout/grid.ts"

import { waitForFrame } from "./layout/lifecycle.ts"

import { createTerminalController } from "./terminal-client/terminal.ts"

import { registerEditorCommands } from "./editor/editor-commands.ts"

import { createElement as h } from "react"

import { createRoot } from "react-dom/client"

import type { Root } from "react-dom/client"

import { flushSync } from "react-dom"

import { PanelRoot } from "./PanelRoot.ts"

import type { PanelActions } from "./PanelRoot.ts"

export function mountPanel(ctx: ClientContext): void {
			ctx.effect(() => {

				const state = createInitialState();




				let reactRoot: Root | null = null;

				// Panel actions handed to the React tree. Each one calls the
				// command registered by its domain module, so behaviour is
				// unchanged while the last commands are still registry-backed.
				const panelActions: PanelActions = {
					tab: (tab) => { commands.tab?.(tab) },
					railOpen: (tab) => { commands.railOpen?.(tab) },
					togglePanel: () => { commands.togglePanel?.() },
					toggleTerminal: () => { commands.toggleTerminal?.() },
					closeMenu: () => { state.contextMenu = null; render() },
					tree: {
						select: (path, shift, ctrl, isDir) => { commands.select?.(path, shift, ctrl, isDir) },
						openFile: (path) => { void commands.openFile?.(path) },
						contextMenu: (path, x, y, isDir) => { commands.contextMenu?.(path, x, y, isDir) },
						expandAll: () => { commands.expandAll?.() },
						collapseAll: () => { commands.collapseAll?.() },
						newFile: () => { void commands.new?.("file", "") },
						newDir: () => { void commands.new?.("dir", "") },
						refresh: () => { commands.refresh?.() },
						renameCommit: (value) => { void commands.renameCommit?.(value) },
						createCommit: (value) => { void commands.createCommit?.(value) },
						createCancel: () => { commands.createCancel?.() },
						renameCancel: () => { commands.renameCancel?.() },
						dragStart: (path) => { commands.dragStart?.(path) },
						dragOver: (path) => { commands.dragOver?.(path, undefined as unknown as DragEvent) },
						drop: (path, e) => { void commands.drop?.(path, e as unknown as DragEvent) },
					},
					search: {
						search: (query) => { commands.search?.(query) },
						selectFile: (path, isDir) => { void commands.selectFile?.(path, isDir) },
						contextMenu: (path, x, y, isDir) => { commands.contextMenu?.(path, x, y, isDir) },
					},
					scm: {
						toggleSection: (id) => { commands.toggleSection?.(id) },
						refresh: () => { commands.refreshSCM?.() },
						stage: (paths) => { commands.stage?.(paths) },
						unstage: (paths) => { commands.unstage?.(paths) },
						discard: (paths) => { commands.discard?.(paths) },
						stageAll: () => { commands.stageAll?.() },
						unstageAll: () => { commands.unstageAll?.() },
						discardAll: () => { commands.discardAll?.() },
						commitMsg: (v) => { commands.commitMsg?.(v) },
						commit: () => { commands.commit?.() },
						genCommitMsg: () => { void commands.genCommitMsg?.() },
						selectRepo: (p) => { commands.selectRepo?.(p) },
						remotePanel: () => { void commands.remotePanel?.() },
						branchPanel: () => { void commands.branchPanel?.() },
						fetch: () => { void commands.fetch?.() },
						pull: () => { void commands.pull?.() },
						push: () => { void commands.push?.() },
						sync: () => { void commands.sync?.() },
						remoteName: (v) => { commands.remoteName?.(v) },
						remoteUrl: (v) => { commands.remoteUrl?.(v) },
						remoteAdd: () => { void commands.remoteAdd?.() },
						remoteRemove: (n) => { void commands.remoteRemove?.(n) },
						remoteSetUrl: (n) => { void commands.remoteSetUrl?.(n) },
						branchName: (v) => { commands.branchName?.(v) },
						branchFrom: (v) => { commands.branchFrom?.(v) },
						branchCreate: () => { void commands.branchCreate?.() },
						branchCheckout: (n) => { void commands.branchCheckout?.(n) },
						branchDelete: (n) => { void commands.branchDelete?.(n) },
						branchRename: (n) => { void commands.branchRename?.(n) },
						branchMerge: (n) => { void commands.branchMerge?.(n) },
						branchPublish: (n) => { void commands.branchPublish?.(n) },
						gitInit: () => { void commands.gitInit?.() },
						openDiff: (p, s) => { void commands.openDiff?.(p, s) },
						openFile: (p) => { void commands.openFile?.(p) },
						selectFile: (p, d) => { void commands.selectFile?.(p, d) },
						dividerDown: (e) => { commands.scmDividerDown?.(e as PointerEvent) },
						commitsScroll: (e) => { commands.commitsScroll?.(e as Event) },
						commitDetail: (hash) => { void commands.commitDetail?.(hash) },
						commitCheckout: (hash) => { void commands.commitCheckout?.(hash) },
					},
				};

				function renderReact() {
					if (!state.activeEl) return;
					if (reactRoot === null) reactRoot = createRoot(state.activeEl);
					// Synchronous commit: callers that inspect the SCM DOM right
					// after render() (divider drag, scroll restore) must not race
					// React 18's deferred default.
					flushSync(() => {
						reactRoot!.render(h(PanelRoot, { state, actions: panelActions }));
					});
				}

				function render() {

					// During a divider drag the SCM DOM must stay untouched: any
					// rebuild here would reset flex-basis from the dragged pixel
					// value back to the percentage default and make the divider
					// jump (visible on the first drag after startup).
					if (state.scm.scmDragging) return;

					if (!state.activeEl) return;

					setLanguage(document.documentElement.lang?.startsWith("zh") ? "zh" : "en");

					// The whole panel renders through the React root now.
					renderReact();

					return;


				}

				

				// Silent auto-refresh: pull a new tree and reconcile it into the
				// existing DOM (no loading state, no flash); failures keep the
				// current tree untouched.
				

				

				
				


				

				

				

				


				

				

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
				


				commands.tab = (tab) => {

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
				commands.railOpen = (tab) => {

					state.layout.panelCollapsed = false;

					commands.tab(tab);

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



				commands.togglePanel = () => {

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






				const PANEL_MIN = 264;

				const PANEL_MAX = 560;

				// Collapsed rail width mirrors the native sidebar rail (56px:
				// 10px side padding + 36px control box) so the folded panel
				// reads as a sibling of the shell's own collapsed sidebar.



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

					// Expand state is per-workspace: a path expanded in the old
					// root means nothing in the new one.
					state.tree.expandedPaths = new Set();

					state.tree.selectedPaths = new Set();

					state.tree.selectionAnchor = null;

					state.tree.selectedPath = null;

					state.scm.gitStatus = null;

					state.scm.gitChangesCount = 0;

					// Invalidate any in-flight commits fetch from the previous
					// conversation and drop the cached list so the new repo's
					// history starts from the loading placeholder.
					state.commits.commitsSeq++;

					state.commits.rows = null;

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
				const historyDeps = { state, loadRemotes, render };

				// Actions deps: injected into scm/actions functions.
				const actionsDeps = { state, render, loadRecentCommits };

				// Editor commands deps: injected into editor/editor-commands.
				const EditorCommandsDeps = { state, render, loadGitStatus, actionsDeps };

				// Branches deps: injected into scm/branches functions.
				const branchesDeps = { state };

				// SCM commands deps: injected into scm/commands.
				const ScmCommandsDeps = {
					state, render,
					actionsDeps, historyDeps, branchesDeps,
					loadGitStatus, loadRepos, loadRecentCommits, loadRemotes, loadBranches, loadTags,
					loadCommitsPage, getCommitDetail, hideCommitTooltip,
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

				// Explorer commands (tree interaction + search + clipboard +
				// context-menu) — registered from their domain modules.
				const explorerDisposers = [
					registerTreeCommands({ state, render, loadGitStatus }),
					registerSearchCommands({ state, render }),
					registerClipboardCommands({ state, render, loadGitStatus }),
					registerContextMenuCommands({ state, render, loadGitStatus }),
					registerScmCommands(ScmCommandsDeps),
					registerGridCommands(gridDeps),
					registerEditorCommands(EditorCommandsDeps),
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

					document.removeEventListener("dragenter", dragGuard);

					document.removeEventListener("dragover", dragGuard);

					document.removeEventListener("drop", dragGuard);

					window.removeEventListener("sol-exp-settings-saved", applySettings);

					clearInterval(autoRefreshTimer);

					// Tear the React root down with the fiber so the panel's
					// component tree (and its effects) never outlive the mount.
					reactRoot?.unmount();

					reactRoot = null;

					document.getElementById("sol-exp-hide-rightbar-expand")?.remove();

				};

			}, "dsh-solution-explorer: wiring");
}
