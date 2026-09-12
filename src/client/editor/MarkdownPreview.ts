/**
 * Rendered Markdown for a preview tab — editor domain.
 *
 * The document renderer is the official primitive the conversation already uses
 * for assistant prose, so a previewed file and a chat reply are the same
 * pipeline: GFM with KaTeX, raw HTML disabled, no HTML parser in the path.
 * @module dsh-solution-explorer/client/editor/MarkdownPreview
 */

import { createElement as h, useMemo, type ReactNode } from "react";

import { MarkdownText, type MarkdownLabels } from "@deepseek-ai/dsh-client-ui-primitives";

import { t } from "../locales.ts";

/**
 * Draw one document.
 * @param props - the file's loaded text.
 * @returns the rendered document inside its own scrollport.
 */
export function MarkdownPreview({ text, revision }: { readonly text: string; readonly revision: string }): ReactNode {
  // The labels are chrome the renderer copies into fences and footnotes; a new
  // identity re-parses the document, so it is keyed to the language revision.
  const labels = useMemo<MarkdownLabels>(() => ({
    code: { copyLabel: t("editor.md.copy"), copiedLabel: t("editor.md.copied") },
    footnotes: t("editor.md.footnotes"),
  }), [revision]);
  return h("div", { className: "sol-exp-mdview" }, h(MarkdownText, { text, labels }));
}
