/**
 * React file-tree panel.
 *
 * Rows render through React components (never innerHTML), events call the
 * caller-supplied `actions`, and every glyph is an official
 * @deepseek-ai/dsh-client-ui-primitives icon.
 * @module dsh-solution-explorer/client/explorer/TreePanel
 */
import { createElement as h, Fragment } from 'react'
import type { ReactNode } from 'react'
import {
  FileTypeIcon,
  IconFolderOpen16,
  IconFolderClose16,
  IconRefreshOutline16,
  IconChevronDownOutline14,
  IconChevronUpOutline14,
  IconPlusOutline16,
  IconProjectAddOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from '../locales.ts'
import { gitStatusClass } from './file-kind.ts'
import type { TreeState, ClipboardState } from '../state/store.ts'

/** One node as the /tree route returns it. */
export interface TreeNodeData {
  name: string
  path: string
  type: 'directory' | 'file' | string
  gitStatus?: string | null
  children?: TreeNodeData[]
}

/** Every tree interaction the tree view can invoke. */
export interface TreeActions {
  select(path: string, shift: boolean, ctrl: boolean, isDir: boolean): void
  openFile(path: string): void
  contextMenu(path: string, x: number, y: number, isDir: boolean): void
  expandAll(): void
  collapseAll(): void
  newFile(): void
  newDir(): void
  refresh(): void
  renameCommit(value: string): void
  renameCancel(): void
  /** Commit / cancel the inline "new file / new folder" row. */
  createCommit(value: string): void
  createCancel(): void
  dragStart(path: string): void
  dragOver(path: string): void
  drop(path: string, e: { preventDefault(): void; stopPropagation(): void }): void
}

/** Props of the tree panel. */
export interface TreePanelProps {
  root: string
  tree: TreeState
  clipboard: ClipboardState
  actions: TreeActions
}

/**
 * The inline "new file / new folder" row (Explorer style): a normal tree row
 * whose name is an input, rendered as the first child of the target directory.
 */
function CreateRow({ type, depth, actions }: {
  type: 'file' | 'dir'
  depth: number
  actions: TreeActions
}): ReactNode {
  const isDir = type === 'dir'
  return h('div', { className: 'sol-exp-tree-node-wrapper' },
    h('div', {
      className: 'sol-exp-tree-node sol-exp-creating',
      style: { paddingLeft: 12 + depth * 16 },
      onClick: (e) => e.stopPropagation(),
    },
      h('span', { className: 'sol-exp-file-icon' },
        isDir ? h(IconFolderClose16, { size: 16 }) : h(FileTypeIcon, { path: '', size: 16 })),
      h('input', {
        className: 'sol-exp-rename-input',
        placeholder: isDir ? t('tree.newDirName') : t('tree.newFileName'),
        autoFocus: true,
        onClick: (e) => e.stopPropagation(),
        onKeyDown: (e) => {
          if (e.key === 'Enter') actions.createCommit(e.currentTarget.value)
          else if (e.key === 'Escape') actions.createCancel()
        },
        onBlur: (e) => actions.createCommit(e.currentTarget.value),
      }),
    ),
  )
}

/** One row plus its expanded children. */
function TreeNode({ node, depth, tree, clipboard, actions }: {
  node: TreeNodeData
  depth: number
  tree: TreeState
  clipboard: ClipboardState
  actions: TreeActions
}): ReactNode {
  const isDir = node.type === 'directory'
  const isExpanded = tree.expandedPaths.has(node.path)
  const isSelected = tree.selectedPaths.has(node.path)
  const isCut = clipboard.clipboard?.mode === 'cut' && clipboard.clipboard.paths.includes(node.path)
  const isDropTarget = isDir && clipboard.dropTargetPath === node.path && clipboard.dragPaths.length > 0

  const rowClass = [
    'sol-exp-tree-node',
    isSelected ? 'sol-exp-selected' : '',
    isCut ? 'sol-exp-cut' : '',
    isDropTarget ? 'sol-exp-drop-target' : '',
  ].filter(Boolean).join(' ')

  const gitCls = node.gitStatus ? gitStatusClass(node.gitStatus) : ''

  const icon = isDir
    ? h(isExpanded ? IconFolderOpen16 : IconFolderClose16, { size: 16 })
    : h(FileTypeIcon, { path: node.path, size: 16 })

  return h('div', { className: 'sol-exp-tree-node-wrapper' },
    h('div', {
      className: rowClass,
      style: { paddingLeft: 12 + depth * 16 },
      draggable: true,
      'data-sol-exp-path': node.path,
      'data-sol-exp-isdir': isDir ? '1' : '0',
      onClick: (e) => actions.select(node.path, e.shiftKey, e.ctrlKey || e.metaKey, isDir),
      // Files open on double click (single click only selects, as before);
      // directories keep toggling through the single-click select above.
      onDoubleClick: isDir ? undefined : () => actions.openFile(node.path),
      onContextMenu: (e) => {
        e.preventDefault()
        e.stopPropagation()
        actions.contextMenu(node.path, e.pageX, e.pageY, isDir)
      },
      onDragStart: () => actions.dragStart(node.path),
      onDragOver: isDir
        ? (e) => { e.preventDefault(); e.stopPropagation(); actions.dragOver(node.path) }
        : undefined,
      onDrop: isDir
        ? (e) => actions.drop(node.path, e)
        : undefined,
    },
      h('span', { className: 'sol-exp-file-icon' }, icon),
      node.path === tree.renamingPath
        ? h('input', {
            className: 'sol-exp-rename-input',
            defaultValue: node.name,
            autoFocus: true,
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => {
              if (e.key === 'Enter') actions.renameCommit(e.currentTarget.value)
              else if (e.key === 'Escape') actions.renameCancel()
            },
            onBlur: (e) => actions.renameCommit(e.currentTarget.value),
          })
        : h('span', { className: 'sol-exp-file-name' + (gitCls ? ' sol-exp-git-' + gitCls : '') }, node.name),
      node.gitStatus ? h('span', { className: 'sol-exp-git-letter sol-exp-git-' + gitCls }, node.gitStatus) : null,
    ),
    isDir && isExpanded
      ? h('div', { className: 'sol-exp-tree-children' },
          tree.creating && tree.creating.dir === node.path
            ? h(CreateRow, { type: tree.creating.type, depth: depth + 1, actions })
            : null,
          (node.children ?? []).map(child => h(TreeNode, {
            key: child.path, node: child, depth: depth + 1, tree, clipboard, actions,
          })))
      : null,
  )
}

/** The explorer tree panel: header (title + toolbar) and content. */
export function TreePanel({ root, tree, clipboard, actions }: TreePanelProps): ReactNode {
  const title = root ? (root.split(/[\\/]/).pop() || root) : ''

  let content: ReactNode
  if (tree.loading) content = h('div', { className: 'sol-exp-loading' }, t('loading'))
  else if (tree.error) content = h('div', { className: 'sol-exp-error' }, String(tree.error))
  else if (tree.treeState) {
    content = h('div', {
      className: 'sol-exp-tree',
      onContextMenu: (e) => {
        e.preventDefault()
        e.stopPropagation()
        actions.contextMenu('', e.pageX, e.pageY, false)
      },
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => actions.drop('', e),
    },
      tree.creating && tree.creating.dir === ''
        ? h(CreateRow, { type: tree.creating.type, depth: 0, actions })
        : null,
      (tree.treeState.children ?? []).map((child: TreeNodeData) => h(TreeNode, {
        key: child.path, node: child, depth: 0, tree, clipboard, actions,
      })))
  } else content = h('div', { className: 'sol-exp-empty' }, t('panel.empty'))

  const tool = (label: string, icon: ReactNode, onClick: () => void): ReactNode =>
    h('button', { className: 'sol-exp-toolbar-btn', title: label, onClick }, icon)

  return h(Fragment, null,
    h('div', { className: 'sol-exp-header' },
      h('span', { className: 'sol-exp-title' }, title),
      h('div', { className: 'sol-exp-header-actions' },
        tool(t('tree.expand'), h(IconChevronDownOutline14, { size: 14 }), actions.expandAll),
        tool(t('tree.collapse'), h(IconChevronUpOutline14, { size: 14 }), actions.collapseAll),
        tool(t('tree.newFile'), h(IconPlusOutline16, { size: 16 }), actions.newFile),
        tool(t('tree.newDir'), h(IconProjectAddOutline16, { size: 16 }), actions.newDir),
        tool(t('tree.refresh'), h(IconRefreshOutline16, { size: 16 }), actions.refresh),
      ),
    ),
    h('div', { className: 'sol-exp-content' }, content),
  )
}
