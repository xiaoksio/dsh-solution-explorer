/**
 * The viewer tab type — the Sidebar's file routing, claimed by this plugin.
 * @module dsh-solution-explorer/client/viewer/definition
 */

import { addressBasename } from "./address.ts";

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
    // Nothing is vetoed, and the pattern above is the whole gate: the registry
    // consults `canOpen` only for types whose pattern matched, so every file
    // address is claimed here. A veto is not a safe fallback — it hands the file
    // to whichever panel registers next, which is a different surface with a
    // different reader, and it fires exactly when this plugin is least ready (a
    // Session's working directory, or its id, has not reached the client yet).
    // Claiming always ends in this plugin's editor: the file, or the reason it
    // could not be read.
    canOpen: () => true,
    title: addressBasename,
  };
}
