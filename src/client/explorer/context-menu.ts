/**
 * Context-menu / new / rename / delete commands — explorer domain.
 * Registered via registerContextMenuCommands(deps); deps injected from panel.ts.
 * @module dsh-solution-explorer/client/explorer/context-menu
 */

import { t } from "../locales.ts"

import { showToast, showConfirm } from "../shared/ui.ts"


import type { AppState } from "../state/store.ts"

import { loadTree, refreshTreeSilent } from "./tree-render.ts"
import { commands } from '../commands.ts'

export interface ContextMenuDeps {
  state: AppState
  render: () => void
  loadGitStatus?: (deps?: any) => Promise<void>
}

export function registerContextMenuCommands(deps: ContextMenuDeps): () => void {
  const { state, render } = deps

  /** Look a node up in the loaded tree by path. */
  const findNode = (node: any, path: string): any => {
    if (!node) return null;
    if (node.path === path) return node;
    for (const child of node.children ?? []) {
      const hit = findNode(child, path);
      if (hit) return hit;
    }
    return null;
  };

  /**
   * Where a toolbar-initiated create lands: the selected directory, the selected
   * file's parent, or the workspace root ('').
   */
  const selectedDir = (): string => {
    const first = [...state.tree.selectedPaths][0] ?? state.tree.selectedPath ?? "";
    if (!first) return "";
    const path = String(first).replace(/\\/g, "/");
    const node = findNode(state.tree.treeState, path);
    if (node && node.type === "directory") return path;
    const parts = path.split("/");
    parts.pop();
    return parts.join("/");
  };

  // Command for the host open-native route: open a workspace path with its
  // owning system program (reveal folder / default app / open-with picker /
  // properties dialog). Unsupported platform+action combos answer with a toast.
  const openNative = async (path: string, action: 'reveal' | 'open' | 'openas' | 'properties') => {
    if (!state.root || !path) return;
    try {
      const result = await (await fetch("/solution-explorer/open-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: state.root, path, action }),
      })).json();
      if (!result.ok) showToast(result.error?.message || t("context.openFailed"), true);
    } catch (err) {
      showToast(String((err && err.message) || err), true);
    }
  };
  commands.openNative = openNative;

  const hideContextMenu = () => {
    if (state.contextMenu) {
      state.contextMenu = null;
      render();
    }
  };
  document.addEventListener("click", hideContextMenu);

  /**
   * Open the inline "new file / new folder" row (Explorer style) instead of a
   * dialog: the tree renders an editable row inside `dir` ('' = root). Without
   * an explicit directory (the toolbar buttons) the row lands in the selected
   * directory, or next to the selected file.
   */
  commands.new = (type, dir) => {
    if (!state.root) return;
    const target = dir ? dir.replace(/\\/g, "/") : selectedDir();
    state.tree.creating = { type, dir: target };
    if (target !== "") {
      state.tree.expandedPaths.add(target);
      render();
      // Materialize the target directory's children so the row has a place to
      // live (an empty directory has no children of its own).
      void refreshTreeSilent(deps);
      return;
    }
    render();
  };

  /** Commit the inline create row: create the typed name and refresh the tree. */
  commands.createCommit = async (rawName) => {
    const creating = state.tree.creating;
    if (!creating) return;
    const clean = String(rawName ?? "").trim();
    if (clean === "") {
      commands.createCancel();
      return;
    }
    const rel = creating.dir ? creating.dir + "/" + clean : clean;
    try {
      const result = await (await fetch("/solution-explorer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          path: rel,
          type: creating.type
        })
      })).json();
      if (!result.ok) {
        // Keep the row open so the name can be fixed.
        showToast("创建失败: " + (result.error?.message || ""), true);
        return;
      }
      state.tree.creating = null;
      loadTree(deps);
      deps.loadGitStatus?.(deps);
    } catch (err) {
      showToast("创建失败: " + (err.message || String(err)), true);
    }
  };

  commands.createCancel = () => {
    if (!state.tree.creating) return;
    state.tree.creating = null;
    render();
  };

  commands.panelContextMenu = (evt) => {
    evt.preventDefault();
    const el = evt.target as HTMLElement;
    if (el && (el.closest(".sol-exp-header") || el.closest(".sol-exp-activity") || el.closest(".sol-exp-commit-box"))) return;
    commands.contextMenu("", evt.pageX, evt.pageY, false);
  };

  commands.contextMenu = (target, x, y, isDir = false) => {
    hideContextMenu();
    if (target && !state.tree.selectedPaths.has(target)) {
      state.tree.selectedPaths = new Set([target]);
      state.tree.selectionAnchor = target;
      state.tree.selectedPath = target;
    }
    // The menu is React-rendered from state now: collect its entries here and
    // let PanelRoot render <ContextMenu> through a portal.
    const entries: import("../state/store.ts").ContextMenuEntry[] = [];
    const addItem = (label: string, danger: boolean, onClick: () => void) => {
      entries.push({ label, danger, onSelect: onClick });
    };

    const targets = target && state.tree.selectedPaths.has(target) ? [...state.tree.selectedPaths] : target ? [target] : [];
    const base = isDir ? target : target ? target.includes("/") ? target.slice(0, target.lastIndexOf("/")) : target.includes("\\") ? target.slice(0, target.lastIndexOf("\\")) : "" : "";

    addItem("新建文件", false, () => commands.new("file", base));
    addItem("新建文件夹", false, () => commands.new("dir", base));
    // Reveal acts on the right-clicked path itself — a file or a folder (single-object
    // semantic), even when a multi-selection containing it is active.
    if (target) addItem(t("context.reveal"), false, () => commands.openNative(target, "reveal"));

    if (targets.length) {
      if (targets.length === 1) {
        addItem("重命名", false, () => commands.rename(targets[0]));
        if (!isDir) {
          addItem(t("context.open"), false, () => commands.openNative(targets[0], "open"));
          addItem(t("context.openWith"), false, () => commands.openNative(targets[0], "openas"));
          addItem(t("context.properties"), false, () => commands.openNative(targets[0], "properties"));
        }
      }
      addItem("复制", false, () => {
        commands.copy();
      });
      addItem("剪切", false, () => {
        commands.cut();
      });
      addItem("删除 (" + targets.length + ")", true, () => commands.deletePaths(targets));
      addItem("复制相对路径", false, () => navigator.clipboard.writeText(targets.join("\n")));
      addItem("复制绝对路径", false, () => {
        const sep = state.root.endsWith("/") || state.root.endsWith("\\") ? "" : "/";
        navigator.clipboard.writeText(targets.map((p) => state.root + sep + p).join("\n"));
      });
    }

    if (state.clipboard.clipboard && state.clipboard.clipboard.paths.length) addItem("粘贴到此处" + (state.clipboard.clipboard.mode === "cut" ? "（剪切）" : ""), false, () => commands.paste(isDir ? target : target || ""));

    if (entries.length === 0) return;

    state.contextMenu = { x, y, entries };
    render();
  };

  commands.rename = (path) => {
    state.tree.renamingPath = path;
    render();
    const input = state.activeEl ? state.activeEl.querySelector<HTMLInputElement>("[data-sol-exp-rename]") : null;
    if (input) { input.focus(); input.select(); }
  };

  commands.renameCancel = () => {
    if (!state.tree.renamingPath) return;
    state.tree.renamingPath = "";
    render();
  };

  commands.renameCommit = async (name) => {
    const path = state.tree.renamingPath;
    if (!path) return;
    state.tree.renamingPath = "";
    const newName = String(name || "").trim();
    const oldName = path.split(/[\\/]/).pop() || "";
    if (!newName || newName === oldName) { render(); return; }
    try {
      const result = await (await fetch("/solution-explorer/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: state.root, source: path, newName }),
      })).json();
      if (result.ok) {
        if (state.tree.treeState) refreshTreeSilent(deps);
        else loadTree(deps);
        deps.loadGitStatus?.(deps);
      } else {
        showToast(result.error?.message || "重命名失败", true);
        render();
      }
    } catch (err) {
      showToast(String((err && err.message) || err), true);
      render();
    }
  };

  commands.deletePaths = async (paths) => {
    if (!state.root || !paths.length) return;
    const zh = document.documentElement.lang?.startsWith("zh");
    if (!(await showConfirm({ title: zh ? "删除" : "Delete", message: zh ? "确定删除 " + paths.length + " 项？" : "Delete " + paths.length + " item(s)?", okText: zh ? "删除" : "Delete", danger: true }))) return;
    let done = 0, failed = 0;
    for (const p of paths) try {
      const result = await (await fetch("/solution-explorer/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          path: p
        })
      })).json();
      if (result.ok) done++;
      else {
        failed++;
        console.warn("[sol-exp] delete failed", p, result.error);
      }
    } catch (err) {
      failed++;
      console.warn("[sol-exp] delete error", p, err);
    }
    for (const p of paths) state.tree.selectedPaths.delete(p);
    // Close the editor tabs of deleted files so a stale preview (an image
    // especially) cannot linger.
    for (const p of paths) commands.closePath?.(p);
    if (failed) showToast(failed + " 项删除失败", true);
    // Silent refresh: reconcile the tree in place and update SCM state — no
    // loading flash, no full-panel rebuild.
    if (state.tree.treeState) refreshTreeSilent(deps);
    else loadTree(deps);
    deps.loadGitStatus?.(deps);
  };

  commands.deleteFile = async (target) => {
    if (target) await commands.deletePaths([target]);
  };

  return () => {
    document.removeEventListener("click", hideContextMenu);
    delete commands.new;
    delete commands.createCommit;
    delete commands.createCancel;
    delete commands.openNative;
    delete commands.panelContextMenu;
    delete commands.contextMenu;
    delete commands.rename;
    delete commands.renameCancel;
    delete commands.renameCommit;
    delete commands.deletePaths;
    delete commands.deleteFile;
  };
}
