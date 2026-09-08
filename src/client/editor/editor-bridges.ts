/**
 * Editor & diff bridges (window.__solExp*) — editor domain.
 * Registered via registerEditorBridges(deps); deps injected from panel.ts.
 * @module dsh-solution-explorer/client/editor/editor-bridges
 */

import { editorStore, notifyEditorListeners } from "../state/editor-store.ts"

import { diffStore, notifyDiffListeners } from "../state/diff-store.ts"

import { gitRoot, type AppState } from "../state/store.ts"

import { showToast } from "../shared/ui.ts"

import { loadTree } from "../explorer/tree-render.ts"

export interface EditorBridgesDeps {
  state: AppState
  render: () => void
  loadGitStatus?: (d: any) => Promise<void>
  actionsDeps?: any
}

export function registerEditorBridges(deps: EditorBridgesDeps): () => void {
  const { state, render } = deps

  window.__solExpOpenFile = async (path) => {
    diffStore.path = null;
    diffStore.content = null;
    diffStore.loading = false;
    notifyDiffListeners();
    editorStore.file = path;
    editorStore.content = null;
    editorStore.loading = true;
    editorStore.error = null;
    editorStore.unsupported = false;
    editorStore.image = false;
    editorStore.root = state.root;
    notifyEditorListeners();
    try {
      const result = await (await fetch("/solution-explorer/read?root=" + encodeURIComponent(state.root) + "&file=" + encodeURIComponent(path))).json();
      if (result.ok) if (result.value.image) {
        editorStore.image = true;
        editorStore.content = null;
      } else if (result.value.supported === false) {
        editorStore.unsupported = true;
        editorStore.content = null;
      } else editorStore.content = result.value.content;
      else editorStore.error = result.error?.message || "Failed to read file";
    } catch (err) {
      editorStore.error = err.message || String(err);
    }
    editorStore.loading = false;
    notifyEditorListeners();
    setTimeout(() => {
      const tab = Array.from(document.querySelectorAll("[role=\"tab\"]")).find((el) => el.textContent === (document.documentElement.lang?.startsWith("zh") ? "编辑" : "Edit")) as HTMLElement | null;
      if (tab) tab.click();
    }, 50);
  };

  window.__solExpSaveFile = async () => {
    if (!editorStore.file || editorStore.content === null) return;
    editorStore.saving = true;
    notifyEditorListeners();
    try {
      const result = await (await fetch("/solution-explorer/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          path: editorStore.file,
          content: editorStore.content
        })
      })).json();
      if (!result.ok) showToast("保存失败: " + (result.error?.message || ""), true);
      else { await deps.loadGitStatus?.(deps.actionsDeps); await loadTree({ state, render }); }
    } catch (err) {
      showToast("保存失败: " + (err.message || String(err)), true);
    }
    editorStore.saving = false;
    notifyEditorListeners();
  };

  window.__solExpGetEditorState = () => ({
    editorFile: editorStore.file,
    editorContent: editorStore.content,
    editorLoading: editorStore.loading,
    editorError: editorStore.error,
    editorSaving: editorStore.saving,
    editorUnsupported: editorStore.unsupported,
    editorImage: editorStore.image,
    editorRoot: editorStore.root
  });

  window.__solExpEditorListeners = editorStore.listeners;

  window.__solExpOpenDiff = async (path, staged) => {
    diffStore.path = path;
    diffStore.staged = staged;
    diffStore.root = state.root;
    diffStore.content = null;
    diffStore.oldContent = "";
    diffStore.newContent = "";
    diffStore.loading = true;
    diffStore.unsupported = false;
    notifyDiffListeners();
    try {
      const result = await (await fetch("/solution-explorer/git-diff?root=" + encodeURIComponent(gitRoot(state)) + "&file=" + encodeURIComponent(path) + "&staged=" + staged)).json();
      if (result.ok) { diffStore.unsupported = result.value.unsupported === true; if (diffStore.unsupported) { diffStore.content = null; diffStore.oldContent = ""; diffStore.newContent = "" } else { diffStore.content = result.value.diff ?? result.value; diffStore.oldContent = result.value.oldContent ?? ""; diffStore.newContent = result.value.newContent ?? "" } }
      else { diffStore.content = null; diffStore.oldContent = ""; diffStore.newContent = "" }
    } catch {
      diffStore.content = null;
      diffStore.oldContent = "";
      diffStore.newContent = "";
    }
    diffStore.loading = false;
    notifyDiffListeners();
    setTimeout(() => {
      const tab = Array.from(document.querySelectorAll("[role=\"tab\"]")).find((el) => el.textContent === (document.documentElement.lang?.startsWith("zh") ? "编辑" : "Edit")) as HTMLElement | null;
      if (tab) tab.click();
    }, 50);
  };

  window.__solExpGetDiffState = () => ({
    diffPath: diffStore.path,
    diffStaged: diffStore.staged,
    diffContent: diffStore.content,
    diffOldContent: diffStore.oldContent,
    diffNewContent: diffStore.newContent,
    diffLoading: diffStore.loading,
    diffUnsupported: diffStore.unsupported,
    diffRoot: diffStore.root
  });

  window.__solExpDiffListeners = diffStore.listeners;

  return () => {
    delete window.__solExpOpenFile;
    delete window.__solExpSaveFile;
    delete window.__solExpGetEditorState;
    delete window.__solExpEditorListeners;
    delete window.__solExpOpenDiff;
    delete window.__solExpGetDiffState;
    delete window.__solExpDiffListeners;
  };
}
