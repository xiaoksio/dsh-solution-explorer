/**
 * Viewer registration — the Sidebar's file routing, claimed by this plugin.
 * @module dsh-solution-explorer/client/viewer/register
 */

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";

import type { SlotHookFactory } from "@deepseek-ai/dsh-client-ui-slots";

import { VIEWER_ID, VIEWER_KIND, viewerDefinition } from "./definition.ts";

import { parseFileAddress, resolveInside } from "./address.ts";

import { commands } from "../commands.ts";

import { ViewerBody, type ViewerInjected, type ViewerTabInfo } from "./ViewerBody.ts";

/** The Sidebar's tab-type registry, structurally typed. */
interface SidebarRightTabsFace {
  register(definition: unknown): () => void;
}

/** The Sidebar's navigation face: the close and the read-back this registration uses. */
interface SidebarRightFace {
  close(tabId: string): void;
  active?(): { readonly id?: unknown; readonly kind?: unknown; readonly contentId?: unknown } | undefined;
}

/**
 * Watch for a file the Sidebar answered without this plugin, and hand it over.
 *
 * A claim is ranked among the types registered at that moment, so an open that
 * arrives before this plugin's type is in force — or while a seat is remounting —
 * is answered by the shipped preview instead: a different surface with a different
 * reader. Such a tab is read back out of the Sidebar here and handed to this
 * plugin's editor, which makes the outcome independent of who won that moment.
 *
 * Only a tab of another kind is taken: this plugin's own tab has its own way out,
 * and touching it would mean fighting a close that is already in flight.
 * @param softGet - the context's optional service reader.
 * @param rootOf - the workspace root for a Session, or this panel's own.
 * @returns the disposer that stops the watch.
 */
function watchClaimedTabs(softGet: (name: string) => unknown, rootOf: (sessionId?: string) => string): () => void {
  let ticks = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sweep = (): void => {
    const sidebar = softGet("sidebarRight") as SidebarRightFace | undefined;
    let active: { readonly id?: unknown; readonly kind?: unknown; readonly contentId?: unknown } | undefined;
    try { active = sidebar?.active?.(); } catch { active = undefined; }
    const id = typeof active?.id === "string" ? active.id : "";
    const kind = typeof active?.kind === "string" ? active.kind : "";
    const contentId = typeof active?.contentId === "string" ? active.contentId : "";
    const ref = contentId === "" ? undefined : parseFileAddress(contentId);
    if (ref !== undefined && id !== "" && kind !== VIEWER_KIND && typeof commands.openFile === "function") {
      const root = rootOf(ref.sessionId);
      const target = resolveInside(root, ref) ?? ref.path;
      if (target !== "") {
        void commands.openFile(target, { focus: true, root });
        sidebar?.close(id);
      }
    }
    // A rapid phase covers startup — the editor's commands arrive with the panel —
    // and a steady one keeps a later loss from standing.
    ticks += 1;
    timer = setTimeout(sweep, ticks < 20 ? 100 : 500);
  };
  timer = setTimeout(sweep, 100);
  return () => { if (timer !== undefined) clearTimeout(timer); };
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    /** Right-Sidebar tab-type registry, provided by `@deepseek-ai/dsh-client-ui-sidebar-right`. */
    sidebarRightTabs: SidebarRightTabsFace;
  }
}

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface SlotMap {
    /**
     * The right Sidebar's tab body, keyed by the tab type's own `id`. The seat is
     * declared by `@deepseek-ai/dsh-client-ui-sidebar-right`, which is not a
     * dependency of this package, so the contract it declares — a keyed,
     * Session-scoped seat whose declarer injects the bound `tabInfo` reader — is
     * mirrored here and must stay identical to it.
     */
    "sidebar.right.pane.tab": {
      kind: "keyed";
      scope: "session";
      inject: {
        hooks: {
          tabInfo: SlotHookFactory<"sidebar.right.pane.tab", () => ViewerTabInfo>;
        };
      };
    };
  }
}

/**
 * Claim `dsh-resource://file/**` and route it into this plugin's editor.
 *
 * The registry is reached through `ctx.inject`, not declared as a hard
 * dependency: a deployment without the official Sidebar must still get this
 * plugin's own panel rather than a fiber waiting forever for a service nobody
 * provides. The navigation face is read softly for the same reason.
 * @param ctx - client root context.
 * @param rootOf - the workspace root for a Session, or the panel's own.
 */
export function registerViewer(ctx: ClientContext, rootOf: (sessionId?: string) => string): void {
  const softGet = (ctx as unknown as { get?: (name: string) => unknown }).get?.bind(ctx);

  ctx.inject(["sidebarRightTabs"], (scoped) => {
    scoped.effect(() => scoped.sidebarRightTabs.register(viewerDefinition()),
      "dsh-solution-explorer: viewer tab type");
    // From here on this plugin owns file addresses; anything the Sidebar answered
    // without it — before this ran, or while a seat was remounting — is read back.
    if (softGet !== undefined) scoped.effect(() => watchClaimedTabs(softGet, rootOf),
      "dsh-solution-explorer: claimed-file watch");
    scoped.slots.inject("sidebar.right.pane.tab", () => scoped.slots.register({
      name: "sidebar.right.pane.tab",
      key: VIEWER_ID,
      inject: (): ViewerInjected => ({
        getRoot: rootOf,
        closeTab: (tabId) => {
          // Closing this tab is what puts the Sidebar back: the column a claimed
          // open expanded collapses when its last tab leaves, so a close that does
          // not land leaves that column standing. The face is looked up softly (a
          // deployment may have no such service) and retried, because a seat that
          // is remounting publishes its binding a moment later.
          const close = (): void => {
            const sidebar = softGet?.("sidebarRight") as SidebarRightFace | undefined;
            if (sidebar === undefined) return;
            let activeId: unknown;
            try { activeId = sidebar.active?.()?.id; } catch { activeId = undefined; }
            // A tab that is no longer the active one is already gone.
            if (typeof activeId === "string" && activeId !== tabId) return;
            sidebar.close(tabId);
          };
          close();
          for (const delay of [16, 60, 150, 320]) setTimeout(close, delay);
        },
      }),
    }, ViewerBody));
  });
}
