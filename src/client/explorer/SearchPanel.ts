/**
 * React search panel — the search tab of the unified React client render.
 *
 * Rows are React elements, events call `actions`, and the
 * glyphs are official @deepseek-ai/dsh-client-ui-primitives icons.
 * @module dsh-solution-explorer/client/explorer/SearchPanel
 */
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import { FileTypeIcon, IconFolderClose16, IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from '../locales.ts'
import type { SearchState, TreeState } from '../state/store.ts'

/** One search hit as the /search route returns it. */
export interface SearchHit {
  path: string
  name: string
  type: 'directory' | 'file' | string
}

/** Every search interaction the search view can invoke. */
export interface SearchActions {
  search(query: string): void
  selectFile(path: string, isDir: boolean): void
  contextMenu(path: string, x: number, y: number, isDir: boolean): void
}

/** Props of the search panel. */
export interface SearchPanelProps {
  search: SearchState
  tree: TreeState
  root: string
  actions: SearchActions
}

/** The explorer search panel: header, query row, and results. */
export function SearchPanel({ search, tree, root, actions }: SearchPanelProps): ReactNode {
  const title = root ? (root.split(/[\\/]/).pop() || root) : ''
  const results = (search.searchResults ?? []) as SearchHit[]

  let content: ReactNode
  if (search.searching && results.length === 0) content = h('div', { className: 'sol-exp-empty' }, t('search.noMatch'))
  else if (results.length > 0) {
    content = h('div', { className: 'sol-exp-search-results' },
      results.map((r) => {
        const isDir = r.type === 'directory'
        return h('div', {
          key: r.path,
          className: 'sol-exp-search-item' + (tree.selectedPath === r.path ? ' sol-exp-selected' : ''),
          'data-sol-exp-path': r.path,
          onClick: () => actions.selectFile(r.path, isDir),
          onContextMenu: (e) => {
            e.preventDefault()
            e.stopPropagation()
            actions.contextMenu(r.path, e.pageX, e.pageY, isDir)
          },
        },
          h('span', { className: 'sol-exp-icon' },
            isDir ? h(IconFolderClose16, { size: 16 }) : h(FileTypeIcon, { path: r.path, size: 16 })),
          h('span', { className: 'sol-exp-name' }, r.name),
          h('span', { className: 'sol-exp-path' }, r.path),
        )
      }))
  } else content = h('div', { className: 'sol-exp-empty' }, t('search.prompt'))

  return h('div', { className: 'sol-exp-search-panel' },
    h('div', { className: 'sol-exp-header' }, h('span', { className: 'sol-exp-title' }, title)),
    h('div', { className: 'sol-exp-search' },
      h(IconSearchOutline16, { size: 14, className: 'sol-exp-search-icon' }),
      h('input', {
        type: 'text',
        className: 'sol-exp-search-input',
        placeholder: t('file.search'),
        value: search.searchQuery,
        onChange: (e) => actions.search(e.target.value),
        onKeyDown: (e) => { if (e.key === 'Escape') actions.search('') },
      }),
    ),
    h('div', { className: 'sol-exp-content' }, content),
  )
}
