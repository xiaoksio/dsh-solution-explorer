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
 * Decode one address segment.
 *
 * A malformed escape is the address's problem, not this reader's: the raw segment
 * is a better answer than refusing the whole address and handing the file to
 * another panel.
 * @param segment - one percent-encoded segment.
 * @returns the decoded segment, or the segment itself when it cannot be decoded.
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Read a `dsh-resource://file/...` address.
 *
 * Deliberately tolerant. Every shape that can name a file is read, including the
 * ones the grammar allows but the writers rarely emit: a Session scope whose id
 * has not been resolved yet (`session//<path>`, which the client itself produces
 * while a session is still being picked), and any other scope, whose remainder is
 * taken as the path. Refusing an address does not make it unopenable — it hands
 * the file to whichever panel registers next — so only an address with no path at
 * all comes back undefined.
 * @param address - a candidate address.
 * @returns its parts, or undefined when the address names no path.
 */
export function parseFileAddress(address: string): FileRef | undefined {
  const trimmed = address.trim();
  if (trimmed.length < PREFIX.length || trimmed.slice(0, PREFIX.length).toLowerCase() !== PREFIX) return undefined;
  const end = trimmed.search(/[?#]/);
  const body = trimmed.slice(PREFIX.length, end === -1 ? undefined : end);
  const [scope, ...rest] = body.split("/");
  if (scope === "session") {
    const [id, ...segments] = rest;
    const path = segments.map(decodeSegment).join("/");
    if (path === "") return undefined;
    // An unresolved id stays undefined so the reader falls back to the workspace
    // this panel shows rather than inventing a session.
    return { sessionId: id === "" ? undefined : decodeSegment(id), path, absolute: isAbsolute(path) };
  }
  if (scope === "absolute") {
    // An empty first segment with more behind it is a UNC path's `//`.
    const unc = rest[0] === "" && rest.length > 1;
    const segments = (unc ? rest.slice(1) : rest).map(decodeSegment);
    const joined = segments.join("/");
    if (joined === "") return undefined;
    return { path: unc ? "//" + joined : isAbsolute(joined) ? joined : "/" + joined, absolute: true };
  }
  // An unknown scope is read as the path itself: guessing beats deferring.
  const path = [scope, ...rest].map(decodeSegment).join("/");
  return path === "" ? undefined : { path, absolute: isAbsolute(path) };
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
