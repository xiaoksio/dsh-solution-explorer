/**
 * React context menu — rendered from `state.contextMenu` through a portal.
 *
 * The menu is a React element tree now: entries come from state (built by the
 * context-menu commands), clicking an entry closes the menu and runs its action.
 * @module dsh-solution-explorer/client/explorer/ContextMenu
 */
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { ContextMenuState } from '../state/store.ts'

/** Props of the context menu. */
export interface ContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
}

/** The floating context menu, positioned at the click point. */
export function ContextMenu({ menu, onClose }: ContextMenuProps): ReactNode {
  return h('div', {
    className: 'sol-exp-context-menu',
    style: {
      left: Math.min(menu.x, window.innerWidth - 160) + 'px',
      top: Math.min(menu.y, window.innerHeight - 80) + 'px',
    },
    onClick: (e) => e.stopPropagation(),
    onContextMenu: (e) => e.preventDefault(),
  },
    menu.entries.map((entry, index) => h('div', {
      key: index,
      className: 'sol-exp-context-menu-item' + (entry.danger ? ' danger' : ''),
      onClick: () => { onClose(); entry.onSelect() },
    }, entry.label)),
  )
}
