/**
 * Editor info row — the row under the tab strip: the active file's full path on
 * the left, and its save state, image zoom controls and kind on the right
 * (matching the official file preview layout). The tab strip itself stays
 * tabs-only.
 * @module dsh-solution-explorer/client/editor/EditorInfoBar
 */
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import { t } from '../locales.ts'
import type { SolutionExplorerKey } from '../locales.ts'

/** Save state of the active file, shown in the info row. */
export type EditorTabStatus = 'saving' | 'dirty' | 'saved'

/** Image-preview zoom controls, shown in the info row for images. */
export interface EditorZoomControls {
  percent: number
  onIn(): void
  onOut(): void
  onReset(): void
}

/** What the active tab holds; drives the right-hand label. */
export type EditorKind = 'image' | 'code' | 'text' | 'diff'

/** Kind → locale key (spelled out so `t` keeps its key checking). */
const KIND_KEY: Record<EditorKind, SolutionExplorerKey> = {
  image: 'editor.kind.image',
  code: 'editor.kind.code',
  text: 'editor.kind.text',
  diff: 'editor.kind.diff',
}

export interface EditorInfoBarProps {
  path: string
  kind: EditorKind
  status?: EditorTabStatus | null
  zoom?: EditorZoomControls | null
}

/** Full path (left) plus the active tab's state controls (right). */
export function EditorInfoBar({ path, kind, status, zoom }: EditorInfoBarProps): ReactNode {
  return h('div', { className: 'sol-exp-einfo' },
    h('span', { className: 'sol-exp-einfo-path', title: path }, path),
    h('span', { className: 'sol-exp-einfo-right' },
      zoom
        ? h('span', { className: 'sol-exp-einfo-zoom' },
            h('button', { type: 'button', className: 'sol-exp-editor-btn', title: t('editor.zoomOut'), onClick: () => zoom.onOut() }, '−'),
            h('button', { type: 'button', className: 'sol-exp-editor-btn', title: t('editor.zoomIn'), onClick: () => zoom.onIn() }, '+'),
            h('button', { type: 'button', className: 'sol-exp-editor-btn', title: t('editor.zoomReset'), onClick: () => zoom.onReset() }, '1:1'),
            h('span', { className: 'sol-exp-einfo-zoom-value' }, zoom.percent + '%'),
          )
        : null,
      status
        ? h('span', {
            className: 'sol-exp-einfo-status ' + status,
            title: t('editor.saveHint'),
          }, status === 'saving' ? t('editor.saving') : status === 'dirty' ? t('editor.unsaved') : t('editor.saved'))
        : null,
      h('span', { className: 'sol-exp-einfo-kind' }, t(KIND_KEY[kind])),
    ),
  )
}
