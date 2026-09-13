/**
 * The viewer tab type — the Sidebar's file routing, claimed by this plugin.
 * @module dsh-solution-explorer/client/viewer/definition
 */

import { addressBasename, parseFileAddress } from "./address.ts";

/** This implementation's identity in the Sidebar's tab system. */
export const VIEWER_ID = "dsh-solution-explorer/viewer";

/**
 * The type discriminator. Deliberately NOT the shipped preview's `text`: a kind
 * carries at most one builtin and one extension, and sharing the kind would make
 * this registration replace the shipped type outright instead of outranking it.
 */
export const VIEWER_KIND = "solution-explorer";

/** The registry definition, structurally typed: the Sidebar's types come from a package this one does not depend on. */
export interface ViewerTabDefinition {
  readonly id: string;
  readonly kind: string;
  readonly patterns: readonly string[];
  readonly canOpen: (address: string) => boolean;
  readonly title: (address: string) => string;
}

/**
 * Describe the viewer type.
 * @returns the definition to register.
 */
export function viewerDefinition(): ViewerTabDefinition {
  return {
    id: VIEWER_ID,
    kind: VIEWER_KIND,
    patterns: ["dsh-resource://file/**"],
    // No `priority`: the registry defaults an unnamed band to `extension`, which
    // outranks every shipped type.
    //
    // Nothing is vetoed. A veto looks like a safe fallback, but it moves the
    // reader into a different panel the moment this plugin cannot name a
    // workspace root — including the moment a Session's working directory has not
    // reached the client yet — and this plugin can always say more about a file
    // than a silent hand-off: it either shows the file or shows why it could not.
    canOpen: (address) => parseFileAddress(address) !== undefined,
    title: addressBasename,
  };
}
