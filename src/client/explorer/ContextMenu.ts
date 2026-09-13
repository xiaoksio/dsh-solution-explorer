/**
 * React context menu — rendered from `state.contextMenu` through a portal.
 *
 * The menu is a React element tree now: entries come from state (built by the
 * context-menu commands), clicking an entry closes the menu and runs its action.
 * @module dsh-solution-explorer/client/explorer/ContextMenu
 */
import { createElement as h, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ContextMenuState } from '../state/store.ts'

/** Gap kept between the menu and the viewport edge. */
const EDGE = 8

/** Props of the context menu. */
export interface ContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
}

/**
 * The floating context menu, positioned near the click point.
 *
 * The click decides where the menu wants to be; its own drawn height and width
 * decide where it may be. Nothing here may hang past an edge: a menu reaching
 * below the viewport lengthens the document, which shifts the whole interface —
 * the reported symptom. The correction runs in a layout effect, before the
 * browser paints, so the menu is never drawn at the wrong place first.
 * @param props - the menu state and the close callback.
 * @returns the positioned menu.
 */
export function ContextMenu({ menu, onClose }: ContextMenuProps): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null)
  // State coordinates are page-based; a fixed box is placed against the viewport.
  const [pos, setPos] = useState({ left: menu.x - window.scrollX, top: menu.y - window.scrollY })

  useLayoutEffect(() => {
    const el = ref.current
    if (el === null) return
    const box = el.getBoundingClientRect()
    setPos({
      left: Math.max(EDGE, Math.min(menu.x - window.scrollX, window.innerWidth - box.width - EDGE)),
      top: Math.max(EDGE, Math.min(menu.y - window.scrollY, window.innerHeight - box.height - EDGE)),
    })
  }, [menu.x, menu.y, menu.entries.length])

  return h('div', {
    ref,
    className: 'sol-exp-context-menu',
    style: {
      left: pos.left + 'px',
      top: pos.top + 'px',
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
