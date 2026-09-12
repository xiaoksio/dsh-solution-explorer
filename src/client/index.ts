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
