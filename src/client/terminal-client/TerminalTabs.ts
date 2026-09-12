/**
 * React tab strip for the embedded terminal.
 *
 * The xterm panes stay imperative (xterm owns its own DOM), but the tab strip
 * is a React component rendered into the shell's strip container.
 * @module dsh-solution-explorer/client/terminal-client/TerminalTabs
 */
import { createElement as h, Fragment } from 'react'
import type { ReactNode } from 'react'

/** One tab as the controller exposes it. */
export interface TerminalTabInfo {
  title: string
  shell: string
  exited?: boolean
}

/** Localized labels for the strip. */
export interface TerminalTabsLabels {
  tab: string
  close: string
  add: string
}

/** Props of the terminal tab strip. */
export interface TerminalTabsProps {
  tabs: TerminalTabInfo[]
  active: number
  canAdd: boolean
  labels: TerminalTabsLabels
  onActivate(index: number): void
  onClose(index: number): void
  onAdd(): void
}

/** The terminal's tab strip: one button per tab plus the add control. */
export function TerminalTabs({ tabs, active, canAdd, labels, onActivate, onClose, onAdd }: TerminalTabsProps): ReactNode {
  return h(Fragment, null,
    tabs.map((tab, i) => h('button', {
      key: i,
      type: 'button',
      className: 'sol-exp-term-tab' + (i === active ? ' active' : ''),
      title: labels.tab + ' ' + (i + 1) + ' — ' + tab.shell,
      onClick: () => onActivate(i),
    },
      h('span', {
        style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' },
      }, (tab.exited ? '✕ ' : '▸ ') + tab.title),
      h('button', {
        type: 'button',
        className: 'sol-exp-term-tab-close',
        title: labels.close,
        onClick: (e) => { e.stopPropagation(); onClose(i) },
      }, '×'),
    )),
    h('button', {
      type: 'button',
      className: 'sol-exp-term-add',
      title: labels.add,
      disabled: !canAdd,
      onClick: () => onAdd(),
    }, '+'),
  )
}
