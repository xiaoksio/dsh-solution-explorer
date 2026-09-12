/**
 * React shell for the embedded terminal.
 *
 * Renders the resize grip, the tab strip (via TerminalTabs) and an empty body
 * container. The body is deliberately childless: the controller appends the
 * xterm panes (and the exited notice) into it imperatively, which is the
 * standard React + xterm split — React owns the chrome, xterm owns its host.
 * @module dsh-solution-explorer/client/terminal-client/TerminalShell
 */
import { createElement as h, Fragment } from 'react'
import type { ReactNode } from 'react'
import { TerminalTabs } from './TerminalTabs.ts'
import type { TerminalTabInfo, TerminalTabsLabels } from './TerminalTabs.ts'

/** Props of the terminal shell. */
export interface TerminalShellProps {
  tabs: TerminalTabInfo[]
  active: number
  canAdd: boolean
  labels: TerminalTabsLabels
  onActivate(index: number): void
  onClose(index: number): void
  onAdd(): void
}

/** The terminal's chrome: resize grip + tab strip + the pane host. */
export function TerminalShell(props: TerminalShellProps): ReactNode {
  return h(Fragment, null,
    h('div', { className: 'sol-exp-term-resize' }),
    h('div', { className: 'sol-exp-term-tabs' }, h(TerminalTabs, props)),
    // Childless on purpose: the controller mounts xterm panes here.
    h('div', { className: 'sol-exp-term-body' }),
  )
}
