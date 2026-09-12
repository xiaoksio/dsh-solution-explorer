import * as fsp from 'node:fs/promises'
import * as pathModule from 'node:path'
import { matchesFilter, normPath } from './paths.ts'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  mtime: number
  children?: FileTreeNode[]
  gitStatus?: string
}

export interface FileSearchResult {
  name: string
  path: string
  type: 'file' | 'directory'
}

/** Image extensions the editor can preview (served raw via /raw). */
export const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'])

export function imageMime(ext: string): string {
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'svg': return 'image/svg+xml'
    case 'ico': return 'image/x-icon'
    default: return 'image/' + ext
  }
}

/**
 * Entries the tree hides unless the "show hidden files" setting is on:
 * dot-prefixed names (including `.git`) and `node_modules`. No other name is
 * special-cased.
 */
function isIgnoredEntry(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules'
}

/**
 * Build the file tree for a workspace.
 *
 * `expandPaths` bounds the walk to what the client actually renders: only the
 * root and the listed directories are listed. A collapsed directory is still
 * returned as a node (so it has a name, type and git marker) but without
 * `children`, which keeps the payload proportional to the visible rows instead
 * of the whole tree. Pass `null` to expand everything.
 */
export async function buildFileTree(root: string, relativePath: string, filterPatterns: string[] = [], showHidden = false, expandPaths: Set<string> | null = null): Promise<FileTreeNode> {
  const fullPath = relativePath ? pathModule.join(root, relativePath) : root
  const name = relativePath ? pathModule.basename(relativePath) : pathModule.basename(root)
  const stat = await fsp.stat(fullPath)
  const node: FileTreeNode = {
    name, path: relativePath || '/',
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size, mtime: stat.mtimeMs,
  }
  if (stat.isDirectory()) {
    // The root is always listed; any other directory only when the client has
    // it expanded. A skipped directory still returns as a node above, so the
    // tree stays navigable — expanding it just costs one more request.
    const isRoot = relativePath === ''
    if (!isRoot && expandPaths !== null && !expandPaths.has(normPath(relativePath))) return node
    const entries = await fsp.readdir(fullPath, { withFileTypes: true })
    const sorted = entries
      // Ignored entries are dropped unless showHidden; user filter patterns
      // always apply on top.
      .filter(e => (showHidden || !isIgnoredEntry(e.name)) && !matchesFilter(e.name, filterPatterns))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })
    node.children = []
    for (const entry of sorted) {
      const childRel = relativePath ? pathModule.join(relativePath, entry.name) : entry.name
      try {
        if (entry.isSymbolicLink()) {
          // Links (pnpm junctions, Windows reparse points) are listed but never
          // followed: one link can point back into an ancestor, which would
          // duplicate whole subtrees or loop forever. `stat` resolves the link
          // only for the node's own type/size.
          const linkStat = await fsp.stat(pathModule.join(root, childRel)).catch(() => null)
          node.children.push({
            name: entry.name, path: childRel,
            type: linkStat?.isDirectory() ? 'directory' : 'file',
            size: linkStat?.size ?? 0, mtime: linkStat?.mtimeMs ?? 0,
          })
          continue
        }
        node.children.push(await buildFileTree(root, childRel, filterPatterns, showHidden, expandPaths))
      } catch { /* skip unreadable */ }
    }
  }
  return node
}

export async function searchFiles(root: string, query: string, maxResults = 50): Promise<FileSearchResult[]> {
  const results: FileSearchResult[] = []
  async function walk(dir: string): Promise<void> {
    if (results.length >= maxResults) return
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (results.length >= maxResults) return
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const fullPath = pathModule.join(dir, entry.name)
        const rel = pathModule.relative(root, fullPath)
        if (entry.name.toLowerCase().includes(query)) {
          results.push({ name: entry.name, path: rel, type: entry.isDirectory() ? 'directory' : 'file' })
        }
        if (entry.isDirectory()) await walk(fullPath)
      }
    } catch { /* skip */ }
  }
  await walk(root)
  return results
}
