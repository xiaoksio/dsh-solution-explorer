/**
 * Rendered PDF for a preview tab — editor domain.
 *
 * The plugin draws the document itself rather than handing the bytes to the
 * browser's PDF viewer: the reader's own toolbar and grey chrome cannot be
 * styled away, and a tab that looks like the browser is a tab that does not look
 * like this panel. Pages are painted into canvases in a scrollport of ours, and
 * the toolbar's zoom controls and drag-to-pan behave as they do for an image.
 *
 * The engine and its resources travel inside this bundle. The worker is started
 * from a Blob URL built from inlined source — no file to serve, no route whose
 * effect would wait for a host restart — and its standard fonts and CMaps are
 * inlined too, so a document needs no network.
 * @module dsh-solution-explorer/client/editor/PdfPreview
 */

import { createElement as h, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { getDocument, PDFWorker, type PDFDocumentProxy } from "pdfjs-dist";

import { PDF_ASSETS, PDF_WORKER_SOURCE } from "../generated/pdfjs-assets.ts";

import { t } from "../locales.ts";

/** The worker reports readiness before PDF.js is handed its port. */
const WORKER_READY = "dsh-solution-explorer-pdf-worker-ready";

/** Cap on the device pixel ratio used when painting a page. */
const MAX_PIXEL_RATIO = 2;

/** What PDF.js asks the injected factory for, by resource kind. */
type AssetRequest = { readonly kind: string; readonly filename: string };

/**
 * Serves PDF.js's binary resources from this bundle.
 *
 * A missing resource is an error rather than a silent fallback: a document that
 * renders without its CMaps shows the wrong glyphs, which is worse than a
 * preview that says it could not be prepared.
 */
class InlinedBinaryData {
  /**
   * Read one resource.
   * @param request - the resource kind and file name PDF.js asked for.
   * @returns its bytes.
   */
  async fetch({ kind, filename }: AssetRequest): Promise<Uint8Array> {
    const encoded = PDF_ASSETS[kind]?.[filename];
    if (encoded === undefined) throw new Error("missing PDF resource " + kind + "/" + filename);
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}

/** One open document plus everything that must be released with it. */
interface Session {
  readonly document: PDFDocumentProxy;
  readonly dispose: () => Promise<void>;
}

/**
 * Open a PDF in a worker this component owns.
 * @param data - the complete bytes of the file.
 * @returns the open document and its disposer.
 */
async function openDocument(data: Uint8Array): Promise<Session> {
  const url = URL.createObjectURL(new Blob([
    PDF_WORKER_SOURCE,
    "\nself.postMessage({type:" + JSON.stringify(WORKER_READY) + "});\n",
  ], { type: "text/javascript" }));
  const worker = new Worker(url, { type: "module", name: "dsh-solution-explorer-pdf" });
  const ready = new Promise<void>((resolve, reject) => {
    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      const payload = event.data as { type?: unknown } | null;
      if (typeof payload === "object" && payload !== null && payload.type === WORKER_READY) resolve();
    });
    worker.addEventListener("error", () => { reject(new Error("PDF worker failed to start")); });
    worker.addEventListener("messageerror", () => { reject(new Error("PDF worker message failed")); });
  });
  await ready;
  let loading: ReturnType<typeof getDocument> | null = null;
  try {
    const bridge = PDFWorker.create({ port: worker });
    loading = getDocument({
      data,
      worker: bridge,
      BinaryDataFactory: InlinedBinaryData as unknown as new () => object,
      cMapPacked: true,
      useWorkerFetch: false,
      enableXfa: false,
    });
    const document = await loading.promise;
    const opened = loading;
    return {
      document,
      // The loading task owns the document and the worker it borrowed.
      dispose: async () => {
        await opened.destroy();
        URL.revokeObjectURL(url);
      },
    };
  } catch (err) {
    await loading?.destroy().catch(() => undefined);
    worker.terminate();
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Draw one PDF with the panel's own zoom and pan.
 * @param props - the workspace root, the document's path, and the shared zoom factor.
 * @returns the page stack, or the reason it could not be prepared.
 */
export function PdfPreview({ root, path, zoom, onZoom }: {
  readonly root: string;
  readonly path: string;
  readonly zoom: number;
  readonly onZoom: (next: number) => void;
}): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  /** `index@scale` keys already painted, so a re-render does not repaint them. */
  const painted = useRef(new Set<string>());
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  /** Where a Ctrl+wheel zoom must land, waiting for the pages to be repainted. */
  const anchor = useRef<{ targetLeft: number; targetTop: number } | null>(null);

  useEffect(() => {
    let opened: Session | null = null;
    let cancelled = false;
    setSession(null);
    setFailed(null);
    setPageCount(0);
    canvases.current = [];
    painted.current.clear();
    void (async () => {
      try {
        const response = await fetch("/solution-explorer/raw?root=" + encodeURIComponent(root) + "&file=" + encodeURIComponent(path));
        if (!response.ok) throw new Error("HTTP " + response.status);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length === 0) throw new Error("empty file");
        opened = await openDocument(bytes);
        if (cancelled) { await opened.dispose(); return; }
        setPageCount(opened.document.numPages);
        setSession(opened);
      } catch (err) {
        if (!cancelled) setFailed(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
      void opened?.dispose();
    };
  }, [root, path]);

  /**
   * Paint every page whose placeholder is on or near the screen.
   *
   * Painting happens on demand rather than up front: a long document must not
   * block the panel on its hundredth page, and a zoom change repaints only what
   * the reader is looking at.
   */
  const paint = useCallback(async (target: Session, scale: number) => {
    const scroller = scrollRef.current;
    if (scroller === null) return;
    const viewport = scroller.getBoundingClientRect();
    for (let index = 0; index < target.document.numPages; index += 1) {
      const canvas = canvases.current[index];
      if (canvas === null || canvas === undefined) continue;
      const box = canvas.parentElement?.getBoundingClientRect();
      const near = box !== undefined && box.bottom > viewport.top - 600 && box.top < viewport.bottom + 600;
      const key = index + "@" + scale;
      if (!near || painted.current.has(key)) continue;
      painted.current.add(key);
      try {
        const page = await target.document.getPage(index + 1);
        const base = page.getViewport({ scale: 1 });
        const fit = (scroller.clientWidth - 24) / base.width;
        const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
        const viewportAt = page.getViewport({ scale: fit * scale * ratio });
        canvas.width = Math.floor(viewportAt.width);
        canvas.height = Math.floor(viewportAt.height);
        canvas.style.width = Math.floor(viewportAt.width / ratio) + "px";
        canvas.style.height = Math.floor(viewportAt.height / ratio) + "px";
        const context = canvas.getContext("2d");
        if (context === null) continue;
        await page.render({ canvas, canvasContext: context, viewport: viewportAt }).promise;
      } catch {
        // One unrenderable page must not blank the rest; its placeholder stays empty.
        painted.current.delete(key);
      }
    }
  }, []);

  useEffect(() => {
    if (session === null) return;
    void paint(session, zoom);
  }, [session, zoom, paint]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller === null || session === null) return;
    const onScroll = (): void => { void paint(session, zoom); };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { scroller.removeEventListener("scroll", onScroll); };
  }, [session, zoom, paint]);

  // Ctrl+wheel zooms about the cursor, as it does over an image: the document
  // point under the pointer stays under it.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller === null || session === null) return;
    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const previous = zoomRef.current;
      const next = Math.min(10, Math.max(0.5, +(previous * (event.deltaY < 0 ? 1.1 : 0.9)).toFixed(2)));
      if (next === previous) return;
      const rect = scroller.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      // The document point under the pointer keeps its place: its offset from
      // the viewport origin scales with the zoom. Recorded as an absolute
      // target, so applying it again after the repaint cannot double it.
      anchor.current = {
        targetLeft: (scroller.scrollLeft + px) * (next / previous) - px,
        targetTop: (scroller.scrollTop + py) * (next / previous) - py,
      };
      onZoom(next);
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => { scroller.removeEventListener("wheel", onWheel); };
  }, [session, onZoom]);

  // The pages are repainted a tick after the zoom lands, so the anchored scroll
  // is applied once immediately and once after that repaint.
  useEffect(() => {
    const scroller = scrollRef.current;
    const pending = anchor.current;
    if (scroller === null || pending === null) return;
    const apply = (): void => {
      scroller.scrollLeft = pending.targetLeft;
      scroller.scrollTop = pending.targetTop;
    };
    apply();
    const timer = setTimeout(() => { apply(); anchor.current = null; }, 200);
    return () => { clearTimeout(timer); };
  }, [zoom]);

  if (failed !== null) return h("div", { className: "sol-exp-viewer-note" }, t("editor.pdf.failed") + " — " + failed);
  if (session === null) return h("div", { className: "sol-exp-viewer-note" }, t("editor.pdf.loading"));

  return h("div", {
    ref: scrollRef,
    className: "sol-exp-pdfview",
    onMouseDown: (event: { clientX: number; clientY: number; preventDefault(): void }) => {
      const scroller = scrollRef.current;
      if (scroller === null) return;
      event.preventDefault();
      drag.current = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    },
    onMouseMove: (event: { clientX: number; clientY: number }) => {
      const scroller = scrollRef.current;
      const start = drag.current;
      if (scroller === null || start === null) return;
      scroller.scrollLeft = start.left - (event.clientX - start.x);
      scroller.scrollTop = start.top - (event.clientY - start.y);
    },
    onMouseUp: () => { drag.current = null; },
    onMouseLeave: () => { drag.current = null; },
  }, Array.from({ length: pageCount }, (_, index) => h("div", { key: index, className: "sol-exp-pdfpage" },
    h("canvas", { ref: (node: HTMLCanvasElement | null) => { canvases.current[index] = node; } }))));
}
