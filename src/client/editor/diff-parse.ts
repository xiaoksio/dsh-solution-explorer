/**
 * Diff text helpers — pure functions over a unified diff.
 * @module dsh-solution-explorer/client/editor/diff-parse
 */

/** Convert a unified diff into old/new row pairs (with line numbers) for a side-by-side view. */
export function parseSideBySide(content: string): Array<{ old: string; new: string; oldNum: number | null; newNum: number | null }> {
  const rows: Array<{ old: string; new: string; oldNum: number | null; newNum: number | null }> = []
  let oldLine = 0, newLine = 0
  for (const line of content.split("\n")) {
    if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) continue
    if (line.startsWith("@@")) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) {
        oldLine = parseInt(m[1], 10)
        newLine = parseInt(m[2], 10)
      }
      continue
    }
    if (line.startsWith("+")) {
      rows.push({ old: "", new: line.slice(1), oldNum: null, newNum: newLine++ })
      continue
    }
    if (line.startsWith("-")) {
      rows.push({ old: line.slice(1), new: "", oldNum: oldLine++, newNum: null })
      continue
    }
    rows.push({ old: line.slice(1), new: line.slice(1), oldNum: oldLine++, newNum: newLine++ })
  }
  return rows
}
