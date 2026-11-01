/**
 * Office/CSV rendered preview for an editor tab — editor domain.
 *
 * docx/xlsx/xls/pptx/csv are drawn by the bundled omni-doc-viewer React
 * component: one viewer, entirely client-side, no server conversion. The
 * file's bytes travel from the raw route as an ArrayBuffer and the viewer is
 * imported lazily inside the mount effect — its module graph (SheetJS,
 * docx-preview, pptx-preview) must not execute while the client bundle boots,
 * because older Android WebViews still have to open the panel itself.
 *
 * PDF stays on the plugin's own PdfPreview: pdfjs there is inlined with its
 * worker and fonts and already verified on Android; the viewer takes over
 * exactly the formats this bundle had no renderer for.
 * @module dsh-solution-explorer/client/editor/DocPreview
 */

import { createElement as h, useEffect, useState, type ComponentType, type ReactNode } from "react";

import { t } from "../locales.ts";

/** The viewer component's own props, as far as this plugin passes them. */
interface ViewerProps {
  source: ArrayBuffer;
  /** Forced format: the bytes alone cannot name a CSV. */
  type?: string;
  style?: { height: string; width: string };
}

/** Extension → the viewer's DocType, so sniffing never guesses text for a table. */
const EXT_TYPE: Record<string, string> = {
  csv: "csv",
  docx: "docx",
  xlsx: "xlsx",
  xls: "xls",
  pptx: "pptx",
};

/** Props of the document preview. */
export interface DocPreviewProps {
  /** Workspace root the path is read through. */
  root: string;
  /** Workspace-relative file path. */
  path: string;
}

/**
 * Fetch the file's raw bytes and render them with omni-doc-viewer. A fetch or
 * import failure is a note, not a crash — the "open with system" fallback
 * lives on the unsupported page, and this tab's job is only to try.
 * @param props - the workspace root and file path.
 * @returns the rendered preview, a loading note or a failure note.
 */
export function DocPreview({ root, path }: DocPreviewProps): ReactNode {
  const [loaded, setLoaded] = useState<{ Viewer: ComponentType<ViewerProps>; data: ArrayBuffer } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setFailed(null);
    (async () => {
      try {
        const url = "/solution-explorer/raw?root=" + encodeURIComponent(root) + "&file=" + encodeURIComponent(path);
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.arrayBuffer();
        const mod = await import("omni-doc-viewer/react");
        if (!alive) return;
        setLoaded({ Viewer: (mod as { DocViewer: ComponentType<ViewerProps> }).DocViewer, data });
      } catch (err) {
        if (alive) setFailed(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { alive = false; };
  }, [root, path]);

  if (failed !== null) return h("div", { className: "sol-exp-viewer-note" }, t("editor.doc.failed") + " — " + failed);
  if (loaded === null) return h("div", { className: "sol-exp-viewer-note" }, t("editor.doc.loading"));
  // `type` is forced from the extension: an ArrayBuffer carries no name, and
  // the viewer's sniffing reads a plain-text CSV as plain text.
  const type = EXT_TYPE[path.slice(path.lastIndexOf(".") + 1).toLowerCase()];
  return h("div", { className: "sol-exp-docview" },
    h(loaded.Viewer, { source: loaded.data, type, style: { height: "100%", width: "100%" } }),
  );
}
