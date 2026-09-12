/**
 * File-kind helpers shared by the tree, SCM and commits views.
 *
 * Icons themselves are React components from
 * @deepseek-ai/dsh-client-ui-primitives; this module only classifies a path.
 * @module dsh-solution-explorer/client/explorer/file-kind
 */

// Image extensions that open in the editor's image preview (kept in
// sync with the host's IMAGE_EXT set).
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"])

export function isImageFile(name: string): boolean {
  const ext = (name.includes(".") ? name.split(".").pop() : name).toLowerCase()
  return IMAGE_EXTS.has(ext)
}

// Shared git-status class mapping so the tree badge, the SCM badge
// and any future surfaces render the same way: '?' -> q (untracked),
// '!' -> x (ignored), multi-letter conflict states -> first letter.
export function gitStatusClass(s: string): string {
  if (s === "?") return "q"
  if (s === "!") return "x"
  return s.length > 1 ? s[0] : s
}
