/**
 * Context-menu / new / rename / delete bridges — explorer domain.
 * Registered via registerContextMenuBridges(deps); deps injected from panel.ts.
 * @module dsh-solution-explorer/client/explorer/context-menu
 */

import { t } from "../locales.ts"

import { showToast, showConfirm, showPrompt } from "../shared/ui.ts"

import { editorStore, notifyEditorListeners } from "../state/editor-store.ts"

import type { AppState } from "../state/store.ts"

import { loadTree, refreshTreeSilent } from "./tree-render.ts"

export interface ContextMenuDeps {
  state: AppState
  render: () => void
  loadGitStatus?: (deps?: any) => Promise<void>
}

export function registerContextMenuBridges(deps: ContextMenuDeps): () => void {
  const { state, render } = deps

  // Bridge to the host open-native route: open a workspace path with its
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
  window.__solExpOpenNative = openNative;

  const hideContextMenu = () => {
    if (state.contextMenuEl) {
      state.contextMenuEl.remove();
      state.contextMenuEl = null;
    }
  };
  document.addEventListener("click", hideContextMenu);

  window.__solExpNew = async (type, dir) => {
    if (!state.root) return;
    const zh = document.documentElement.lang?.startsWith("zh");
    const name = await showPrompt({
      title: type === "file" ? (zh ? "新建文件" : "New file") : (zh ? "新建文件夹" : "New folder"),
      message: type === "file" ? (zh ? "输入文件名" : "Enter file name") : (zh ? "输入文件夹名" : "Enter folder name")
    });
    if (!name || !name.trim()) return;
    const clean = name.trim();
    const rel = dir ? dir.replace(/\\/g, "/") + "/" + clean : clean;
    try {
      const result = await (await fetch("/solution-explorer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          path: rel,
          type
        })
      })).json();
      if (!result.ok) {
        alert("创建失败: " + (result.error?.message || ""));
        return;
      }
      loadTree(deps);
      deps.loadGitStatus?.();
    } catch (err) {
      alert("创建失败: " + (err.message || String(err)));
    }
  };

  window.__solExpPanelContextMenu = (evt) => {
    evt.preventDefault();
    const el = evt.target as HTMLElement;
    if (el && (el.closest(".sol-exp-header") || el.closest(".sol-exp-activity") || el.closest(".sol-exp-commit-box"))) return;
    window.__solExpContextMenu("", evt.pageX, evt.pageY, false);
  };

  window.__solExpContextMenu = (target, x, y, isDir = false) => {
    hideContextMenu();
    if (target && !state.tree.selectedPaths.has(target)) {
      state.tree.selectedPaths = new Set([target]);
      state.tree.selectionAnchor = target;
      state.tree.selectedPath = target;
    }
    const menu = document.createElement("div");
    menu.className = "sol-exp-context-menu";
    menu.style.left = Math.min(x, window.innerWidth - 160) + "px";
    menu.style.top = Math.min(y, window.innerHeight - 80) + "px";
    menu.addEventListener("click", (e) => e.stopPropagation());
    menu.addEventListener("contextmenu", (e) => e.preventDefault());

    const addItem = (label, danger, onClick) => {
      const item = document.createElement("div");
      item.className = "sol-exp-context-menu-item" + (danger ? " danger" : "");
      item.textContent = label;
      item.addEventListener("click", () => {
        hideContextMenu();
        onClick();
      });
      menu.appendChild(item);
    };

    const targets = target && state.tree.selectedPaths.has(target) ? [...state.tree.selectedPaths] : target ? [target] : [];
    const base = isDir ? target : target ? target.includes("/") ? target.slice(0, target.lastIndexOf("/")) : target.includes("\\") ? target.slice(0, target.lastIndexOf("\\")) : "" : "";

    addItem("新建文件", false, () => window.__solExpNew("file", base));
    addItem("新建文件夹", false, () => window.__solExpNew("dir", base));
    // Intentional: reveal acts on the right-clicked folder only (single-object
    // semantic), even when a multi-selection containing it is active.
    if (isDir && target) addItem(t("context.reveal"), false, () => window.__solExpOpenNative(target, "reveal"));

    if (targets.length) {
      if (targets.length === 1) {
        addItem("重命名", false, () => window.__solExpRename(targets[0]));
        if (!isDir) {
          addItem(t("context.open"), false, () => window.__solExpOpenNative(targets[0], "open"));
          addItem(t("context.openWith"), false, () => window.__solExpOpenNative(targets[0], "openas"));
          addItem(t("context.properties"), false, () => window.__solExpOpenNative(targets[0], "properties"));
        }
      }
      addItem("复制", false, () => {
        window.__solExpCopy();
      });
      addItem("剪切", false, () => {
        window.__solExpCut();
      });
      addItem("删除 (" + targets.length + ")", true, () => window.__solExpDeletePaths(targets));
      addItem("复制相对路径", false, () => navigator.clipboard.writeText(targets.join("\n")));
      addItem("复制绝对路径", false, () => {
        const sep = state.root.endsWith("/") || state.root.endsWith("\\") ? "" : "/";
        navigator.clipboard.writeText(targets.map((p) => state.root + sep + p).join("\n"));
      });
    }

    if (state.clipboard.clipboard && state.clipboard.clipboard.paths.length) addItem("粘贴到此处" + (state.clipboard.clipboard.mode === "cut" ? "（剪切）" : ""), false, () => window.__solExpPaste(isDir ? target : target || ""));

    if (menu.childNodes.length === 0) return;

    document.body.appendChild(menu);
    state.contextMenuEl = menu;
  };

  window.__solExpRename = (path) => {
    state.tree.renamingPath = path;
    render();
    const input = state.activeEl ? state.activeEl.querySelector<HTMLInputElement>("[data-sol-exp-rename]") : null;
    if (input) { input.focus(); input.select(); }
  };

  window.__solExpRenameCancel = () => {
    if (!state.tree.renamingPath) return;
    state.tree.renamingPath = "";
    render();
  };

  window.__solExpRenameCommit = async (name) => {
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

  window.__solExpDeletePaths = async (paths) => {
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
    // If the editor is showing a deleted file, close it so the stale preview
    // (an image especially) cannot linger.
    if (editorStore.file && paths.includes(editorStore.file)) {
      editorStore.file = null;
      editorStore.content = null;
      editorStore.loading = false;
      editorStore.error = null;
      editorStore.unsupported = false;
      editorStore.image = false;
      editorStore.saving = false;
      editorStore.root = "";
      notifyEditorListeners();
    }
    if (failed) alert(failed + " 项删除失败");
    // Silent refresh: reconcile the tree in place and update SCM state — no
    // loading flash, no full-panel rebuild.
    if (state.tree.treeState) refreshTreeSilent(deps);
    else loadTree(deps);
    deps.loadGitStatus?.();
  };

  window.__solExpDeleteFile = async (target) => {
    if (target) await window.__solExpDeletePaths([target]);
  };

  return () => {
    document.removeEventListener("click", hideContextMenu);
    delete window.__solExpNew;
    delete window.__solExpOpenNative;
    delete window.__solExpPanelContextMenu;
    delete window.__solExpContextMenu;
    delete window.__solExpRename;
    delete window.__solExpRenameCancel;
    delete window.__solExpRenameCommit;
    delete window.__solExpDeletePaths;
    delete window.__solExpDeleteFile;
  };
}
