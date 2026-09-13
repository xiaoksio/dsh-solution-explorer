/**
 * Reader for the Sidebar's file addresses — viewer domain.
 * @module dsh-solution-explorer/client/viewer/address
 */

/**
 * The address grammar is owned by `@deepseek-ai/dsh-util-workspace-path`
 * (`file-address.ts`), which is not a dependency of this package:
 *
 * - `dsh-resource://file/session/<sessionId>/<path>` names a file by the Session
 *   whose workspace root resolves it; `<path>` is workspace-relative or absolute.
 * - `dsh-resource://file/absolute/<path>` names a file by its absolute path and
 *   carries no Session.
 *
 * Every id and path segment is percent-encoded except `:` in a drive letter, and
 * a query or fragment suffix is ignored.
 */

/** A file named by a resource address, in either of the grammar's scopes. */
export interface FileRef {
  /** The Session that resolves the path; absent for the absolute scope. */
  readonly sessionId?: string;
  /** Workspace-relative or absolute, `/`-separated. */
  readonly path: string;
  readonly absolute: boolean;
}

const PREFIX = "dsh-resource://file/";

/** Whether a path is absolute in either the POSIX or the Windows spelling. */
function isAbsolute(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

/**
 * Read a `dsh-resource://file/...` address.
 * @param address - a candidate address.
 * @returns its parts, or undefined for another type or a malformed escape.
 */
export function parseFileAddress(address: string): FileRef | undefined {
  try {
    if (!address.startsWith(PREFIX)) return undefined;
    const end = address.search(/[?#]/);
    const [scope, ...rest] = address.slice(PREFIX.length, end === -1 ? undefined : end).split("/");
    if (scope === "session") {
      const [id, ...segments] = rest;
      if (id === undefined || id === "" || segments.length === 0) return undefined;
      const path = segments.map(decodeURIComponent).join("/");
      if (path === "") return undefined;
      return { sessionId: decodeURIComponent(id), path, absolute: isAbsolute(path) };
    }
    if (scope === "absolute") {
      // An empty first segment with more behind it is a UNC path's `//`.
      const unc = rest[0] === "" && rest.length > 1;
      const segments = (unc ? rest.slice(1) : rest).map(decodeURIComponent);
      if (segments.length === 0 || segments[0] === "") return undefined;
      const joined = segments.join("/");
      return { path: unc ? "//" + joined : isAbsolute(joined) ? joined : "/" + joined, absolute: true };
    }
    return undefined;
  } catch {
    // `decodeURIComponent` throws URIError on a malformed escape; the address is
    // then not one this plugin can read.
    return undefined;
  }
}

/** The last path segment, for the tab chip's title. */
export function addressBasename(address: string): string {
  const ref = parseFileAddress(address);
  const path = ref === undefined ? address : ref.path;
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name === "" ? path : name;
}

/**
 * Express a reference as a path under a workspace root.
 * @param root - the workspace root this plugin reads through, or `''` when it has none.
 * @param ref - a parsed address.
 * @returns the `/`-separated path relative to `root`; a relative reference is
 * already one. Undefined when an absolute reference lies outside the root, which
 * is the caller's cue to hand the absolute path on and let the read report it.
 */
export function resolveInside(root: string, ref: FileRef): string | undefined {
  if (!ref.absolute) return ref.path.replace(/^(?:\.\/)+/, "");
  if (root === "") return undefined;
  const rootSlash = root.replace(/\\/g, "/").replace(/\/+$/, "");
  const pathSlash = ref.path.replace(/\\/g, "/");
  // Lowercasing keeps both lengths, so the slice below stays valid.
  const rootKey = rootSlash.toLowerCase();
  const pathKey = pathSlash.toLowerCase();
  if (pathKey === rootKey) return "";
  if (!pathKey.startsWith(rootKey + "/")) return undefined;
  return pathSlash.slice(rootSlash.length + 1);
}
