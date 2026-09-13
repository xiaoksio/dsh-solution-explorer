/**
 * The viewer tab's body: the Sidebar's file opens, handed to this plugin's editor.
 * @module dsh-solution-explorer/client/viewer/ViewerBody
 */

import { createElement as h, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";

import type { InjectFace, PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";

import { commands } from "../commands.ts";

import { EditorView } from "../editor/editor-view.ts";

import { parseFileAddress, resolveInside } from "./address.ts";

/** The framework's bound tab reader, injected by the seat's own declaration. */
export interface ViewerTabInfo {
  readonly tab: {
    readonly id: string;
    readonly contentId: string;
    readonly navigation?: {
      readonly params?: unknown;
      readonly revision?: number;
    };
  };
}

/** Registration-private inputs: the workspace root and the way back out. */
export interface ViewerInjected {
  /** The workspace root for a Session, or the panel's own when the address carries none. */
  readonly getRoot: (sessionId: string | undefined) => string;
  /** Close one Sidebar tab. */
  readonly closeTab: (tabId: string) => void;
}

/** The body's composed props: the tab reader and the two callbacks above. */
export type ViewerBodyProps = PropsRuntime<"sidebar.right.pane.tab"> & InjectFace<ViewerInjected>;

/**
 * The last revision this body answered, per Sidebar tab id.
 *
 * The Sidebar needs no extra state to tell a fresh open from a manual expansion:
 * a manual expansion re-mounts this body at the same tab and revision, and a pair
 * already answered is left alone. Tabs are closed as soon as they are answered, so
 * the map is trimmed to a fixed ceiling rather than growing for the life of the page.
 */
const answered = new Map<string, number>();

/** How many answered tabs are remembered. */
const ANSWERED_LIMIT = 64;

/**
 * Whether this mount is an open nobody has answered yet.
 * @param tabId - the Sidebar tab the body is drawn for.
 * @param revision - that tab's navigation revision.
 * @returns true for an open that still needs handling.
 */
function isFresh(tabId: string, revision: number): boolean {
  return answered.get(tabId) !== revision;
}

/**
 * Record an open as answered, dropping the oldest entries past the ceiling.
 * @param tabId - the Sidebar tab the body is drawn for.
 * @param revision - that tab's navigation revision.
 */
function remember(tabId: string, revision: number): void {
  answered.delete(tabId);
  answered.set(tabId, revision);
  while (answered.size > ANSWERED_LIMIT) {
    const oldest = answered.keys().next().value;
    if (oldest === undefined) break;
    answered.delete(oldest);
  }
}

/** The `file` resource's navigation parameter: the 1-based source line to land on. */
function readLine(params: unknown): number | undefined {
  if (params === null || typeof params !== "object") return undefined;
  const line = (params as { readonly line?: unknown }).line;
  return typeof line === "number" && line > 0 ? line : undefined;
}

/**
 * Hand the addressed file to the editor and put the Sidebar back.
 *
 * The work happens in a layout effect so it lands before the browser paints: the
 * column this open expanded is not where the file is read, and a close issued
 * from here leaves no trace of it. The close itself waits one microtask, because
 * a write on the Sidebar goes through the binding its seat publishes and this
 * body's layout effect runs before that seat publishes it; a microtask still
 * settles before the next paint, so the delay costs no visibility.
 *
 * A file outside the workspace root is handed over as its absolute path: the read
 * then reports the refusal in this editor, which is the only place the reader is
 * looking.
 * @param props - the tab reader and the two callbacks.
 * @returns the editor, for a surface that still holds this tab.
 */
export function ViewerBody({ useTabInfo, getRoot, closeTab }: ViewerBodyProps): ReactNode {
  const info = useTabInfo();
  const address = info.tab.contentId;
  const revision = info.tab.navigation?.revision ?? 0;
  const line = readLine(info.tab.navigation?.params);
  const ref = useMemo(() => parseFileAddress(address), [address]);
  const root = getRoot(ref?.sessionId);
  const relative = ref === undefined ? undefined : resolveInside(root, ref);
  const target = relative ?? ref?.path ?? "";
  const key = info.tab.id + "@" + String(revision);
  const fresh = useRef(isFresh(info.tab.id, revision));

  useLayoutEffect(() => {
    if (!fresh.current) return;
    fresh.current = false;
    remember(info.tab.id, revision);
    if (target !== "" && target !== undefined) {
      // Focused: the file is read in this plugin's editor view, and switching the
      // conversation's view ring has no public API — its selection lives in
      // ui-conversation's own session store — so the view is brought forward the
      // way a reader brings it forward.
      void commands.openFile?.(target, { focus: true, root, line });
    }
    queueMicrotask(() => { closeTab(info.tab.id); });
  }, [key, ref, relative, root, line, target, closeTab]);

  return h("div", { className: "sol-exp-viewer" }, h(EditorView, null));
}
