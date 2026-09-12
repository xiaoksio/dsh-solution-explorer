/**
 * Editor tab strip — one row of open editor/diff tabs.
 *
 * The strip holds tabs and nothing else: the active file's path, kind, save
 * state and (for images) zoom live in the info row below it.
 * @module dsh-solution-explorer/client/editor/EditorTabs
 */
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import {
  FileTypeIcon,
  IconBranchOutline16,
  IconCloseOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from '../locales.ts'

/** One open tab as the strip renders it. */
export interface EditorTabView {
  id: string
  kind: 'file' | 'diff' | string
  path: string
  staged: boolean
  dirty: boolean
}

export interface EditorTabsProps {
  tabs: EditorTabView[]
  activeId: string | null
  onActivate(id: string): void
  onClose(id: string): void
}

function baseName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
}

/** The strip itself; hidden while nothing is open. */
export function EditorTabs({ tabs, activeId, onActivate, onClose }: EditorTabsProps): ReactNode {
  if (tabs.length === 0) return null
  return h('div', { className: 'sol-exp-etabs', role: 'tablist' },
    tabs.map((tab) => {
      const active = tab.id === activeId
      const isDiff = tab.kind === 'diff'
      const title = isDiff
        ? `${tab.path}${tab.staged ? ' (staged)' : ''}`
        : tab.path
      return h('div', {
        key: tab.id,
        role: 'tab',
        'aria-selected': active,
        className: 'sol-exp-etab' + (active ? ' active' : ''),
        title,
        onMouseDown: (e) => { if (e.button === 1) { e.preventDefault(); onClose(tab.id) } },
        onClick: () => onActivate(tab.id),
      },
        h('span', { className: 'sol-exp-etab-icon' },
          isDiff ? h(IconBranchOutline16, { size: 14 }) : h(FileTypeIcon, { path: tab.path, size: 14 })),
        h('span', { className: 'sol-exp-etab-name' }, baseName(tab.path) + (isDiff ? ' (diff)' : '')),
        tab.dirty ? h('span', { className: 'sol-exp-etab-dot', title: t('editor.unsaved') }, '●') : null,
        h('button', {
          type: 'button',
          className: 'sol-exp-etab-close',
          title: t('editor.tab.close'),
          onClick: (e) => { e.stopPropagation(); onClose(tab.id) },
        }, h(IconCloseOutline16, { size: 12 })),
      )
    }),
  )
}
