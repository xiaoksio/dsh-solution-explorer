/**
 * Editor tab state — a module-level singleton shared by the editor commands
 * handlers and the EditorView React component. Kept as a plain mutable object
 * (not a subscription store) so the explicit notifyEditorListeners call sites
 * stay unchanged.
 *
 * One store holds every open tab, including diff tabs, so the editor has a
 * single source of truth: the strip renders `tabs`, and the body renders
 * whichever tab `activeId` points at.
 * @module dsh-solution-explorer/client/state/editor-store
 */

/** A tab shows either an editable file or a git diff of one. */
export type EditorTabKind = 'file' | 'diff'

export interface EditorTab {
  /** Stable identity: `file:<path>` or `diff:<path>:<staged>`. */
  id: string
  kind: EditorTabKind
  path: string
  /** Diff tabs only: whether the staged side is shown. */
  staged?: boolean
  /** Loaded text (null while loading, for images, or for unsupported files). */
  content: string | null
  loading: boolean
  error: string | null
  unsupported: boolean
  image: boolean
  /** Buffer differs from what was last loaded/saved from disk. */
  dirty: boolean
  saving: boolean
  /** Diff tabs only: the raw unified diff plus its two sides. */
  diffContent?: string | null
  diffOldContent?: string
  diffNewContent?: string
  /** Workspace root the tab was opened in. */
  root: string
}

export const editorStore = {
  tabs: [] as EditorTab[],
  activeId: null as string | null,
  listeners: new Set<() => void>(),
}

export function findTab(id: string | null): EditorTab | null {
  if (id === null) return null
  for (const tab of editorStore.tabs) if (tab.id === id) return tab
  return null
}

/** The tab the editor body renders, or null when nothing is open. */
export function activeTab(): EditorTab | null {
  return findTab(editorStore.activeId)
}

export function tabId(kind: EditorTabKind, path: string, staged = false): string {
  return kind === 'diff' ? `diff:${path}:${staged ? 'staged' : 'worktree'}` : `file:${path}`
}

export function makeTab(kind: EditorTabKind, path: string, staged: boolean, root: string): EditorTab {
  return {
    id: tabId(kind, path, staged),
    kind,
    path,
    staged,
    content: null,
    loading: true,
    error: null,
    unsupported: false,
    image: false,
    dirty: false,
    saving: false,
    root,
  }
}

/** Activate an open tab, opening it first when it is not open yet. */
export function ensureTab(kind: EditorTabKind, path: string, staged: boolean, root: string): { tab: EditorTab; created: boolean } {
  const id = tabId(kind, path, staged)
  const existing = findTab(id)
  if (existing !== null) {
    editorStore.activeId = id
    return { tab: existing, created: false }
  }
  const tab = makeTab(kind, path, staged, root)
  editorStore.tabs = [...editorStore.tabs, tab]
  editorStore.activeId = id
  return { tab, created: true }
}

/** Close one tab; the neighbour takes over so the body is never blanked. */
export function removeTab(id: string): void {
  const index = editorStore.tabs.findIndex((t) => t.id === id)
  if (index === -1) return
  const next = editorStore.tabs.slice()
  next.splice(index, 1)
  editorStore.tabs = next
  if (editorStore.activeId === id) {
    const fallback = next[index] ?? next[index - 1] ?? null
    editorStore.activeId = fallback ? fallback.id : null
  }
}

export function notifyEditorListeners(): void {
  for (const fn of editorStore.listeners) editorStore.listeners.has(fn) && fn()
}
