/**
 * Rendered HTML for a preview tab — editor domain.
 *
 * The document runs in a Blob-free sandboxed frame: `sandbox="allow-scripts"`
 * without `allow-same-origin`, so the page gets an opaque origin and can reach
 * neither this application's DOM nor its file routes. That opacity is also why
 * referenced stylesheets and classic scripts are **inlined** rather than handed
 * blob URLs: a `blob:` URL the parent minted belongs to the parent's origin and
 * an opaque-origin document cannot fetch it.
 *
 * Only directly declared local references are read, and every failure — a read,
 * a size limit, an asset count limit — fails the whole preview instead of
 * publishing a half-styled page.
 * @module dsh-solution-explorer/client/editor/HtmlPreview
 */

import { createElement as h, useEffect, useState, type ReactNode } from "react";

import { t } from "../locales.ts";

/** Per-asset ceiling, matching the shipped preview's own limits. */
const ASSET_BYTES = 4 * 1024 * 1024;

/** Ceiling over every inlined asset of one document. */
const TOTAL_BYTES = 32 * 1024 * 1024;

/** Ceiling on how many assets one document may reference. */
const ASSET_COUNT = 64;

type State =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly html: string }
  | { readonly status: "failed"; readonly message: string };

/** Whether a reference names a file beside this one: no scheme, no fragment, no remote host. */
function isLocalRef(ref: string): boolean {
  const value = ref.trim();
  if (value === "" || value.startsWith("#") || value.startsWith("data:")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) return false;
  return true;
}

/**
 * Resolve one reference against the document's directory.
 * @param dir - the document's workspace-relative directory (`''` at the root).
 * @param ref - the declared reference, query and fragment stripped.
 * @returns the workspace-relative path of the referenced file.
 */
function resolveRef(dir: string, ref: string): string {
  const clean = ref.split("#")[0].split("?")[0];
  const rooted = clean.startsWith("/");
  const joined = rooted || dir === "" ? clean : dir + "/" + clean;
  const out: string[] = [];
  for (const part of joined.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") { out.pop(); continue; }
    out.push(part);
  }
  return out.join("/");
}

/** Read one text asset through this plugin's own read route. */
async function readAsset(root: string, path: string): Promise<string> {
  const response = await fetch("/solution-explorer/read?root=" + encodeURIComponent(root) + "&file=" + encodeURIComponent(path));
  const result = await response.json();
  if (result.ok !== true) throw new Error(path + ": " + (result.error?.message ?? "read failed"));
  if (result.value?.image === true || result.value?.supported === false) throw new Error(path + ": not a text asset");
  const text = String(result.value?.content ?? "");
  if (text.length > ASSET_BYTES) throw new Error(path + ": asset exceeds 4 MiB");
  return text;
}

/**
 * Read the document's local stylesheets and classic scripts and fold them into it.
 * @param root - the workspace root the document was opened in.
 * @param path - the document's workspace-relative path.
 * @param text - its source.
 * @returns the document with every local reference inlined.
 */
async function inlineLocalAssets(root: string, path: string, text: string): Promise<string> {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const doc = new DOMParser().parseFromString(text, "text/html");
  const refs: { el: Element; css: boolean; ref: string }[] = [];

  for (const link of Array.from(doc.querySelectorAll("link[href]"))) {
    const rel = (link.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    const href = link.getAttribute("href") ?? "";
    if (!rel.includes("stylesheet") || !isLocalRef(href)) continue;
    refs.push({ el: link, css: true, ref: href });
  }
  for (const script of Array.from(doc.querySelectorAll("script[src]"))) {
    const src = script.getAttribute("src") ?? "";
    if (!isLocalRef(src)) continue;
    refs.push({ el: script, css: false, ref: src });
  }
  if (refs.length > ASSET_COUNT) throw new Error("document references more than 64 local assets");

  let total = 0;
  for (const entry of refs) {
    const asset = await readAsset(root, resolveRef(dir, entry.ref));
    total += asset.length;
    if (total > TOTAL_BYTES) throw new Error("inlined assets exceed 32 MiB");
    const parent = entry.el.parentNode;
    if (parent === null) continue;
    if (entry.css) {
      const style = doc.createElement("style");
      style.textContent = asset;
      parent.replaceChild(style, entry.el);
    } else {
      const inline = doc.createElement("script");
      // The serializer writes a script's text raw, so an inlined copy must not
      // carry a sequence that would end its own element early.
      inline.textContent = asset.replace(/<\/script/gi, "<\\/script");
      parent.replaceChild(inline, entry.el);
    }
  }
  return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
}

/**
 * Draw one HTML document in its sandboxed frame.
 * @param props - the workspace root, the document's path, and its loaded source.
 * @returns the frame, or the reason the document could not be prepared.
 */
export function HtmlPreview({ root, path, text }: {
  readonly root: string;
  readonly path: string;
  readonly text: string;
}): ReactNode {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    inlineLocalAssets(root, path, text).then((html) => {
      if (!cancelled) setState({ status: "ready", html });
    }, (err: unknown) => {
      if (!cancelled) setState({ status: "failed", message: err instanceof Error ? err.message : String(err) });
    });
    return () => { cancelled = true; };
  }, [root, path, text]);

  if (state.status === "loading") return h("div", { className: "sol-exp-viewer-note" }, t("editor.html.loading"));
  if (state.status === "failed") {
    return h("div", { className: "sol-exp-viewer-note" }, t("editor.html.failed") + " — " + state.message);
  }
  return h("iframe", {
    className: "sol-exp-htmlview",
    sandbox: "allow-scripts",
    srcDoc: state.html,
    title: path,
  });
}
