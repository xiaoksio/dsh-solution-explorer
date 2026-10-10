/**
 * Session-list reading — shared across the panel and the viewer.
 * @module dsh-solution-explorer/client/shared/session
 */

/**
 * The Session whose view the GUI is showing.
 *
 * DSH 0.1.7 removed `current` from the Session-list snapshot: the Session shown
 * in the main view is now the one retained by the `mainView` reference source.
 * Both spellings are read, so this plugin keeps the same root on every DSH
 * version it supports; without the second one the lookup returns nothing, the
 * workspace root resolves to `''`, and the whole column stays hidden.
 *
 * The snapshot is read structurally: the field this plugin depends on is newer
 * than the version it builds against, and a snapshot from either version must be
 * accepted without a cast at the call site.
 * @param snapshot - a Session-list snapshot, of whichever DSH version.
 * @returns the main-view Session id, or undefined when no Session is shown yet.
 */
export function mainViewSessionId(snapshot: unknown): string | undefined {
  if (snapshot === null || typeof snapshot !== "object") return undefined;
  const list = snapshot as { current?: unknown; byId?: unknown };

  // DSH ≤ 0.1.6 names the shown Session directly.
  if (typeof list.current === "string" && list.current !== "") return list.current;

  // DSH ≥ 0.1.7 keeps references instead: the main view holds one.
  if (list.byId === null || typeof list.byId !== "object") return undefined;
  for (const row of Object.values(list.byId as Record<string, unknown>)) {
    if (row === null || typeof row !== "object") continue;
    const candidate = row as { id?: unknown; retainedBy?: unknown };
    if (typeof candidate.id !== "string" || candidate.id === "") continue;
    const retained = candidate.retainedBy;
    if (retained === null || typeof retained !== "object") continue;
    const held = (retained as Record<string, unknown>).mainView;
    if (typeof held === "number" && held > 0) return candidate.id;
  }
  return undefined;
}
