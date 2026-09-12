/**
 * React panel root — the single mounting point for the whole right panel.
 *
 * `panel.ts` renders this through one React root instead of assigning
 * `innerHTML`. The activity bar, the collapsed rail, the tree / search / SCM
 * views, the commit list, the context menu and the terminal chrome are all
 * real React components; portalled content (context menu) attaches to
 * `document.body`.
 * @module dsh-solution-explorer/client/PanelRoot
 */
import { createElement as h, Fragment } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import {
  IconSearchOutline16,
  IconBranchOutline16,
  IconPanelLeftOutline16,
  IconFolderClose16,
  IconCodeOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from './locales.ts'
import { TreePanel } from './explorer/TreePanel.ts'
import type { TreeActions } from './explorer/TreePanel.ts'
import { SearchPanel } from './explorer/SearchPanel.ts'
import type { SearchActions } from './explorer/SearchPanel.ts'
import { ScmPanel } from './scm/ScmPanel.ts'
import type { ScmActions } from './scm/ScmPanel.ts'
import { ContextMenu } from './explorer/ContextMenu.ts'
import type { AppState } from './state/store.ts'

/** Panel-level actions (activity bar, rail and panel toggles). */
export interface PanelActions {
  tab(tab: 'explorer' | 'search' | 'scm'): void
  /** Rail icon: switch to that tab and expand the panel again. */
  railOpen(tab: 'explorer' | 'search' | 'scm'): void
  togglePanel(): void
  toggleTerminal(): void
  closeMenu(): void
  tree: TreeActions
  search: SearchActions
  scm: ScmActions
}



/** Props of the panel root. */
export interface PanelRootProps {
  state: AppState
  actions: PanelActions
}

function ActivityBar({ state, actions }: { state: AppState; actions: PanelActions }): ReactNode {
  const btn = (
    tab: 'explorer' | 'search' | 'scm', title: string, icon: ReactNode, badge?: number,
  ): ReactNode => h('div', {
    className: 'sol-exp-activity-btn' + (state.currentTab === tab ? ' active' : ''),
    title,
    onClick: () => actions.tab(tab),
  }, icon, badge ? h('span', { className: 'sol-exp-activity-badge' }, badge) : null)

  return h('div', { className: 'sol-exp-activity' },
    btn('explorer', t('panel.explorer'), h(IconFolderClose16, { size: 16 })),
    btn('search', t('file.search'), h(IconSearchOutline16, { size: 16 })),
    btn('scm', t('panel.scm'), h(IconBranchOutline16, { size: 16 }), state.scm.gitChangesCount > 0 ? state.scm.gitChangesCount : undefined),
    h('div', {
      className: 'sol-exp-activity-btn' + (state.terminal.terminalOpen ? ' active' : ''),
      title: t('panel.terminal'),
      onClick: () => actions.toggleTerminal(),
    }, h(IconCodeOutline16, { size: 16 })),
    h('div', { style: { flex: 1 } }),
    h('div', {
      className: 'sol-exp-activity-btn sol-exp-panel-toggle',
      title: t('panel.collapse'),
      onClick: () => actions.togglePanel(),
    }, h(IconPanelLeftOutline16, { size: 16 })),
  )
}

/** The collapsed rail: expand control plus the same feature entries. */
function CollapsedRail({ state, actions }: { state: AppState; actions: PanelActions }): ReactNode {
  const icon = (
    title: string, glyph: ReactNode, onClick: () => void, extra = '', badge?: number,
  ): ReactNode => h('button', {
    className: 'sol-exp-rail-icon' + extra,
    title,
    onClick,
  }, glyph, badge ? h('span', { className: 'sol-exp-activity-badge' }, badge) : null)

  return h('div', { className: 'sol-exp-panel sol-exp-panel-rail' },
    h('button', {
      className: 'sol-exp-rail-btn',
      title: t('panel.expand'),
      onClick: () => actions.togglePanel(),
    }, h(IconPanelLeftOutline16, { size: 16 })),
    icon(t('panel.explorer'), h(IconFolderClose16, { size: 16 }), () => actions.railOpen('explorer')),
    icon(t('file.search'), h(IconSearchOutline16, { size: 16 }), () => actions.railOpen('search')),
    icon(t('panel.scm'), h(IconBranchOutline16, { size: 16 }), () => actions.railOpen('scm'),
      '', state.scm.gitChangesCount > 0 ? state.scm.gitChangesCount : undefined),
    icon(t('panel.terminal'), h(IconCodeOutline16, { size: 16 }), () => actions.toggleTerminal(),
      ' sol-exp-terminal-toggle' + (state.terminal.terminalOpen ? ' active' : '')),
  )
}

/** The panel root: collapsed rail, or the activity bar plus the active tab. */
export function PanelRoot({ state, actions }: PanelRootProps): ReactNode {
  if (state.layout.panelCollapsed) return h(CollapsedRail, { state, actions })

  let content: ReactNode
  if (state.currentTab === 'explorer') {
    content = h(TreePanel, { root: state.root, tree: state.tree, clipboard: state.clipboard, actions: actions.tree })
  } else if (state.currentTab === 'search') {
    content = h(SearchPanel, { search: state.search, tree: state.tree, root: state.root, actions: actions.search })
  } else {
    content = h(ScmPanel, { scm: state.scm, commits: state.commits, root: state.root, actions: actions.scm })
  }

  return h(Fragment, null,
    h('div', {
      className: 'sol-exp-panel',
      onDragOver: (e) => e.preventDefault(),
    },
      h(ActivityBar, { state, actions }),
      h('div', { className: 'sol-exp-body' },
        h('div', { className: 'sol-exp-main' }, content)),
    ),
    state.contextMenu
      ? createPortal(
          h(ContextMenu, { menu: state.contextMenu, onClose: () => actions.closeMenu() }),
          document.body,
        )
      : null,
  )
}
