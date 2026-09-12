/**
 * React commits list — the "recent commits" list with its graph column.
 *
 * Rows are React elements, the graph is drawn with React SVG elements from the
 * pure {@link planGraph} plan, and the inline commit detail renders from the
 * detail cache (no imperative DOM insertion).
 * @module dsh-solution-explorer/client/scm/CommitsList
 */
import { createElement as h, Fragment } from 'react'
import type { ReactNode } from 'react'
import { FileTypeIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from '../locales.ts'
import { relTime } from '../shared/dom.ts'
import { gitStatusClass } from '../explorer/file-kind.ts'
import { planGraph, type GraphRowDraw } from './graph.ts'
import type { CommitState } from '../state/store.ts'

const ROW_H = 20
const NODE_R = 3

/** Actions the commits list needs. */
export interface CommitsActions {
  commitDetail(hash: string): void
  commitCheckout(hash: string): void
  commitsScroll(e: unknown): void
}

/** Props of the commits list. */
export interface CommitsListProps {
  commits: CommitState
  actions: CommitsActions
}

/** One row's graph column, drawn as React SVG elements. */
function GraphSvg({ draw }: { draw: GraphRowDraw }): ReactNode {
  const children: ReactNode[] = []
  draw.transitions.forEach((tr, i) => {
    children.push(h('path', {
      key: 't' + i,
      d: `M ${tr.x1} 0 C ${tr.x1} ${ROW_H / 2}, ${tr.x2} ${ROW_H / 2}, ${tr.x2} ${ROW_H}`,
      fill: 'none', stroke: tr.color, strokeWidth: 2, opacity: 0.7,
    }))
  })
  draw.lanes.forEach((lane, i) => {
    if (!lane.node) {
      children.push(h('line', { key: 'l' + i, x1: lane.x, y1: 0, x2: lane.x, y2: ROW_H, stroke: lane.color, strokeWidth: 2, opacity: 0.55 }))
      return
    }
    children.push(h('line', { key: 'u' + i, x1: lane.x, y1: 0, x2: lane.x, y2: ROW_H / 2 - NODE_R, stroke: lane.color, strokeWidth: 2 }))
    children.push(lane.unpushed
      ? h('circle', { key: 'c' + i, cx: lane.x, cy: ROW_H / 2, r: NODE_R + 1, fill: 'none', stroke: 'var(--dsw-alias-label-primary)', strokeWidth: 2.5 })
      : h('circle', { key: 'c' + i, cx: lane.x, cy: ROW_H / 2, r: NODE_R, fill: lane.color }))
    if (lane.hasParent) {
      children.push(h('line', { key: 'd' + i, x1: lane.x, y1: ROW_H / 2 + NODE_R, x2: lane.x, y2: ROW_H, stroke: lane.color, strokeWidth: 2 }))
    }
    lane.forks.forEach((f, fi) => {
      children.push(h('line', { key: 'f' + i + '-' + fi, x1: lane.x, y1: ROW_H / 2 + NODE_R, x2: f.x, y2: ROW_H, stroke: f.color, strokeWidth: 2 }))
    })
  })
  return h('svg', { className: 'sol-exp-graph-svg', width: draw.width, height: ROW_H }, children)
}

/** The expanded file list + checkout action under a selected commit row. */
function CommitDetailInline({ detail, hash, actions }: {
  detail: { files?: Array<{ path: string; status: string; oldPath?: string }> } | undefined
  hash: string
  actions: CommitsActions
}): ReactNode {
  if (detail === undefined) {
    return h('div', { className: 'sol-exp-commit-detail-inline', 'data-hash': hash },
      h('div', { style: { padding: '2px 0', color: 'var(--dsw-alias-label-tertiary)' } }, t('loading')))
  }
  const files = (detail.files ?? []).slice(0, 200)
  return h('div', { className: 'sol-exp-commit-detail-inline', 'data-hash': hash },
    files.length === 0
      ? h('div', { className: 'sol-exp-commit-file-row', style: { color: 'var(--dsw-alias-label-tertiary)' } }, t('scm.log.empty'))
      : files.map((f, i) => h('div', {
          key: i,
          className: 'sol-exp-commit-file-row',
          title: f.oldPath ? `${f.oldPath} → ${f.path}` : f.path,
        },
          h('span', { className: 'sol-exp-commit-file-icon' }, h(FileTypeIcon, { path: f.path, size: 14 })),
          h('span', { className: 'sol-exp-commit-file-path' }, f.oldPath ? `${f.oldPath} → ${f.path}` : f.path),
          h('span', { className: 'sol-exp-commit-file-status sol-exp-git-' + gitStatusClass(f.status) }, f.status),
        )),
    h('div', { className: 'sol-exp-commit-detail-footer' },
      h('button', { className: 'sol-exp-commit-detail-btn', onClick: () => actions.commitCheckout(hash) }, 'Checkout')),
  )
}

/** The commits list body (loading / empty / rows with graph). */
export function CommitsList({ commits, actions }: CommitsListProps): ReactNode {
  const listStyle = {
    marginTop: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)',
    flex: 1, minHeight: 0, overflowY: 'auto',
  } as const
  const onScroll = (e: unknown): void => actions.commitsScroll(e)

  if (commits.rows === null) {
    return h('div', { id: 'sol-exp-commits-list', style: listStyle, onScroll }, t('loading'))
  }
  if (commits.rows.length === 0) {
    return h('div', { id: 'sol-exp-commits-list', style: listStyle, onScroll }, t('scm.log.empty'))
  }

  const plans = planGraph(commits.rows)
  return h('div', { id: 'sol-exp-commits-list', style: listStyle, onScroll },
    commits.rows.map((c, i) => {
      const selected = commits.graphDetailOpen === c.hash
      const detail = selected ? commits.commitDetailCache.get(c.hash) : undefined
      return h(Fragment, { key: c.hash },
        h('div', {
          className: 'sol-exp-commit-item' + (selected ? ' selected' : ''),
          'data-hash': c.hash,
          onClick: () => actions.commitDetail(c.hash),
        },
          h('span', { className: 'sol-exp-graph' }, h(GraphSvg, { draw: plans[i] })),
          h('span', { className: 'sol-exp-commit-hash' }, c.shortHash),
          h('span', { className: 'sol-exp-commit-msg' }, c.message.substring(0, 60) + (c.message.length > 60 ? '...' : '')),
          h('span', { className: 'sol-exp-commit-date' }, relTime(c.timestamp)),
        ),
        selected ? h(CommitDetailInline, { detail, hash: c.hash, actions }) : null,
      )
    }))
}
