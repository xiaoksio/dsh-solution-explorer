/**
 * File-tree rendering & loading — explorer domain.
 * View functions receive their state slices explicitly (tree/clipboard);
 * loaders receive deps = { state, render } injected from panel.ts.
 * @module dsh-solution-explorer/client/explorer/tree-render
 */



import type { AppState } from "../state/store.ts"
import { commands } from '../commands.ts'

export interface Deps {
  state: AppState
  render: () => void
  /** Injected cross-domain capability (SCM status refresh). */
  loadGitStatus?: (deps?: any) => Promise<void>
}

/**
 * The tree is fetched pruned to the directories the client renders, so the
 * payload tracks the visible rows instead of the whole workspace. `all` asks
 * for the complete tree (the "expand all" action and nothing else).
 */
function treeUrl(state: AppState, all = false): string {
  const root = encodeURIComponent(state.root);
  if (all) return `/solution-explorer/tree?root=${root}&expand=*`;
  // JSON-encoded so a directory name containing a comma cannot split wrongly.
  const paths = [...state.tree.expandedPaths].map((p) => p.replace(/\\/g, "/"));
  return `/solution-explorer/tree?root=${root}&expand=${encodeURIComponent(JSON.stringify(paths))}`;
}

/** Depth-first lookup of a materialized node by path. */
function findNode(node: any, path: string): any {
  if (!node) return null;
  if (node.path === path) return node;
  for (const child of node.children ?? []) {
    const hit = findNode(child, path);
    if (hit) return hit;
  }
  return null;
}

/** True when the node is a directory whose children have not been fetched. */
function needsChildren(state: AppState, path: string): boolean {
  const node = findNode(state.tree.treeState, path);
  return !!node && node.type === "directory" && node.children === undefined;
}

export async function loadTree({ state, render }: Deps) {

					if (!state.root) return;

					const seq = ++state.loadSeq;

					// First load (no tree yet) shows the loading state; later
					// loads reconcile in place so nothing flashes.
					const hadTree = !!state.tree.treeState;

					if (!hadTree) {

						state.tree.loading = true;

						state.tree.error = null;

						render();

					}

					try {

						const result = await (await fetch(treeUrl(state))).json();

						if (seq !== state.loadSeq || state.root === "") return;

						if (result.ok) {

							state.tree.treeState = result.value;

							if (hadTree) {

								// React renders the tree now: publish the fresh
								// state and let the root re-render (no manual DOM
								// reconciliation).
								render();

							} else {

								render();

							}

						} else if (!hadTree) {

							state.tree.error = result.error?.message || "Failed to load tree";

						}

					} catch (err) {

						if (seq !== state.loadSeq) return;

						if (!hadTree) state.tree.error = err instanceof Error ? err.message : String(err);

					}

					state.tree.loading = false;

					if (!hadTree) render();

				}

/**
 * Whether two listings draw identically.
 *
 * Only the fields the tree renders are compared, and a missing `children` is not
 * the same as an empty one: the tree reads "no children yet" as a directory whose
 * listing still has to be fetched.
 * @param left - the listing in state.
 * @param right - the listing just fetched.
 * @returns true when publishing the new listing would change nothing on screen.
 */
function sameListing(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  if (a.path !== b.path || a.name !== b.name || a.type !== b.type || a.gitStatus !== b.gitStatus) return false;
  const aChildren = a.children as unknown[] | undefined;
  const bChildren = b.children as unknown[] | undefined;
  if (aChildren === undefined || bChildren === undefined) return aChildren === bChildren;
  if (aChildren.length !== bChildren.length) return false;
  for (let index = 0; index < aChildren.length; index += 1) {
    if (!sameListing(aChildren[index], bChildren[index])) return false;
  }
  return true;
}

export async function refreshTreeSilent({ state, render }: Deps) {

					if (!state.root || !state.tree.treeState) return;

					const seq = ++state.loadSeq;

					try {

						const result = await (await fetch(treeUrl(state))).json();

						if (seq !== state.loadSeq || state.root === "") return;

						if (result.ok && result.value) {

							// Publish only a listing that draws differently: handing the
							// panel a new object for an unchanged tree re-renders the
							// whole view for nothing, which reads as a blink.
							if (sameListing(state.tree.treeState, result.value)) return;

							state.tree.treeState = result.value;

							// React renders the tree now: re-render from state.
							render();

						}

					} catch { /* silent — keep the current tree */ }

				}

/** Fetch the whole tree and publish it (used by "expand all"). */
export async function loadFullTree({ state, render }: Deps): Promise<any | null> {

					if (!state.root) return null;

					const seq = ++state.loadSeq;

					try {

						const result = await (await fetch(treeUrl(state, true))).json();

						if (seq !== state.loadSeq || state.root === "" || !result.ok || !result.value) return null;

						state.tree.treeState = result.value;

						render();

						return result.value;

					} catch { return null; }

				}

export function registerTreeCommands(deps: Deps): () => void {
  const { state, render } = deps

  commands.toggleExpand = (path) => {
    if (state.tree.expandedPaths.has(path)) {
      state.tree.expandedPaths.delete(path);
      render();
      return;
    }
    state.tree.expandedPaths.add(path);
    // A collapsed directory arrives without children, so expanding one means
    // fetching just that level. Already-loaded directories stay instant.
    const missing = needsChildren(state, path);
    render();
    if (missing) void refreshTreeSilent(deps);
  };

  commands.selectFile = async (path, isDir) => {
    if (isDir) {
      // Directories reveal in the tree (expand ancestors + select) instead of
      // being opened as files — consistent with the tree.
      const parts = path.split("/").filter(Boolean);
      let acc = "";
      let missing = false;
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? acc + "/" + parts[i] : parts[i];
        state.tree.expandedPaths.add(acc);
        if (needsChildren(state, acc)) missing = true;
      }
      state.tree.selectedPaths = new Set([path]);
      state.tree.selectedPath = null;
      render();
      if (missing) void refreshTreeSilent(deps);
      return;
    }
    state.tree.selectedPath = path;
    if (typeof commands.openFile === "function") commands.openFile(path);
  };

  commands.clearSelection = () => {
    if (state.tree.selectedPaths.size || state.tree.selectedPath) {
      state.tree.selectedPaths = new Set<string>();
      state.tree.selectionAnchor = null;
      state.tree.selectedPath = null;
      render();
    }
  };

  commands.select = (path, shift, ctrl, isDir) => {
    if (ctrl) {
      if (state.tree.selectedPaths.has(path)) state.tree.selectedPaths.delete(path);
      else state.tree.selectedPaths.add(path);
      state.tree.selectionAnchor = path;
    } else if (shift && state.tree.selectionAnchor) {
      const order = [];
      const collect = (n) => {
        order.push(n.path);
        for (const c of n.children || []) collect(c);
      };
      if (state.tree.treeState) collect(state.tree.treeState);
      const a = order.indexOf(state.tree.selectionAnchor), b = order.indexOf(path);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        state.tree.selectedPaths = new Set(order.slice(lo, hi + 1));
      } else {
        state.tree.selectedPaths = new Set([path]);
        state.tree.selectionAnchor = path;
      }
    } else {
      state.tree.selectedPaths = new Set([path]);
      state.tree.selectionAnchor = path;
    }
    state.tree.selectedPath = path;
    let expandMissing = false;
    if (isDir) {
      if (state.tree.expandedPaths.has(path)) state.tree.expandedPaths.delete(path);
      else {
        state.tree.expandedPaths.add(path);
        expandMissing = needsChildren(state, path);
      }
    }
    render();
    if (expandMissing) void refreshTreeSilent(deps);
  };

  commands.collapseAll = () => {
    state.tree.expandedPaths = new Set<string>();
    render();
    // Re-fetch so the collapsed listings are dropped host-side too.
    void refreshTreeSilent(deps);
  };

  commands.expandAll = async () => {
    // Everything expanded means everything materialized: this is the one
    // action that legitimately pulls the whole tree.
    const full = await loadFullTree(deps);
    if (!full) return;
    const paths = new Set<string>();
    const collect = (n) => {
      if (n?.type === "directory" && n.path !== "/") {
        paths.add(n.path);
        for (const c of n.children || []) collect(c);
      }
    };
    collect(full);
    state.tree.expandedPaths = paths;
    render();
  };

  commands.refresh = () => {
    // Refresh without the loading flash once a tree exists: reconcile in
    // place; only the very first load falls back to the full loading path.
    if (state.tree.treeState) refreshTreeSilent(deps);
    else loadTree(deps);
    deps.loadGitStatus?.(deps);
  };

  return () => {
    delete commands.toggleExpand;
    delete commands.selectFile;
    delete commands.clearSelection;
    delete commands.select;
    delete commands.collapseAll;
    delete commands.expandAll;
    delete commands.refresh;
  };
}
