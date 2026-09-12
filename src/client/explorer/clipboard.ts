/**
 * Clipboard / drag-and-drop commands — explorer domain.
 * Registered via registerClipboardCommands(deps); deps injected from panel.ts.
 * @module dsh-solution-explorer/client/explorer/clipboard
 */

import type { AppState } from "../state/store.ts"

import { loadTree } from "./tree-render.ts"

import { showToast } from "../shared/ui.ts"
import { commands } from '../commands.ts'

export interface ClipboardDeps {
  state: AppState
  render: () => void
  loadGitStatus?: (deps?: any) => Promise<void>
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  return btoa(binary);
};

export function registerClipboardCommands(deps: ClipboardDeps): () => void {
  const { state, render } = deps

  commands.copy = () => {
    if (state.tree.selectedPaths.size) {
      state.clipboard.clipboard = {
        paths: [...state.tree.selectedPaths],
        mode: "copy"
      };
      render();
    }
  };

  commands.cut = () => {
    if (state.tree.selectedPaths.size) {
      state.clipboard.clipboard = {
        paths: [...state.tree.selectedPaths],
        mode: "cut"
      };
      render();
    }
  };

  commands.paste = async (target) => {
    if (!state.clipboard.clipboard || !state.clipboard.clipboard.paths.length || !state.root) return;
    const { paths, mode } = state.clipboard.clipboard;
    state.clipboard.clipboard = null;
    let targetDir = target;
    if (targetDir) {
      const find = (n) => {
        if (n.path === target) return n;
        for (const c of n.children || []) {
          const f = find(c);
          if (f) return f;
        }
        return null;
      };
      const node = state.tree.treeState ? find(state.tree.treeState) : null;
      if (!node || node.type !== "directory") {
        const i = targetDir.lastIndexOf("/");
        targetDir = i > 0 ? targetDir.slice(0, i) : "";
      }
    }
    const norm = (p) => p.replace(/\\/g, "/");
    for (const raw of paths) {
      const src = norm(raw);
      const tgt = norm(targetDir);
      const parent = src.includes("/") ? src.slice(0, src.lastIndexOf("/")) : "";
      if (mode === "cut" && parent === tgt) {
        showToast("已在目标目录，无需移动", true);
        return;
      }
      if (tgt && (tgt === src || tgt.startsWith(src + "/"))) {
        showToast("不能移动到自身内部", true);
        return;
      }
    }
    let done = 0, failed = 0;
    for (const src of paths) try {
      const result = await (await fetch("/solution-explorer/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          mode,
          source: src,
          targetDir
        })
      })).json();
      if (result.ok) done++;
      else {
        failed++;
        console.warn("[sol-exp] paste failed", src, result.error);
      }
    } catch (err) {
      failed++;
      console.warn("[sol-exp] paste error", src, err);
    }
    if (failed) showToast(failed + " 项粘贴失败", true);
    render();
    loadTree(deps);
    deps.loadGitStatus?.(deps);
  };

  commands.dragStart = (path) => {
    state.clipboard.dragPaths = state.tree.selectedPaths.has(path) ? [...state.tree.selectedPaths] : [path];
  };

  commands.dragOver = (path, evt) => {
    const clear = () => document.querySelectorAll(".sol-exp-drop-target").forEach((el) => el.classList.remove("sol-exp-drop-target"));
    clear();
    if (state.clipboard.dragPaths.length && !state.clipboard.dragPaths.includes(path)) {
      const node = (evt.target as HTMLElement)?.closest(".sol-exp-tree-node");
      if (node) node.classList.add("sol-exp-drop-target");
    }
    state.clipboard.dropTargetPath = path;
  };

  const dropFiles = async (target: string, files: FileList | File[]) => {
    const targetDir = target || "";
    let done = 0, failed = 0, skipped = 0;
    for (const f of Array.from(files as Iterable<File>)) {
      if (f.size > 50 * 1024 * 1024) {
        skipped++;
        showToast("文件过大（>50MB）跳过: " + f.name);
        continue;
      }
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const binary = bytes.subarray(0, Math.min(4096, bytes.length)).includes(0);
        const content = binary ? bytesToBase64(bytes) : new TextDecoder("utf-8").decode(bytes);
        const rel = targetDir ? targetDir + "/" + f.name : f.name;
        const result = await (await fetch("/solution-explorer/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            root: state.root,
            path: rel,
            content,
            binary
          })
        })).json();
        if (result.ok) done++;
        else {
          failed++;
          console.warn("[sol-exp] upload failed", f.name, result.error);
        }
      } catch (err) {
        failed++;
        console.warn("[sol-exp] upload error", f.name, err);
      }
    }
    if (failed) showToast(failed + " 个文件上传失败", true);
    render();
    loadTree(deps);
    deps.loadGitStatus?.(deps);
  };
  commands.dropFiles = dropFiles;

  commands.drop = async (path, evt) => {
    const files = evt.dataTransfer?.files;
    if (files && files.length > 0) {
      await dropFiles(path, files);
      return;
    }
    const targetDir = path;
    const sources = state.clipboard.dragPaths;
    state.clipboard.dragPaths = [];
    state.clipboard.dropTargetPath = null;
    document.querySelectorAll(".sol-exp-drop-target").forEach((el) => el.classList.remove("sol-exp-drop-target"));
    if (!state.root || !sources.length) {
      render();
      return;
    }
    {
      const norm = (p) => p.replace(/\\/g, "/");
      const tgt = norm(targetDir);
      for (const raw of sources) {
        const src = norm(raw);
        const parent = src.includes("/") ? src.slice(0, src.lastIndexOf("/")) : "";
        if (src === tgt || tgt.startsWith(src + "/")) {
          showToast("不能移动到自身内部", true);
          render();
          return;
        }
        if (parent === tgt) {
          showToast("已在目标目录，无需移动", true);
          render();
          return;
        }
      }
    }
    let done = 0, failed = 0;
    for (const src of sources) try {
      const result = await (await fetch("/solution-explorer/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root: state.root,
          source: src,
          targetDir
        })
      })).json();
      if (result.ok) done++;
      else {
        failed++;
        console.warn("[sol-exp] move failed", src, result.error);
      }
    } catch (err) {
      failed++;
      console.warn("[sol-exp] move error", src, err);
    }
    if (failed) showToast(failed + " 项移动失败", true);
    render();
    loadTree(deps);
    deps.loadGitStatus?.(deps);
  };

  return () => {
    delete commands.copy;
    delete commands.cut;
    delete commands.paste;
    delete commands.dragStart;
    delete commands.dragOver;
    delete commands.drop;
    delete commands.dropFiles;
  };
}
