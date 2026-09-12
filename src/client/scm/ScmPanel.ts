/**
 * React SCM panel — the source-control tab of the unified React client render.
 *
 * Sections, item rows, the commit box, the repository block and the remote /
 * branch panels are React elements; events call `actions`;
 * glyphs come from the official @deepseek-ai/dsh-client-ui-primitives set (the
 * four git sync operations keep plain text glyphs — the official set has no
 * distinct fetch/pull/push/sync icons).
 *
 * The commits list is still produced by the graph builder as an HTML island and
 * migrates in the commits-graph block.
 * @module dsh-solution-explorer/client/scm/ScmPanel
 */
import { createElement as h, Fragment } from 'react'
import type { ReactNode } from 'react'
import {
  IconRefreshOutline16,
  IconBranchOutline16,
  IconPlusOutline16,
  IconTrashOutline16,
  IconCloseOutline16,
  IconFolderClose16,
  FileTypeIcon,
  IconChevronRightOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from '../locales.ts'
import { isPreviewOnlyFile } from '../explorer/file-kind.ts'
import { CommitsList } from './CommitsList.ts'
import type { ScmState, CommitState } from '../state/store.ts'

/** One change row as the git status payload reports it. */
export interface ScmChange {
  path: string
  status?: string
}

/** Every SCM interaction the SCM view can invoke. */
export interface ScmActions {
  toggleSection(id: string): void
  refresh(): void
  stage(paths: string[]): void
  unstage(paths: string[]): void
  discard(paths: string[]): void
  stageAll(): void
  unstageAll(): void
  discardAll(): void
  commitMsg(value: string): void
  commit(): void
  genCommitMsg(): void
  selectRepo(path: string): void
  remotePanel(): void
  branchPanel(): void
  fetch(): void
  pull(): void
  push(): void
  sync(): void
  remoteName(value: string): void
  remoteUrl(value: string): void
  remoteAdd(): void
  remoteRemove(name: string): void
  remoteSetUrl(name: string): void
  branchName(value: string): void
  branchFrom(value: string): void
  branchCreate(): void
  branchCheckout(name: string): void
  branchDelete(name: string): void
  branchRename(name: string): void
  branchMerge(name: string): void
  branchPublish(name: string): void
  gitInit(): void
  openDiff(path: string, staged: boolean): void
  openFile(path: string): void
  selectFile(path: string, isDir: boolean): void
  dividerDown(e: unknown): void
  commitsScroll(e: unknown): void
  commitDetail(hash: string): void
  commitCheckout(hash: string): void
}

/** Props of the SCM panel. */
export interface ScmPanelProps {
  scm: ScmState
  commits: CommitState
  root: string
  actions: ScmActions
}

function Section(props: {
  id: string
  title: string
  count?: ReactNode
  collapsed: boolean
  onToggle: () => void
  headerActions?: ReactNode
  children?: ReactNode
}): ReactNode {
  return h('div', { className: 'sol-exp-scm-section' + (props.collapsed ? ' collapsed' : ''), 'data-section': props.id },
    h('div', { className: 'sol-exp-scm-section-header', onClick: props.onToggle },
      h(IconChevronRightOutline14, { size: 14 }),
      props.title,
      h('span', { className: 'sol-exp-scm-header-actions' }, props.headerActions),
      h('span', { className: 'sol-exp-scm-section-count' }, props.count),
    ),
    props.children,
  )
}

function ScmItem({ item, section, actions }: { item: ScmChange; section: string; actions: ScmActions }): ReactNode {
  const staged = section === 'staged'
  const isDir = item.path.endsWith('/') || item.path.endsWith('\\')
  const open = () => {
    if (isDir) actions.selectFile(item.path, true)
    else if (isPreviewOnlyFile(item.path)) void actions.openFile(item.path)
    else void actions.openDiff(item.path, staged)
  }
  return h('div', { className: 'sol-exp-scm-item', title: t('file.open'), onClick: open },
    h('span', { className: 'sol-exp-file-icon' },
      isDir ? h(IconFolderClose16, { size: 16 }) : h(FileTypeIcon, { path: item.path, size: 16 })),
    h('span', { className: 'sol-exp-scm-path' }, item.path),
    h('span', { className: 'sol-exp-scm-actions' },
      staged
        ? h('button', {
            className: 'sol-exp-scm-action-btn', title: t('scm.unstage'),
            onClick: (e) => { e.stopPropagation(); actions.unstage([item.path]) },
          }, h(IconCloseOutline16, { size: 14 }))
        : h(Fragment, null,
            h('button', {
              className: 'sol-exp-scm-action-btn',
              title: section === 'conflicts' ? t('scm.merge.changes') : t('scm.stage'),
              onClick: (e) => { e.stopPropagation(); actions.stage([item.path]) },
            }, h(IconPlusOutline16, { size: 14 })),
            h('button', {
              className: 'sol-exp-scm-action-btn', title: t('scm.discard'),
              onClick: (e) => { e.stopPropagation(); actions.discard([item.path]) },
            }, h(IconTrashOutline16, { size: 14 })),
          ),
    ),
  )
}

/** The SCM panel: split view with the top (sections) and bottom (repository + commits). */
export function ScmPanel({ scm, commits, root, actions }: ScmPanelProps): ReactNode {
  if (!root) {
    return h('div', { className: 'sol-exp-content' }, h('div', { className: 'sol-exp-empty' }, t('panel.empty')))
  }

  const status = scm.gitStatus
  const isRepo = !!status && status.branch !== 'unknown'
  if (!isRepo) {
    return h('div', { className: 'sol-exp-content' },
      h('div', { className: 'sol-exp-empty' }, t('scm.notRepo')),
      h('div', { style: { padding: '12px', textAlign: 'center' } },
        h('button', {
          className: 'sol-exp-commit-btn', style: { width: 'auto', padding: '6px 16px' },
          onClick: () => actions.gitInit(),
        }, t('scm.init.button'))))
  }

  const staged = (status?.staged ?? []) as ScmChange[]
  const unstaged = (status?.unstaged ?? []) as ScmChange[]
  const untracked = (status?.untracked ?? []) as ScmChange[]
  const conflicts = (status?.conflicts ?? []) as ScmChange[]
  const allChanges = [...unstaged, ...untracked]
  const collapsed = (id: string) => scm.collapsedSections.has(id)

  const syncBtn = (glyph: string, title: string, fn: () => void): ReactNode =>
    h('button', {
      className: 'sol-exp-hdr-btn', title,
      onClick: (e) => { e.stopPropagation(); fn() },
    }, glyph)

  const top = h(Fragment, null,
    conflicts.length > 0
      ? h(Section, { id: 'conflicts', title: t('scm.merge.changes'), count: conflicts.length, collapsed: collapsed('conflicts'), onToggle: () => actions.toggleSection('conflicts') },
          conflicts.map((item) => h(ScmItem, { key: item.path, item, section: 'conflicts', actions })))
      : null,

    h('div', { className: 'sol-exp-commit-box' },
      h('textarea', {
        className: 'sol-exp-commit-input',
        placeholder: t('scm.commit.placeholder') + (status?.branch && status.branch !== 'unknown' ? ' (' + status.branch + ')' : ''),
        value: scm.commitMessage,
        onChange: (e) => actions.commitMsg(e.target.value),
      }),
      h('div', { className: 'sol-exp-commit-row' },
        h('button', {
          className: 'sol-exp-commit-btn',
          disabled: scm.committing || !scm.commitMessage.trim(),
          onClick: () => actions.commit(),
        }, scm.committing ? t('scm.committing') : t('scm.commit.button')),
        h('button', {
          className: 'sol-exp-ai-btn', title: t('scm.ai.gen'),
          disabled: scm.aiGenerating || !(staged.length > 0),
          onClick: () => actions.genCommitMsg(),
        }, '✦'),
      ),
    ),

    h(Section, {
      id: 'changes', title: t('scm.changes'), count: allChanges.length,
      collapsed: collapsed('changes'), onToggle: () => actions.toggleSection('changes'),
      headerActions: h(Fragment, null,
        h('button', { className: 'sol-exp-hdr-btn', title: t('scm.refresh'), onClick: (e) => { e.stopPropagation(); actions.refresh() } },
          h(IconRefreshOutline16, { size: 14 })),
        allChanges.length > 0
          ? h('button', { className: 'sol-exp-hdr-btn', title: t('scm.stageAll'), onClick: (e) => { e.stopPropagation(); actions.stageAll() } },
              h(IconPlusOutline16, { size: 14 }))
          : null,
        allChanges.length > 0
          ? h('button', { className: 'sol-exp-hdr-btn danger', title: t('scm.discardAll'), onClick: (e) => { e.stopPropagation(); actions.discardAll() } },
              h(IconTrashOutline16, { size: 14 }))
          : null),
    },
      allChanges.length === 0
        ? h('div', { style: { padding: '4px 12px 8px 24px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' } }, t('scm.changes.none'))
        : null,
      allChanges.map((item) => h(ScmItem, { key: item.path, item, section: 'changes', actions })),
    ),

    staged.length > 0
      ? h(Section, {
          id: 'staged', title: t('scm.staged'), count: staged.length,
          collapsed: collapsed('staged'), onToggle: () => actions.toggleSection('staged'),
          headerActions: h('button', { className: 'sol-exp-hdr-btn', title: t('scm.unstageAll'), onClick: (e) => { e.stopPropagation(); actions.unstageAll() } },
            h(IconCloseOutline16, { size: 14 })),
        },
          staged.map((item) => h(ScmItem, { key: item.path, item, section: 'staged', actions })))
      : null,
  )

  const repoRow = (r: { path: string; name: string; branch: string }): ReactNode =>
    h('div', {
      key: r.path,
      className: 'sol-exp-repo-item' + (scm.activeRepo === r.path ? ' active' : ''),
      'data-repo-path': r.path,
      onClick: () => actions.selectRepo(r.path),
    },
      h('span', { className: 'sol-exp-repo-icon' }, h(IconBranchOutline16, { size: 14 })),
      h('span', { className: 'sol-exp-repo-name' }, r.name),
      h('span', { className: 'sol-exp-repo-branch' }, r.branch),
      h('span', { className: 'sol-exp-hdr-btn', title: t('scm.remote.title'), onClick: (e) => { e.stopPropagation(); actions.remotePanel() } }, '⇅'),
      h('span', { className: 'sol-exp-hdr-btn', title: t('scm.branch.title'), onClick: (e) => { e.stopPropagation(); actions.branchPanel() } },
        h(IconBranchOutline16, { size: 12 })),
    )

  const remotePanel = scm.remotePanelOpen
    ? h('div', { style: { margin: '6px 0', padding: '8px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '6px', fontSize: '12px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
          h('b', null, t('scm.remote.title')), h('span', { style: { flex: 1 } }),
          h('button', { className: 'sol-exp-commit-detail-close', onClick: () => actions.remotePanel() }, '✕')),
        scm.remotesList.length === 0
          ? h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', padding: '2px 0 6px' } }, t('scm.remote.none'))
          : scm.remotesList.map((r: { name: string; url: string }) => h('div', { key: r.name, style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' } },
              h('span', { style: { flex: 'none', fontWeight: 600 } }, r.name),
              h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--dsw-alias-label-secondary)' } }, r.url),
              h('button', { className: 'sol-exp-commit-detail-btn', onClick: () => actions.remoteSetUrl(r.name) }, t('scm.remote.setUrl')),
              h('button', { className: 'sol-exp-commit-detail-btn', onClick: () => actions.remoteRemove(r.name) }, t('scm.remote.remove')),
            )),
        h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
          h('input', {
            className: 'sol-exp-commit-input', style: { minHeight: 0, height: '26px', flex: 1 },
            placeholder: t('scm.remote.name'), value: scm.remoteName,
            onChange: (e) => actions.remoteName(e.target.value),
          }),
          h('input', {
            className: 'sol-exp-commit-input', style: { minHeight: 0, height: '26px', flex: 2 },
            placeholder: t('scm.remote.url'), value: scm.remoteUrl,
            onChange: (e) => actions.remoteUrl(e.target.value),
          }),
          h('button', { className: 'sol-exp-commit-detail-btn', onClick: () => actions.remoteAdd() }, t('scm.remote.addBtn')),
        ))
    : null

  const branchPanel = scm.branchPanelOpen
    ? h('div', { style: { margin: '6px 0', padding: '8px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '6px', fontSize: '12px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
          h('b', null, t('scm.branch.title')), h('span', { style: { flex: 1 } }),
          h('button', { className: 'sol-exp-commit-detail-close', onClick: () => actions.branchPanel() }, '✕')),
        h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', margin: '2px 0' } }, t('scm.branch.local')),
        scm.branchesList.filter((b: { isRemote?: boolean }) => !b.isRemote).map((b: { name: string; current?: boolean; shortHash?: string; subject?: string; upstream?: string }) =>
          h('div', { key: b.name, style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', cursor: 'pointer' }, onClick: () => actions.branchCheckout(b.name) },
            h('span', { style: { flex: 'none', width: '14px' } }, b.current ? '➤' : ''),
            h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.name),
            b.shortHash ? h('span', { style: { flex: 'none', fontSize: '10px', color: 'var(--dsw-alias-label-tertiary)' } }, b.shortHash) : null,
            h('button', { className: 'sol-exp-commit-detail-btn', style: { padding: '1px 5px' }, title: t('scm.branch.rename'), onClick: (e) => { e.stopPropagation(); actions.branchRename(b.name) } }, '✎'),
            !b.current
              ? h(Fragment, null,
                  h('button', { className: 'sol-exp-commit-detail-btn', style: { padding: '1px 5px' }, title: t('scm.branch.merge'), onClick: (e) => { e.stopPropagation(); actions.branchMerge(b.name) } }, '⤵'),
                  h('button', { className: 'sol-exp-commit-detail-btn', style: { padding: '1px 5px' }, title: t('scm.branch.publish'), onClick: (e) => { e.stopPropagation(); actions.branchPublish(b.name) } }, '↑'),
                  h('button', { className: 'sol-exp-commit-detail-btn', style: { padding: '1px 5px' }, onClick: (e) => { e.stopPropagation(); actions.branchDelete(b.name) } }, '✕'))
              : null,
          )),
        h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
          h('input', {
            className: 'sol-exp-commit-input', style: { minHeight: 0, height: '26px', flex: 1 },
            placeholder: t('scm.branch.name'), value: scm.branchName,
            onChange: (e) => actions.branchName(e.target.value),
          }),
          h('button', { className: 'sol-exp-commit-detail-btn', onClick: () => actions.branchCreate() }, t('scm.branch.create')),
        ))
    : null

  const bottom = h(Fragment, null,
    h(Section, {
      id: 'repository', title: t('scm.repository'),
      count: (status?.ahead || 0) > 0 || (status?.behind || 0) > 0 ? `↑${status?.ahead || 0} ↓${status?.behind || 0}` : '',
      collapsed: collapsed('repository'), onToggle: () => actions.toggleSection('repository'),
      headerActions: h(Fragment, null,
        syncBtn('↓', t('scm.sync.fetch'), actions.fetch),
        syncBtn('⇣', t('scm.sync.pull'), actions.pull),
        syncBtn('↑', t('scm.sync.push'), actions.push),
        syncBtn('⟳', t('scm.sync.sync'), actions.sync)),
    },
      h('div', { style: { padding: '4px 12px 8px 24px', display: 'flex', flexDirection: 'column' } },
        scm.repos.map(repoRow),
        h('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginBottom: '6px' } }, t('scm.repository.branch')),
        h('span', { className: 'sol-exp-branch-pill' }, '⑂ ' + (status?.branch || '')),
        remotePanel,
        branchPanel,
      )),

    h(Section, {
      id: 'commits', title: t('scm.repository.commits'),
      collapsed: collapsed('commits'), onToggle: () => actions.toggleSection('commits'),
    },
      h('div', { style: { padding: '4px 12px 8px 24px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } },
        h(CommitsList, {
          commits,
          actions: {
            commitDetail: (hash) => actions.commitDetail(hash),
            commitCheckout: (hash) => actions.commitCheckout(hash),
            commitsScroll: (e) => actions.commitsScroll(e),
          },
        }))),
  )

  return h('div', { className: 'sol-exp-content' },
    h('div', { className: 'sol-exp-scm-split' },
      h('div', { className: 'sol-exp-scm-top', style: { flexBasis: scm.scmSplit + '%' } }, top),
      h('div', { className: 'sol-exp-scm-divider', onPointerDown: (e) => actions.dividerDown(e) }),
      h('div', { className: 'sol-exp-scm-bottom', style: { flexBasis: (100 - scm.scmSplit) + '%' } }, bottom),
    ))
}
