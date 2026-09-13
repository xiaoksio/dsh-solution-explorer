/**
 * Editor & diff commands — editor domain.
 * Registered via registerEditorCommands(deps); deps injected from panel.ts.
 * @module dsh-solution-explorer/client/editor/editor-commands
 */

import { activeTab, editorStore, ensureTab, findTab, notifyEditorListeners, previewHasSource, previewKindOf, removeTab, type EditorTab } from "../state/editor-store.ts"

import { type AppState, gitRoot } from "../state/store.ts"
import type { PreviewKind } from "../state/editor-store.ts"

import { showToast, showConfirm } from "../shared/ui.ts"

import { t } from "../locales.ts"

import { loadTree } from "../explorer/tree-render.ts"
import { isPreviewOnlyFile } from "../explorer/file-kind.ts"
import { langFromPath } from "../highlight.ts"
import { commands } from '../commands.ts'

export interface EditorCommandsDeps {
  state: AppState
  render: () => void
  loadGitStatus?: (d: any) => Promise<void>
  actionsDeps?: any
  /**
   * Switch the panel to another workspace root, through the panel's own
   * authoritative sequence. Used when a claimed file belongs to a Session whose
   * workspace this panel is not showing.
   */
  switchRoot?: (root: string, keepWidth?: boolean) => void
}

/**
 * Whether two spellings name the same workspace root.
 *
 * A claimed address carries the Session's own spelling of its working directory,
 * which may differ from this panel's only in separator, drive-letter case, or a
 * trailing separator. Comparing the raw strings would read that as a different
 * workspace and reload the whole tree for it.
 * @param left - one root spelling.
 * @param right - the other.
 * @returns true when both name the same directory.
 */
function sameRoot(left: string, right: string): boolean {
  const normalized = (value: string): string => value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return normalized(left) === normalized(right);
}

/**
 * Spell a tab's path for the info row.
 *
 * A tab's path is usually workspace-relative, but a claimed file reference can
 * name an absolute path outside the workspace; joining that to the root would
 * spell a path that exists nowhere.
 * @param root - the workspace root the tab belongs to.
 * @param rel - the tab's path, relative or absolute.
 * @returns the path as the reader should see it.
 */
function absolutePath(root: string, rel: string): string {
  const normalized = rel.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/")) return rel;
  const base = root.replace(/[\\/]+$/, "");
  if (base === "") return rel;
  const sep = base.includes("\\") ? "\\" : "/";
  const tail = rel.replace(/[\\/]+/g, sep).replace(sep === "\\" ? /^\\+/ : /^\/+/, "");
  return base + sep + tail;
}

/** Whether the active tab renders its file instead of showing its source. */
function previewState(tab: EditorTab | null): { renderer: PreviewKind | null; preview: boolean } {

  const renderer = tab !== null && tab.kind === "file" ? previewKindOf(tab.path) : null;

  return { renderer, preview: renderer !== null && tab!.preview === true };

}

/** Bring the editor view forward in the host's own view tabs. */
function focusEditorView(): void {
  setTimeout(() => {
    const label = t("panel.editor");
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((el) => {
      // Our own strip also exposes role=tab; only the host's view tab counts.
      if (el.closest(".sol-exp-etabs") !== null) return false;
      return el.textContent === label;
    }) as HTMLElement | null;
    if (tab) tab.click();
  }, 50);
}

/**
 * Scroll the editor to a 1-based source line and put the caret at its start.
 *
 * Two obstacles shape this. The textarea is filled by the editor's own effect
 * once the tab's content reaches the store, so the first attempts may run before
 * there is anything to measure; and that same effect resets `scrollTop` on a tab
 * change, which can land after a single pass. So the reveal retries until the
 * content is there and applies once more after the repaint.
 * @param line - a 1-based source line.
 */
function revealSourceLine(line: number): void {

  const apply = (): boolean => {

    const textarea = document.querySelector(".sol-exp-editor-body textarea") as HTMLTextAreaElement | null;

    if (textarea === null || textarea.value === "") return false;

    const style = getComputedStyle(textarea);

    const lineHeight = parseFloat(style.lineHeight) || 21;

    const padding = parseFloat(style.paddingTop) || 0;

    const text = textarea.value;

    // The start of line N is one past the newline that ends line N-1.
    const caret = line > 1 ? Math.min(text.length, text.split("\n").slice(0, line - 1).join("\n").length + 1) : 0;

    textarea.focus();

    textarea.setSelectionRange(caret, caret);

    textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - padding);

    return true;

  };

  const run = (attemptsLeft: number): void => {

    if (apply()) {

      // The first pass can land before the pages are laid out, where a
      // zero-height textarea clamps `scrollTop` to 0; and a background tab
      // suppresses `requestAnimationFrame`, so the follow-up passes are timers.
      for (const delay of [120, 400]) setTimeout(() => { apply(); }, delay);

      return;

    }

    if (attemptsLeft > 0) setTimeout(() => { run(attemptsLeft - 1); }, 40);

  };

  setTimeout(() => { run(12); }, 0);

}

export function registerEditorCommands(deps: EditorCommandsDeps): () => void {
  const { state, render } = deps

  async function loadFileTab(tab: EditorTab): Promise<void> {
    tab.loading = true;
    tab.error = null;
    tab.unsupported = false;
    tab.image = false;
    tab.content = null;
    notifyEditorListeners();
    try {
      const result = await (await fetch("/solution-explorer/read?root=" + encodeURIComponent(tab.root) + "&file=" + encodeURIComponent(tab.path))).json();
      if (result.ok) {
        if (result.value.image) {
          tab.image = true;
          tab.content = null;
        } else if (result.value.supported === false) {
          tab.unsupported = true;
          tab.content = null;
        } else tab.content = result.value.content;
      } else tab.error = result.error?.message || "Failed to read file";
    } catch (err) {
      tab.error = err.message || String(err);
    }
    tab.loading = false;
    notifyEditorListeners();
  }

  async function loadDiffTab(tab: EditorTab): Promise<void> {
    tab.loading = true;
    tab.diffContent = null;
    tab.diffOldContent = "";
    tab.diffNewContent = "";
    tab.unsupported = false;
    notifyEditorListeners();
    try {
      const url = "/solution-explorer/git-diff?root=" + encodeURIComponent(gitRoot(state)) + "&file=" + encodeURIComponent(tab.path) + "&staged=" + (tab.staged === true);
      const result = await (await fetch(url)).json();
      if (result.ok) {
        tab.unsupported = result.value.unsupported === true;
        if (!tab.unsupported) {
          tab.diffContent = result.value.diff ?? result.value;
          tab.diffOldContent = result.value.oldContent ?? "";
          tab.diffNewContent = result.value.newContent ?? "";
        }
      }
    } catch {
      tab.diffContent = null;
      tab.diffOldContent = "";
      tab.diffNewContent = "";
    }
    tab.loading = false;
    notifyEditorListeners();
  }

  commands.openFile = async (path, options) => {

    const focus = options?.focus !== false;

    const root = typeof options?.root === "string" && options.root !== "" ? options.root : state.root;

    if (!sameRoot(root, state.root)) {

      // A claimed address can name a file of a Session whose workspace is not the
      // one the panel shows. The panel's own root switch owns every fact that
      // described the previous workspace — tree, expansion, selection, status,
      // history — so the file follows it instead of a second, partial reset here.
      // The width stays as it is: following a file must not resize the panel.
      deps.switchRoot?.(root, true);

    }

    const { tab, created } = ensureTab("file", path, false, state.root);

    notifyEditorListeners();

    if (created) await loadFileTab(tab);

    if (focus) focusEditorView();

    if (typeof options?.line === "number" && options.line > 0) revealSourceLine(options.line);

  };

  /**
   * The workspace root this panel is showing.
   *
   * The viewer's second root source: a Session's own working directory reaches the
   * client asynchronously, and an address that arrives before it must still be read
   * somewhere this plugin controls.
   * @returns the panel's current root, or `''` before it knows one.
   */
  commands.getWorkspaceRoot = () => state.root;

  commands.openDiff = async (path, staged) => {
    // A preview-only file has no text to diff; its rendered form is the whole
    // answer, wherever the request came from.
    if (isPreviewOnlyFile(path)) { await commands.openFile?.(path); return; }
    const { tab, created } = ensureTab("diff", path, staged === true, state.root);
    notifyEditorListeners();
    if (created) await loadDiffTab(tab);
    focusEditorView();
  };

  commands.activateTab = (id) => {
    if (findTab(id) === null) return;
    editorStore.activeId = id;
    notifyEditorListeners();
  };

  commands.closeTab = async (id) => {
    const tab = findTab(id);
    if (tab === null) return;
    if (tab.dirty) {
      const ok = await showConfirm({
        title: t("editor.tab.closeTitle"),
        message: t("editor.tab.closeDirty").replace("{name}", tab.path),
        okText: t("editor.tab.closeOk"),
        danger: true,
      });
      if (!ok) return;
    }
    removeTab(id);
    notifyEditorListeners();
  };

  /** Close every tab pointing at a deleted path (called by the delete flow). */
  commands.closePath = (path) => {
    let touched = false;
    for (const tab of [...editorStore.tabs]) {
      if (tab.path === path) { removeTab(tab.id); touched = true; }
    }
    if (touched) notifyEditorListeners();
  };

  /** Every keystroke of the active file tab lands here. */
  commands.setActiveContent = (value) => {
    const tab = activeTab();
    if (tab === null || tab.kind !== "file") return;
    const wasDirty = tab.dirty;
    tab.content = value;
    tab.dirty = true;
    // Repaint only on the clean→dirty flip: notifying per keystroke would
    // re-run the whole-file highlighting for nothing (the old local setState
    // bailed out on the repeats for the same reason).
    if (!wasDirty) notifyEditorListeners();
  };

  commands.saveFile = async () => {
    const tab = activeTab();
    if (tab === null || tab.kind !== "file" || tab.content === null) return;
    // A claimed file may live outside the workspace root, where every write route
    // refuses to go. Say so instead of reporting the refusal as a failed save.
    if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(tab.path)) {
      showToast(t("editor.saveOutsideWorkspace"), true);
      return;
    }
    tab.saving = true;
    notifyEditorListeners();
    let ok = false;
    try {
      const result = await (await fetch("/solution-explorer/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          path: tab.path,
          content: tab.content
        })
      })).json();
      if (!result.ok) showToast("保存失败: " + (result.error?.message || ""), true);
      else { ok = true; await deps.loadGitStatus?.(deps.actionsDeps); await loadTree({ state, render }); }
    } catch (err) {
      showToast("保存失败: " + (err.message || String(err)), true);
    }
    tab.saving = false;
    if (ok) tab.dirty = false;
    notifyEditorListeners();
  };

  commands.getEditorTabs = () => {
    const tab = activeTab();
    return {
      tabs: editorStore.tabs.map((t) => ({
        id: t.id,
        kind: t.kind,
        path: t.path,
        staged: t.staged === true,
        dirty: t.dirty,
      })),
      activeId: editorStore.activeId,
      // The info bar under the strip shows the active tab's path and kind.
      activePath: tab === null ? null : absolutePath(tab.root, tab.path),
      activeKind: tab === null
        ? null
        : tab.kind === "diff" ? "diff"
          : tab.image ? "image"
            : previewState(tab).renderer ?? (langFromPath(tab.path) ? "code" : "text"),
      // The info bar carries what the old per-file info bar showed for a file:
      // its save state. Only a loaded text buffer has one — images, unsupported
      // files and diff tabs (which report their own state below) return null.
      activeStatus: tab === null || tab.kind !== "file" || tab.image || tab.unsupported || tab.content === null
        ? null
        : tab.saving ? "saving" : tab.dirty ? "dirty" : "saved",
      // A diff tab shows its before/after legend and save state in the same info
      // row, so the diff view no longer needs a toolbar row of its own.
      activeDiff: tab === null || tab.kind !== "diff"
        ? null
        : { readonly: tab.staged === true, dirty: tab.dirty, saving: tab.saving },
      // A rendered tab whose file also has editable source offers the
      // preview/source toggle; every other tab returns null and draws none.
      activeRenderer: previewState(tab).renderer,
      activePreview: previewState(tab).preview,
      activePreviewToggle: previewHasSource(previewState(tab).renderer),
    };
  };

  /**
   * Show the active tab as its rendered form or as its source.
   * @param preview - true for the rendered document, false for the editor.
   */
  commands.setTabPreview = (preview) => {

    const tab = activeTab();

    if (tab === null || tab.kind !== "file" || !previewHasSource(previewKindOf(tab.path))) return;

    tab.preview = preview === true;

    notifyEditorListeners();

  };

  commands.getEditorState = () => {
    const tab = activeTab();
    if (tab === null || tab.kind !== "file") {
      return {
        editorFile: null,
        editorContent: null,
        editorLoading: false,
        editorError: null,
        editorSaving: false,
        editorUnsupported: false,
        editorImage: false,
        editorRoot: "",
        editorDirty: false,
        editorRenderer: null,
        editorPreview: false
      };
    }
    const rendered = previewState(tab);
    return {
      editorFile: tab.path,
      editorContent: tab.content,
      editorLoading: tab.loading,
      editorError: tab.error,
      editorSaving: tab.saving,
      editorUnsupported: tab.unsupported,
      editorImage: tab.image,
      editorRoot: tab.root,
      editorDirty: tab.dirty,
      editorRenderer: rendered.renderer,
      editorPreview: rendered.preview
    };
  };

  commands.editorListeners = editorStore.listeners;

  commands.getDiffState = () => {
    const tab = activeTab();
    if (tab === null || tab.kind !== "diff") return { diffPath: null };
    return {
      diffPath: tab.path,
      diffStaged: tab.staged === true,
      diffContent: tab.diffContent ?? null,
      diffOldContent: tab.diffOldContent ?? "",
      diffNewContent: tab.diffNewContent ?? "",
      diffLoading: tab.loading,
      diffUnsupported: tab.unsupported,
      diffRoot: tab.root,
      diffDirty: tab.dirty,
      diffSaving: tab.saving
    };
  };

  /** The diff column edits its own rows; dirty/saving live on the tab. */
  commands.setActiveDiffState = (patch) => {
    const tab = activeTab();
    if (tab === null || tab.kind !== "diff") return;
    if (typeof patch.dirty === "boolean") tab.dirty = patch.dirty;
    if (typeof patch.saving === "boolean") tab.saving = patch.saving;
    if (typeof patch.diffContent === "string" || patch.diffContent === null) tab.diffContent = patch.diffContent;
    notifyEditorListeners();
  };

  return () => {
    delete commands.openFile;
    delete commands.setTabPreview;
    delete commands.openDiff;
    delete commands.activateTab;
    delete commands.closeTab;
    delete commands.closePath;
    delete commands.setActiveContent;
    delete commands.setActiveDirty;
    delete commands.saveFile;
    delete commands.getEditorTabs;
    delete commands.getEditorState;
    delete commands.getWorkspaceRoot;
    delete commands.editorListeners;
    delete commands.getDiffState;
    delete commands.setActiveDiffState;
  };
}
