/**
 * React commit tooltip — the hover card shown above a commit row.
 *
 * Rendered through a React root on the tooltip element the controller creates,
 * so the card is React elements instead of an HTML string.
 * @module dsh-solution-explorer/client/scm/CommitTooltip
 */
import { createElement as h, Fragment } from 'react'
import type { ReactNode } from 'react'

/** Content of one commit tooltip. */
export interface CommitTooltipData {
  body: string
  statsText: string
  meta: string
  shortHash: string
  /** GitHub commit URL, or '' when no github remote is configured. */
  link: string
}

/** Props of the commit tooltip. */
export interface CommitTooltipProps {
  loading: boolean
  data: CommitTooltipData | null
  loadingText: string
  linkText: string
}

/** The commit hover card: message, stats, author line, and the GitHub link. */
export function CommitTooltip({ loading, data, loadingText, linkText }: CommitTooltipProps): ReactNode {
  if (loading || data === null) {
    return h('div', { style: { color: 'var(--dsw-alias-label-secondary)' } }, loadingText)
  }
  return h(Fragment, null,
    h('div', { className: 'sol-exp-commit-tip-msg' }, data.body),
    data.statsText ? h('div', { className: 'sol-exp-commit-tip-stats' }, data.statsText) : null,
    h('div', { className: 'sol-exp-commit-tip-meta' }, data.meta),
    h('div', { className: 'sol-exp-commit-tip-hash' },
      h('span', { className: 'sol-exp-commit-hash' }, data.shortHash),
      data.link
        ? h('a', { className: 'sol-exp-commit-tip-link', href: data.link, target: '_blank', rel: 'noreferrer' }, '↗ ' + linkText)
        : null),
  )
}
