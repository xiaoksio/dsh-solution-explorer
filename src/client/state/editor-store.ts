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
  /** Stable identity: `file:<root>:<path>` or `diff:<root>:<path>:<staged>`. */
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
  /**
   * Tabs whose file has a renderer: whether the rendered form replaces the
   * source editor. Undefined for every other file, so the info row offers no
   * toggle for them.
   */
  preview?: boolean
}

/** How a file is rendered in preview mode, or null when it has no renderer. */
export type PreviewKind = 'markdown' | 'html' | 'pdf'

/**
 * Whether a renderer leaves anything to edit as source. A PDF is bytes: it has
 * a rendered form and nothing else, so its info row draws no source toggle.
 * @param kind - the renderer in force.
 * @returns true when the source editor is a meaningful alternative.
 */
export function previewHasSource(kind: PreviewKind | null): boolean {
  return kind === 'markdown' || kind === 'html'
}

/**
 * The renderer a path has here, by its last extension.
 * @param path - a workspace-relative path.
 * @returns the renderer, or null for a file this plugin only edits as source.
 */
export function previewKindOf(path: string): PreviewKind | null {
  const normalized = path.replace(/\\/g, '/')
  if (/\.(?:md|markdown)$/i.test(normalized)) return 'markdown'
  if (/\.(?:html?)$/i.test(normalized)) return 'html'
  if (/\.pdf$/i.test(normalized)) return 'pdf'
  return null
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

/**
 * Stable identity: `file:<root>:<path>` or `diff:<root>:<path>:<staged>`.
 *
 * The workspace root is part of it because a relative path names different files
 * in different workspaces: two Sessions may both hold `README.md`, and one tab
 * must not stand for both.
 * @param kind - editable file or git diff.
 * @param path - workspace-relative or absolute path.
 * @param root - the workspace root the path is read through.
 * @param staged - diff tabs only: whether the staged side is shown.
 * @returns the tab's identity.
 */
export function tabId(kind: EditorTabKind, path: string, root = '', staged = false): string {
  return kind === 'diff'
    ? `diff:${root}:${path}:${staged ? 'staged' : 'worktree'}`
    : `file:${root}:${path}`
}

export function makeTab(kind: EditorTabKind, path: string, staged: boolean, root: string): EditorTab {
  return {
    id: tabId(kind, path, root, staged),
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
    // A file with a renderer opens as its rendered form — the Sidebar's own
    // document preview is what the file-link call sites expect — and the info
    // row's toggle switches it to the source editor.
    preview: kind === 'file' && previewKindOf(path) !== null ? true : undefined,
  }
}

/** Activate an open tab, opening it first when it is not open yet. */
export function ensureTab(kind: EditorTabKind, path: string, staged: boolean, root: string): { tab: EditorTab; created: boolean } {
  const id = tabId(kind, path, root, staged)
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
