/**

 * dsh-solution-explorer — browser half: registers a dual-panel (Explorer + SCM)

 * component into the "details" slot of the web shell's three-column layout.

 * @module dsh-solution-explorer/client

 */



import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'

import type {} from '@deepseek-ai/dsh-client-ui-slots'

import type {} from '@deepseek-ai/dsh-client-locale/client'

import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

import { NS, dictionaries, t, type SolutionExplorerKey } from './locales.ts'

import { XTERM_CSS } from './xterm-css.ts'

import { STYLES } from './styles.ts'

import { EditorView } from './editor/editor-view.ts'

import { SettingsPage } from './settings/settings-page.ts'

import { mountPanel } from './panel.ts'



declare module '@deepseek-ai/dsh-client-ui-slots' {

  interface LocaleNamespaceMap {

    'solution-explorer': SolutionExplorerKey

  }

  interface SlotMap {
    'settings.section': {
      kind: 'list'
      scope: 'root'
      owner: { close: () => void }
    }
  }

}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {

  interface ViewTab {

    id: string

  }

}



declare global {

  interface Window {

    __solExpTab?: (tab: string) => void

    __solExpToggleExpand?: (path: string) => void

    __solExpSelectFile?: (path: string, isDir?: boolean) => Promise<void>

    __solExpCollapseAll?: () => void

    __solExpExpandAll?: () => void

    __solExpRefresh?: () => void

    __solExpSearch?: (query: string) => void

    __solExpRefreshSCM?: () => void
    __solExpCommitsScroll?: (evt: Event) => void
    __solExpScmDividerDown?: (evt: PointerEvent) => void
    __solExpSelectRepo?: (path: string) => void
    __solExpCommitDetail?: (hash: string) => Promise<void>
    __solExpCommitCheckout?: (hash: string) => Promise<void>
    __solExpGitInit?: () => Promise<void>
    __solExpFetch?: () => Promise<void>
    __solExpPull?: () => Promise<void>
    __solExpPush?: () => Promise<void>
    __solExpSync?: () => Promise<void>
    __solExpRemotePanel?: () => Promise<void>
    __solExpRemoteName?: (v: string) => void
    __solExpRemoteUrl?: (v: string) => void
    __solExpRemoteAdd?: () => Promise<void>
    __solExpRemoteRemove?: (name: string) => Promise<void>
    __solExpRemoteSetUrl?: (name: string) => Promise<void>
    __solExpBranchPanel?: () => Promise<void>
    __solExpBranchName?: (v: string) => void
    __solExpBranchFrom?: (v: string) => void
    __solExpBranchCreate?: () => Promise<void>
    __solExpBranchCheckout?: (name: string, isRemote?: boolean) => Promise<void>
    __solExpBranchDelete?: (name: string) => Promise<void>
    __solExpBranchRename?: (name: string) => Promise<void>
    __solExpBranchMerge?: (name: string) => Promise<void>
    __solExpBranchPublish?: (name: string) => Promise<void>

    __solExpCommitMsg?: (msg: string) => void

    __solExpCommit?: () => void

    __solExpStage?: (files: string[]) => void

    __solExpUnstage?: (files: string[]) => void

    __solExpDiscard?: (files: string[]) => void

    __solExpStageAll?: () => void

    __solExpUnstageAll?: () => void

    __solExpDiscardAll?: () => void

    __solExpToggleSection?: (id: string) => void

    __solExpTogglePanel?: () => void

    __solExpToggleTerminal?: () => void

    __solExpRailOpen?: (tab: string) => void

    __solExpOpenFile?: (path: string) => Promise<void>

    __solExpSaveFile?: () => Promise<void>

    __solExpGetEditorState?: () => { editorFile: string | null; editorContent: string | null; editorLoading: boolean; editorError: string | null; editorSaving: boolean; editorUnsupported: boolean; editorImage: boolean; editorRoot: string }

    __solExpEditorListeners?: Set<() => void>

    __solExpOpenDiff?: (path: string, staged: boolean) => Promise<void>

    __solExpGetDiffState?: () => { diffPath: string | null; diffStaged: boolean; diffContent: string | null; diffOldContent: string; diffNewContent: string; diffLoading: boolean; diffUnsupported: boolean; diffRoot: string }

    __solExpDiffListeners?: Set<() => void>

    __solExpSelect?: (path: string, shift: boolean, ctrl: boolean, isDir: boolean) => void

    __solExpClearSelection?: () => void

    __solExpCopy?: () => void

    __solExpCut?: () => void

    __solExpPaste?: (target: string) => Promise<void>

    __solExpNew?: (type: 'file' | 'dir', dir: string) => Promise<void>

    __solExpOpenNative?: (path: string, action: 'reveal' | 'open' | 'openas' | 'properties') => Promise<void>

    __solExpDragStart?: (path: string) => void

    __solExpDragOver?: (path: string, evt: DragEvent) => void

    __solExpDrop?: (path: string, evt: DragEvent) => Promise<void>

    __solExpDropFiles?: (target: string, files: FileList | File[]) => Promise<void>

    __solExpDeletePaths?: (paths: string[]) => Promise<void>

    __solExpPanelContextMenu?: (evt: MouseEvent) => void

    __solExpContextMenu?: (target: string, x: number, y: number, isDir?: boolean) => void
    __solExpRename?: (path: string) => void
    __solExpRenameCommit?: (name: string) => void
    __solExpRenameCancel?: () => void

    __solExpDeleteFile?: (target: string) => Promise<void>

    __solExpClearSearch?: () => void

  }

}

				export const inject = [

			"locale",

			"sessions",

			"slots"

		];

		function apply(ctx: ClientContext) {

			ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-solution-explorer: dictionaries");

			ctx.effect(() => {

				const styleId = "dsh-solution-explorer-styles";

				if (document.getElementById(styleId)) return () => {};

				const style = document.createElement("style");

				style.id = styleId;

				style.textContent = STYLES + "\n" + XTERM_CSS;

				document.head.appendChild(style);

				return () => {

					style.remove();

				};

			}, "dsh-solution-explorer: styles");

			mountPanel(ctx);

			ctx.effect(() => {

				const t = ctx.locale.bind(NS);

				ctx.slots.inject("conversation.view", () => ctx.slots.register({

					name: "conversation.view",

					id: "solution-explorer-editor",

					order: 20,

					locale: NS,

					label: () => t("panel.editor"),

					inject: (sessionId: SessionId) => ({ getRoot: () => {

						return ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd ?? "";

					} })

				}, EditorView));

				return () => {};

			}, "dsh-solution-explorer: editor view");

			ctx.effect(() => {

				ctx.slots.inject("settings.section", () => ctx.slots.register({

					name: "settings.section",

					id: "explorer",

					order: 30,

					label: () => t("settings.explorer"),

				}, SettingsPage));

				return () => {};

			}, "dsh-solution-explorer: settings page");

		}

export { apply }
