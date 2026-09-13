/**
 * Viewer registration — the Sidebar's file routing, claimed by this plugin.
 * @module dsh-solution-explorer/client/viewer/register
 */

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";

import type { SlotHookFactory } from "@deepseek-ai/dsh-client-ui-slots";

import { VIEWER_ID, viewerDefinition } from "./definition.ts";

import { ViewerBody, type ViewerInjected, type ViewerTabInfo } from "./ViewerBody.ts";

/** The Sidebar's tab-type registry, structurally typed. */
interface SidebarRightTabsFace {
  register(definition: unknown): () => void;
}

/** The Sidebar's navigation face: only the close this registration uses. */
interface SidebarRightFace {
  close(tabId: string): void;
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
    scoped.slots.inject("sidebar.right.pane.tab", () => scoped.slots.register({
      name: "sidebar.right.pane.tab",
      key: VIEWER_ID,
      inject: (): ViewerInjected => ({
        getRoot: rootOf,
        closeTab: (tabId) => {
          const sidebar = softGet?.("sidebarRight") as SidebarRightFace | undefined;
          sidebar?.close(tabId);
        },
      }),
    }, ViewerBody));
  });
}
