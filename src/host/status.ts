import { git, isGitRepo } from './git-runner.ts'
import { normPath, unquoteGitPath } from './paths.ts'
import type { FileTreeNode } from './tree.ts'

export interface GitChange {
  path: string
  status: string
  oldPath?: string
}

export interface GitStatusData {
  staged: GitChange[]
  unstaged: GitChange[]
  untracked: GitChange[]
  conflicts: GitChange[]
  ignored: GitChange[]
  ahead: number
  behind: number
  branch: string
  head: string
}

export type GitEnvelope =
  | { ok: true; value: GitStatusData }
  | { ok: false; error: { message: string } }

/** Get the structured git status of a repo. */
export function getGitStatus(root: string): GitEnvelope {
  if (!isGitRepo(root)) {
    return { ok: true, value: { staged: [], unstaged: [], untracked: [], conflicts: [], ignored: [], ahead: 0, behind: 0, branch: 'unknown', head: '' } }
  }
  const branchResult = git(['rev-parse', '--abbrev-ref', 'HEAD'], root)
  const branch = branchResult.ok ? branchResult.stdout : 'HEAD'
  // Full HEAD hash lets the client detect external commits/checkouts so the
  // commit history can auto-refresh after a command-line `git commit`.
  const headResult = git(['rev-parse', 'HEAD'], root)
  const head = headResult.ok ? headResult.stdout : ''

  const aheadBehind = git(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], root)
  let ahead = 0, behind = 0
  if (aheadBehind.ok) {
    const parts = aheadBehind.stdout.split('\t')
    ahead = parseInt(parts[0] || '0', 10)
    behind = parseInt(parts[1] || '0', 10)
  }

  // --ignored=matching lists ignored paths one level deep (an ignored directory
  // is a single "!! dir/" line, never expanded) so the explorer can grey them.
  // core.quotePath=false keeps paths with spaces/UTF-8 unquoted — porcelain
  // v1 otherwise wraps them in C-style quotes and the parsed path breaks
  // stage/discard for files like "AGENTS copy.md".
  let statusResult = git(['-c', 'core.quotePath=false', 'status', '--porcelain', '-u', '--ignored=matching'], root)
  if (!statusResult.ok && /ignored|unknown option|usage/i.test(statusResult.error)) {
    statusResult = git(['-c', 'core.quotePath=false', 'status', '--porcelain', '-u'], root)
  }
  const staged: GitChange[] = []
  const unstaged: GitChange[] = []
  const untracked: GitChange[] = []
  const conflicts: GitChange[] = []
  const ignored: GitChange[] = []

  if (statusResult.ok && statusResult.stdout) {
    const lines = statusResult.stdout.split('\n')
    for (const line of lines) {
      if (line.length < 3) continue
      const st = line[0]
      const us = line[1]
      const filePath = unquoteGitPath(line.substring(3).trim())
      const match = filePath.match(/^(.+?)\s+->\s+(.+)$/)
      const path = match ? unquoteGitPath(match[2].trim()) : filePath
      const oldPath = match ? unquoteGitPath(match[1].trim()) : undefined

      if (st === '!' && us === '!') {
        ignored.push({ path, status: '!' })
        continue
      }

      if (st === '?' && us === '?') {
        untracked.push({ path, status: '?' })
        continue
      }
      // Merge conflict states are exactly UU AA DD AU UA DU UD — a plain
      // two-column entry like MM (partially staged) must NOT be treated as a
      // conflict, it stays staged + unstaged below.
      if (st === 'U' || us === 'U' || (st === 'A' && us === 'A') || (st === 'D' && us === 'D')) {
        conflicts.push({ path, status: st + us, oldPath })
        continue
      }
      if (st !== ' ') staged.push({ path, status: st, oldPath })
      if (us !== ' ') unstaged.push({ path, status: us, oldPath })
    }
  }

  return { ok: true, value: { staged, unstaged, untracked, conflicts, ignored, ahead, behind, branch, head } }
}

/**
 * Annotate each file node with its git status letter (M/A/D/R/U/?) or an
 * ignored marker ('!'), and each directory with 'M' when any descendant has
 * changes, '!' when it is itself excluded, otherwise undefined — VS Code style.
 *
 * Directory markers come from the status paths themselves (every ancestor of a
 * changed path is marked), never from the materialized children: the tree is
 * sent pruned to the expanded directories, so a collapsed folder holding
 * changes must still light up.
 * @param node - the tree node to annotate.
 * @param status - the repository git status (staged + unstaged + untracked + ignored).
 * @returns whether this node (or any descendant) has a change.
 */
export function annotateGitStatus(node: FileTreeNode, status: GitStatusData): boolean {
  // Git may report a directory as "dir/" while tree nodes never carry the
  // trailing slash, so strip it before matching.
  const norm = (p: string) => normPath(p).replace(/\/+$/, '')
  const map = new Map<string, string>()
  for (const c of [...status.staged, ...status.unstaged, ...status.untracked]) {
    if (!map.has(norm(c.path))) map.set(norm(c.path), c.status)
  }
  // Conflicts (UU/AA/DD/...) collapse to a single 'U' marker, matching the
  // SCM badge, so the tree and the change panel agree on conflicted files.
  for (const c of status.conflicts) {
    if (!map.has(norm(c.path))) map.set(norm(c.path), 'U')
  }
  const ignoredSet = new Set(status.ignored.map((c) => norm(c.path)))
  // Every directory on the way to a changed path is itself "changed".
  const changedDirs = new Set<string>()
  for (const p of map.keys()) {
    const segments = p.split('/')
    let acc = ''
    for (let i = 0; i < segments.length - 1; i++) {
      acc = acc ? acc + '/' + segments[i] : segments[i]
      changedDirs.add(acc)
    }
  }
  // Git reports an ignored directory as a single "!! dir/" line and never
  // expands its contents, so inherit the ignored state down the tree:
  // everything under an excluded directory is greyed too, unless a tracked
  // change (e.g. a force-added file) overrides the marker.
  const walk = (n: FileTreeNode, parentIgnored: boolean): void => {
    const key = norm(n.path)
    const selfIgnored = parentIgnored || ignoredSet.has(key)
    if (n.type === 'file') {
      n.gitStatus = map.get(key) ?? (selfIgnored ? '!' : undefined)
      return
    }
    // A change anywhere beats an "ignored" marker; an ignored directory with
    // no changes shows grey ('!') so excluded folders read at a glance.
    n.gitStatus = changedDirs.has(key) ? 'M' : selfIgnored ? '!' : undefined
    for (const child of n.children ?? []) walk(child, selfIgnored)
  }
  walk(node, false)
  return true
}
