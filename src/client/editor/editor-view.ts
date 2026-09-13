import { createElement as h, useCallback, useEffect, useRef, useState } from "react"

import { IconEditOutline16 } from "@deepseek-ai/dsh-client-ui-primitives"

import { t } from "../locales.ts"

import { langFromPath, highlightToHtml, highlightLinesHtml } from "../highlight.ts"

import { setCaretAt } from "../shared/dom.ts"

import { showToast } from "../shared/ui.ts"

import { parseSideBySide } from "./diff-parse.ts"

import { EditorTabs } from "./EditorTabs.ts"
import type { EditorTabView } from "./EditorTabs.ts"
import { EditorInfoBar } from "./EditorInfoBar.ts"
import { MarkdownPreview } from "./MarkdownPreview.ts"
import { HtmlPreview } from "./HtmlPreview.ts"
import { PdfPreview } from "./PdfPreview.ts"
import { commands } from '../commands.ts'

/**
 * highlight.js emits HTML strings, so highlighted ranges must be injected as
 * markup. This is the only deliberate string-render boundary in the client:
 * every other view builds React elements. Call sites go through this helper so
 * the exception stays greppable and auditable.
 */
function highlighted(html: string): { dangerouslySetInnerHTML: { __html: string } } {
	return { dangerouslySetInnerHTML: { __html: html } };
}

function EditorBody({ zoom, setZoom }: { zoom: number; setZoom: (value: number | ((z: number) => number)) => void }) {

			const [, forceUpdate] = useState(0);

			const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

			const textareaRef = useRef(null);

			const gutterRef = useRef(null);

			const zoomRef = useRef(1);

			const previewRef = useRef(null);

			const imgRef = useRef(null);

			const panRef = useRef({ x: 0, y: 0, start: null });

			const diffRightRowRefs = useRef<(HTMLElement | null)[]>([]);

			const [diffRows, setDiffRows] = useState(null);

			const rowIdRef = useRef(0);

			const focusDiffRowRef = useRef(-1);

			const focusDiffOffsetRef = useRef(-1);

			const lastEditorFileRef = useRef(null);

			const hlPreRef = useRef(null);

			useEffect(() => {

				const idx = focusDiffRowRef.current;

				if (idx >= 0) {

					focusDiffRowRef.current = -1;

					const el = diffRightRowRefs.current[idx];

					const off = focusDiffOffsetRef.current;

					focusDiffOffsetRef.current = -1;

					if (el) {

						// The row content span is inside the single editable column
						// host; focus the host itself so typing resumes reliably.
						const host = (el.closest('[contenteditable="true"]') || el) as HTMLElement;

						host.focus();

						if (typeof setCaretAt === "function" && off >= 0) setCaretAt(el, off);

					}

				}

			});

			useEffect(() => {

				const listeners = commands.diffListeners;

				if (listeners) {

					listeners.add(rerender);

					return () => {

						listeners.delete(rerender);

					};

				}

			}, [rerender]);

			useEffect(() => {

				const listeners = commands.editorListeners;

				if (listeners) {

					listeners.add(rerender);

					return () => {

						listeners.delete(rerender);

					};

				}

			}, [rerender]);

			// Editor-mode hooks (zoom/pan for image preview) must run on every
			// render even when the diff branch returns early — conditional hooks
			// broke the view after switching between a file and a diff.
			const edSt = commands.getEditorState?.();

			const edImage = edSt?.editorImage ?? false;

			const edFile = edSt?.editorFile ?? null;

			useEffect(() => { zoomRef.current = zoom; }, [zoom]);

			useEffect(() => {

				const el = previewRef.current;

				if (!el) return;

				const onWheel = (e) => {

					if (!e.ctrlKey) return;

					e.preventDefault();

					const oldZoom = zoomRef.current;

					const next = Math.min(10, Math.max(0.5, +(oldZoom * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2)));

					if (next === oldZoom) return;

					const rect = el.getBoundingClientRect();

					const mx = e.clientX - rect.left;

					const my = e.clientY - rect.top;

					const ratio = next / oldZoom;

					// Image point under the cursor is (mx - pan) / zoom; keep it
					// fixed by pan' = mx - (mx - pan) * ratio.
					const pan = panRef.current;

					pan.x = mx - (mx - pan.x) * ratio;

					pan.y = my - (my - pan.y) * ratio;

					const img = imgRef.current;

					if (img) img.style.transform = `translate(${pan.x}px, ${pan.y}px)`;

					zoomRef.current = next;

					setZoom(next);

				};

				el.addEventListener("wheel", onWheel, { passive: false });

				return () => el.removeEventListener("wheel", onWheel);

			}, [edImage]);

			// Switching files resets zoom and pan.
			useEffect(() => {

				const pan = panRef.current;

				pan.x = 0;

				pan.y = 0;

				const img = imgRef.current;

				if (img) img.style.transform = "translate(0px, 0px)";

				setZoom(1);

			}, [edFile]);

			// Left-drag pans the image viewport (grab tool). preventDefault on
			// mousedown also stops text selection and the browser's native image
			// drag, so the image can never be dropped into the chat input.
			useEffect(() => {

				const el = previewRef.current;

				const img = imgRef.current;

				if (!el || !img) return;

				const onMouseDown = (e) => {

					if (e.button !== 0) return;

					e.preventDefault();

					panRef.current.start = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };

					el.style.cursor = "grabbing";

				};

				const onMouseMove = (e) => {

					const s = panRef.current.start;

					if (!s) return;

					e.preventDefault();

					const nx = s.panX + (e.clientX - s.x);

					const ny = s.panY + (e.clientY - s.y);

					panRef.current.x = nx;

					panRef.current.y = ny;

					img.style.transform = `translate(${nx}px, ${ny}px)`;

				};

				const onMouseUp = () => {

					panRef.current.start = null;

					el.style.cursor = zoomRef.current > 1 ? "grab" : "default";

				};

				el.addEventListener("mousedown", onMouseDown);

				document.addEventListener("mousemove", onMouseMove);

				document.addEventListener("mouseup", onMouseUp);

				return () => {

					el.removeEventListener("mousedown", onMouseDown);

					document.removeEventListener("mousemove", onMouseMove);

					document.removeEventListener("mouseup", onMouseUp);

				};

			}, [edImage]);

			useEffect(() => {

				const st = commands.getEditorState?.();

				if (st && textareaRef.current && st.editorContent !== null && st.editorLoading === false) {

					if (st.editorFile !== lastEditorFileRef.current) {

						lastEditorFileRef.current = st.editorFile;

						textareaRef.current.scrollTop = 0;

						if (gutterRef.current) gutterRef.current.scrollTop = 0;

					}

					if (textareaRef.current.value !== st.editorContent) {

						textareaRef.current.value = st.editorContent;

					}

				}

			});

												const getDiffState = commands.getDiffState;

			const dstate = getDiffState ? getDiffState() : null;

			if (dstate && dstate.diffPath) {

				if (dstate.diffLoading) return h("div", { style: {

					padding: "16px",

					textAlign: "center",

					color: "var(--dsw-alias-label-tertiary)"

				} }, t("loading"));

				if (dstate.diffUnsupported) return h("div", { style: {

					padding: "16px",

					textAlign: "center",

					color: "var(--dsw-alias-label-tertiary)"

				} }, document.documentElement.lang?.startsWith("zh") ? "二进制文件无法预览差异" : "Cannot preview diff of a binary file");

const hunks = [];

{

let curHunk = null;

for (const _l of (dstate.diffContent || "").split("\n")) {

const _m = _l.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

if (_m) { curHunk = { oldStart: +_m[1], oldCount: _m[2] ? +_m[2] : 1, newStart: +_m[3], newCount: _m[4] ? +_m[4] : 1, index: hunks.length }; hunks.push(curHunk); }

}

}

const _rowHunk = (oldNum, newNum) => {

for (const h of hunks) {

if (oldNum !== null && oldNum >= h.oldStart && oldNum < h.oldStart + h.oldCount) return h.index;

if (newNum !== null && newNum >= h.newStart && newNum < h.newStart + h.newCount) return h.index;

}

return -1;

};

				if (!diffRows || diffRows.path !== dstate.diffPath || diffRows.staged !== dstate.diffStaged) {

					const parsed = parseSideBySide(dstate.diffContent || "");

const oldLines = (dstate.diffOldContent || "").split("\n");

const newLines = (dstate.diffNewContent || "").split("\n");

if (oldLines[oldLines.length - 1] === "") oldLines.pop();

if (newLines[newLines.length - 1] === "") newLines.pop();

const oldToNew = new Map();

parsed.forEach((r) => {

if (r.old !== "" && r.oldNum !== null) oldToNew.set(r.oldNum, r.new !== "" && r.newNum !== null ? r.newNum : null);

});

const full = [];

let j = 1;

for (let i = 1; i <= oldLines.length; i++) {

const paired = oldToNew.has(i) ? oldToNew.get(i) : undefined;

if (paired === null) {

full.push({ id: rowIdRef.current++, old: oldLines[i - 1], new: "", oldNum: i, newNum: null, inNew: false, oldDel: true, newAdd: false });

} else if (paired !== undefined) {

while (j < paired) {

full.push({ id: rowIdRef.current++, old: "", new: newLines[j - 1], oldNum: null, newNum: j, inNew: true, oldDel: false, newAdd: true });

j++;

}

full.push({ id: rowIdRef.current++, old: oldLines[i - 1], new: newLines[paired - 1], oldNum: i, newNum: paired, inNew: true, oldDel: oldLines[i - 1].replace(/\r$/, "") !== newLines[paired - 1].replace(/\r$/, ""), newAdd: oldLines[i - 1].replace(/\r$/, "") !== newLines[paired - 1].replace(/\r$/, "") });

j = paired + 1;

} else {

const _oldT = oldLines[i - 1].replace(/\r$/, "");

const _newT = (j <= newLines.length ? newLines[j - 1] : "").replace(/\r$/, "");

const _changed = _oldT !== _newT;

full.push({ id: rowIdRef.current++, old: oldLines[i - 1], new: j <= newLines.length ? newLines[j - 1] : "", oldNum: i, newNum: j <= newLines.length ? j : null, inNew: j <= newLines.length, oldDel: _changed, newAdd: _changed });

j++;

}

}

while (j <= newLines.length) {

full.push({ id: rowIdRef.current++, old: "", new: newLines[j - 1], oldNum: null, newNum: j, inNew: true, oldDel: false, newAdd: true });

j++;

}

full.forEach((r) => { r.hunk = _rowHunk(r.oldNum, r.newNum); });

const diffLang = langFromPath(dstate.diffPath);

const oldRuns = diffLang ? (highlightLinesHtml(dstate.diffOldContent || "", diffLang) ?? undefined) : undefined;

setDiffRows({ path: dstate.diffPath, staged: dstate.diffStaged, rows: full, oldRuns });

commands.setActiveDiffState?.({ dirty: false });

				}

				const rows = (diffRows && diffRows.path === dstate.diffPath && diffRows.staged === dstate.diffStaged) ? diffRows.rows : [];

				const hunkStartRow = new Map();

				rows.forEach((r, i) => { if ((r.oldDel || r.newAdd) && r.hunk !== undefined && !hunkStartRow.has(r.hunk)) hunkStartRow.set(r.hunk, i); });

				const stageHunk = async (hunk) => {

					try {

						const result = await (await fetch("/solution-explorer/git-stage-hunk", {

							method: "POST",

							headers: { "Content-Type": "application/json" },

							body: JSON.stringify({ root: dstate.diffRoot, file: dstate.diffPath, oldStart: hunk.oldStart, newStart: hunk.newStart })

						})).json();

						if (!result.ok) showToast("暂存块失败: " + (result.error?.message || ""), true);

						else commands.refreshSCM?.();

					} catch (err) { showToast("暂存块失败: " + (err.message || String(err)), true); }

				};

				const revertHunk = (hunkIndex) => {

					setDiffRows((prev) => {

						if (!prev) return prev;

						const nr = prev.rows.map((r) => {

							if (r.hunk !== hunkIndex) return r;

							if (r.old !== "") return { ...r, new: r.old, oldDel: false, newAdd: false, inNew: true };

							return { ...r, new: "", oldDel: false, newAdd: false, inNew: true };

						});

						return { ...prev, rows: nr };

					});

					commands.setActiveDiffState?.({ dirty: true });

				};

				if (rows.length === 0) return h("div", { style: {

					padding: "16px",

					textAlign: "center",

					color: "var(--dsw-alias-label-tertiary)"

				} }, "无差异");

				const editable = !dstate.diffStaged;

				const NBSP = "\u00A0";

				const numStyle = {

					display: "inline-block",

					width: "3em",

					textAlign: "right",

					marginRight: "8px",

					color: "var(--dsw-alias-label-tertiary)",

					opacity: .6,

					userSelect: "none"

				};

				const rightHtml = (ri) => {

					const row = rows[ri];

					if (!row || row.new === "") return "";

					const l = langFromPath(dstate.diffPath);

					if (l) { const hl = highlightToHtml(row.new, l); if (hl) return hl; }

					return row.new.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

				};

				// Right-pane editing runs on ONE contentEditable host (the whole
				// column) so text selection can span multiple rows while editing
				// stays row-aware. Caret→row resolution walks the DOM up to the
				// row wrapper (data-row-idx) and measures the caret inside that
				// row's content span.
				const rowAtNode = (node) => {
					let n = node;
					while (n && n.nodeType === 1 && n.getAttribute?.("data-row-idx") == null) n = n.parentNode;
					return n && n.getAttribute ? Number(n.getAttribute("data-row-idx")) : -1;
				};
				const rowInfoAt = (node, offset) => {
					const idx = rowAtNode(node);
					if (idx < 0) return { idx, offset: 0 };
					const el = diffRightRowRefs.current[idx];
					if (!el) return { idx, offset: 0 };
					if (!el.contains(node)) return { idx, offset: 0 };
					const pre = document.createRange();
					pre.selectNodeContents(el);
					try { pre.setEnd(node, offset); } catch { return { idx, offset: 0 }; }
					return { idx, offset: pre.toString().length };
				};
				const onRightEnterAtCaret = () => {
					const sel = window.getSelection();
					if (!sel || sel.rangeCount === 0) return;
					const info = rowInfoAt(sel.anchorNode, sel.anchorOffset);
					const i = info.idx;
					if (i < 0 || i >= rows.length) return;
					const el = diffRightRowRefs.current[i];
					if (!el) return;
					const text = el.textContent || "";
					const before = text.slice(0, info.offset), after = text.slice(info.offset);
					setDiffRows((prev) => {
						if (!prev) return prev;
						const nr = [...prev.rows];
						nr[i] = { ...nr[i], new: before };
						nr.splice(i + 1, 0, { id: rowIdRef.current++, old: "", new: after, oldNum: null, newNum: null, inNew: true, oldDel: false, newAdd: true });
						return { ...prev, rows: nr };
					});
					focusDiffRowRef.current = i + 1;
					focusDiffOffsetRef.current = 0;
					commands.setActiveDiffState?.({ dirty: true });
				};
				// Delete a non-collapsed (possibly multi-row) selection: collapse
				// the affected rows into one so the row model stays in sync with
				// what gets saved.
				const deleteRightSelection = () => {
					const sel = window.getSelection();
					if (!sel || sel.rangeCount === 0) return;
					const range = sel.getRangeAt(0);
					let a = rowInfoAt(range.startContainer, range.startOffset);
					let b = rowInfoAt(range.endContainer, range.endOffset);
					if (a.idx < 0 || b.idx < 0) return;
					if (a.idx > b.idx || (a.idx === b.idx && a.offset > b.offset)) { const t = a; a = b; b = t; }
					const elA = diffRightRowRefs.current[a.idx];
					const elB = diffRightRowRefs.current[b.idx];
					const textA = elA ? elA.textContent || "" : rows[a.idx]?.new || "";
					const textB = elB ? elB.textContent || "" : rows[b.idx]?.new || "";
					const merged = textA.slice(0, a.offset) + textB.slice(b.offset);
					setDiffRows((prev) => {
						if (!prev) return prev;
						const nr = [...prev.rows];
						nr[a.idx] = { ...nr[a.idx], new: merged, newAdd: true };
						nr.splice(a.idx + 1, b.idx - a.idx);
						return { ...prev, rows: nr };
					});
					commands.setActiveDiffState?.({ dirty: true });
					focusDiffRowRef.current = a.idx;
					focusDiffOffsetRef.current = a.offset;
				};
				const rightColKeyDown = (e) => {
					if (!editable) return;
					if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveNew(); return; }
					if (e.key === "Enter") { e.preventDefault(); onRightEnterAtCaret(); return; }
					if (e.key === "Backspace" || e.key === "Delete") {
						const sel = window.getSelection();
						if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) { e.preventDefault(); deleteRightSelection(); return; }
						const info = rowInfoAt(sel?.anchorNode, sel?.anchorOffset ?? 0);
						const i = info.idx;
						if (i < 0 || i >= rows.length) return;
						const el = diffRightRowRefs.current[i];
						if (!el) return;
						const text = el.textContent || "";
						const caret = info.offset;
						if (caret === 0 && e.key === "Backspace" && i > 0 && rows[i - 1].inNew !== false) {
							e.preventDefault();
							setDiffRows((prev) => {
								const nr = [...prev.rows];
								nr[i - 1] = { ...nr[i - 1], new: (nr[i - 1].new || "") + (nr[i].new || "") };
								nr.splice(i, 1);
								return { ...prev, rows: nr };
							});
							commands.setActiveDiffState?.({ dirty: true });
							focusDiffRowRef.current = i - 1;
							focusDiffOffsetRef.current = (rows[i - 1].new || "").length;
							return;
						}
						if (caret === text.length && e.key === "Delete" && i < rows.length - 1 && rows[i + 1].inNew !== false) {
							e.preventDefault();
							setDiffRows((prev) => {
								const nr = [...prev.rows];
								nr[i] = { ...nr[i], new: (nr[i].new || "") + (nr[i + 1].new || "") };
								nr.splice(i + 1, 1);
								return { ...prev, rows: nr };
							});
							commands.setActiveDiffState?.({ dirty: true });
							focusDiffRowRef.current = i;
							focusDiffOffsetRef.current = (rows[i].new || "").length;
							return;
						}
						// Row start/end with nothing editable to merge into: swallow
						// the key so the browser never deletes across rows. Mid-row:
						// let the single editing host delete one character.
						if (caret === 0 || caret === text.length) { e.preventDefault(); return; }
						e.preventDefault();
						document.execCommand(e.key === "Backspace" ? "delete" : "forwardDelete");
					}
				};

				const saveNew = async () => {

					commands.setActiveDiffState?.({ saving: true });

					let content = "";

					let first = true;

					rows.forEach((r, i) => {

						if (r.inNew === false) return;

						const el = diffRightRowRefs.current[i];

						let text = r.new;

						if (el) {

							// innerText carries the browser's block/line-break
							// formatting, so the edited text needs no HTML
							// string round-trip to be extracted.
							text = (el as HTMLElement).innerText ?? r.new;

						}

						content += (first ? "" : "\n") + text;

						first = false;

					});

					try {

						const result = await (await fetch("/solution-explorer/write", {

							method: "POST",

							headers: { "Content-Type": "application/json" },

							body: JSON.stringify({

								root: dstate.diffRoot,

								path: dstate.diffPath,

								content

							})

						})).json();

						if (!result.ok) showToast("保存失败: " + (result.error?.message || ""), true);

						else commands.refreshSCM?.();

					} catch (err) {

						showToast("保存失败: " + (err.message || String(err)), true);

					}

					commands.setActiveDiffState?.({ saving: false });

					commands.setActiveDiffState?.({ dirty: false });

				};

				return h("div", { style: {

					display: "flex",

					flexDirection: "column",

					height: "100%"

				} }, h("div", { style: {

					flex: 1,

					overflow: "auto",

					display: "flex",

					fontFamily: "monospace",

					fontSize: "12px",

					lineHeight: "18px"

				} }, h("div", { className: "sol-exp-hl", style: {

					flex: "1 1 50%",

					minWidth: 0,

					overflowX: "auto",

					borderRight: "1px solid var(--dsw-alias-border-l1)"

				} }, rows.map((r) => h("div", { key: "o" + r.id, style: {

					whiteSpace: "pre",

					padding: "0 8px",

					background: r.oldDel ? "rgba(241,76,76,0.15)" : "transparent",

					color: r.oldDel ? "#f14c4c" : "var(--dsw-alias-label-primary)"

				} }, h("span", { style: numStyle }, r.oldNum === null ? "" : String(r.oldNum)), r.old === "" ? h("span", null, NBSP) : (diffRows && diffRows.oldRuns && r.oldNum !== null ? h("span", highlighted(diffRows.oldRuns[r.oldNum - 1] ?? "")) : h("span", null, r.old))))), h("div", { style: { flex: "none", width: "28px", borderLeft: "1px solid var(--dsw-alias-border-l1)", borderRight: "1px solid var(--dsw-alias-border-l1)", display: "flex", flexDirection: "column", overflow: "hidden" } }, rows.map((r, i) => { const isStart = hunkStartRow.get(r.hunk) === i; let child = null; if (isStart) { child = h("div", { style: { display: "flex", gap: "1px" } }, h("button", { type: "button", title: "暂存块", onClick: () => stageHunk(hunks[r.hunk]), style: { border: "none", background: "transparent", cursor: "pointer", fontSize: "11px", color: "var(--dsw-alias-label-secondary)", padding: "0 2px", lineHeight: "14px" } }, "⤒"), h("button", { type: "button", title: "还原块", onClick: () => revertHunk(r.hunk), style: { border: "none", background: "transparent", cursor: "pointer", fontSize: "11px", color: "var(--dsw-alias-label-secondary)", padding: "0 2px", lineHeight: "14px" } }, "↩")); } else if (r.oldDel || r.newAdd) { child = h("span", { style: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block", background: r.oldDel ? "#f14c4c" : "#4ec9b0", opacity: 0.65 } }, null); } return h("div", { key: "g" + r.id, style: { height: "18px", lineHeight: "18px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" } }, child); })), h("div", { className: "sol-exp-hl", style: {

					flex: "1 1 50%",

					minWidth: 0,

					overflowX: "auto",
					outline: "none"

				}, contentEditable: editable, suppressContentEditableWarning: true, spellCheck: false, onInput: () => commands.setActiveDiffState?.({ dirty: true }), onKeyDown: rightColKeyDown, onPaste: (e) => { e.preventDefault(); const t = e.clipboardData.getData("text/plain"); document.execCommand("insertText", false, t); } }, rows.map((r, i) => h("div", { key: "n" + r.id, "data-row-idx": String(i), style: {

					whiteSpace: "pre",

					padding: "0 8px",

					background: r.newAdd ? "rgba(78,201,176,0.15)" : "transparent",

					color: r.newAdd ? "#4ec9b0" : "var(--dsw-alias-label-primary)"

				} }, h("span", { style: numStyle, contentEditable: false }, r.newNum === null ? "" : String(r.newNum)), r.inNew === false ? h("span", { style: {

					color: "var(--dsw-alias-label-tertiary)",

					opacity: .4

				}, contentEditable: false }, NBSP) : h("span", {

					style: { minWidth: "2px" },

					ref: (el2) => { diffRightRowRefs.current[i] = el2; }

				}, h("span", highlighted(rightHtml(i)))))))));

			}

const getState = commands.getEditorState;

			const st = getState ? getState() : {

				editorFile: null,

				editorContent: null,

				editorLoading: false,

				editorError: null,

				editorSaving: false,

				editorUnsupported: false,

				editorImage: false,

				editorRoot: ""

			};

			const file = st.editorFile;

			const loading = st.editorLoading;

			const error = st.editorError;


			const unsupported = st.editorUnsupported;

			const image = st.editorImage;

			const editorRoot = st.editorRoot;

			// A tab whose file has a renderer draws that renderer instead of the
			// source editor; the info row's toggle switches back. A PDF carries no
			// text to wait for — its frame reads the bytes itself. The caller
			// already supplies the `.sol-exp-editor-body` box, whose bottom padding
			// keeps content clear of the composer, so a renderer is returned as
			// that box's own child: wrapping it again would inset it twice.
			if (st.editorRenderer !== null && st.editorPreview === true && error === null
				&& (st.editorRenderer === "pdf" || st.editorContent !== null)) {

				return st.editorRenderer === "html"
					? h(HtmlPreview, { root: editorRoot, path: file ?? "", text: st.editorContent ?? "" })
					: st.editorRenderer === "pdf"
						? h(PdfPreview, { root: editorRoot, path: file ?? "", zoom, onZoom: setZoom })
						: h(MarkdownPreview, {
							text: st.editorContent ?? "",
							revision: document.documentElement.lang || "zh"
						});

			}




			const editorLang = langFromPath(file || "");

			let editorHtml = "";

			{

				const text = st.editorContent ?? "";

				if (editorLang) { const hl = highlightToHtml(text, editorLang); if (hl) editorHtml = hl; }

				if (!editorHtml) editorHtml = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

			}

			if (!file) return h("div", { className: "sol-exp-editor-empty" },

				h(IconEditOutline16, { size: 28 }),

				h("span", null, t("editor.noFile")),

			);

			if (loading) return h("div", { style: {

				padding: "16px",

				textAlign: "center",

				color: "var(--dsw-alias-label-tertiary)"

			} }, t("loading"));

			if (unsupported) return h("div", { style: {

				padding: "16px",

				textAlign: "center",

				color: "var(--dsw-alias-label-tertiary)"

			} }, document.documentElement.lang?.startsWith("zh") ? "不支持打开此文件" : "This file type is not supported");

			if (error) return h("div", { style: {

				padding: "16px",

				textAlign: "center",

				color: "var(--dsw-color-error)"

			} }, error);

			if (image) return h("div", { style: {

				display: "flex",

				flexDirection: "column",

				height: "100%"

			} }, h("div", { ref: previewRef, style: {

				flex: 1,

				minHeight: 0,

				display: "flex",

				padding: "12px",

				background: "var(--dsw-alias-bg-input)",

				overflow: "hidden",

				cursor: zoom > 1 ? "grab" : "default"

			} }, h("img", {

				ref: imgRef,

				src: "/solution-explorer/raw?root=" + encodeURIComponent(editorRoot) + "&file=" + encodeURIComponent(file),

				alt: file,

				draggable: false,

				onDragStart: (e) => e.preventDefault(),

				onDoubleClick: () => { const pan = panRef.current; pan.x = 0; pan.y = 0; const img = imgRef.current; if (img) img.style.transform = "translate(0px, 0px)"; setZoom(1); },

				style: zoom === 1 ? {

					maxWidth: "100%",

					maxHeight: "100%",

					objectFit: "contain",

					borderRadius: "4px",

					margin: "auto"

				} : {

					width: zoom * 100 + "%",

					height: "auto",

					maxWidth: "none",

					maxHeight: "none",

					flex: "none",

					borderRadius: "4px",

					margin: "0",

					transform: `translate(${panRef.current.x}px, ${panRef.current.y}px)`

				}

			})));

			return h("div", { style: {

				display: "flex",

				flexDirection: "column",

				height: "100%"

			} }, h("div", { style: {

				flex: 1,

				minHeight: 0,

				position: "relative",

				overflow: "hidden",

				display: "flex"

}}, h("div", {
ref: gutterRef,
style: {
position: "absolute",
top: 0,
left: 0,
bottom: 0,
width: "3em",
overflow: "hidden",
background: "var(--dsw-alias-bg-input)",
borderRight: "1px solid var(--dsw-alias-border-l1)",
fontFamily: "monospace",
fontSize: "13px",
lineHeight: "1.5",
textAlign: "right",
padding: "8px 6px 8px 0",
color: "var(--dsw-alias-label-tertiary)",
opacity: .7,
userSelect: "none"
}
}, Array.from({ length: Math.max(1, (st.editorContent ?? "").split("\n").length) }, (_, i) => h("div", { key: i }, String(i + 1)))), h("div", { style: {
flex: 1,
minWidth: 0,
marginLeft: "3em",
position: "relative"
} }, h("pre", {
ref: hlPreRef,
className: "sol-exp-hl",
style: {
position: "absolute",
top: 0,
left: 0,
right: 0,
bottom: 0,
margin: 0,
boxSizing: "border-box",
padding: "8px 12px",
fontFamily: "monospace",
fontSize: "13px",
lineHeight: "1.5",
whiteSpace: "pre-wrap",
overflow: "hidden",
pointerEvents: "none",
color: "var(--dsw-alias-label-primary)",
background: "transparent",
tabSize: 2
},
...highlighted(editorHtml)
}), h("textarea", {
ref: textareaRef,
style: {
position: "absolute",
top: 0,
left: 0,
right: 0,
bottom: 0,
width: "100%",
height: "100%",
boxSizing: "border-box",
padding: "8px 12px",
border: "none",
background: "transparent",
color: "transparent",
caretColor: "var(--dsw-alias-label-primary)",
fontFamily: "monospace",
fontSize: "13px",
lineHeight: "1.5",
outline: "none",
resize: "none",
tabSize: 2,
whiteSpace: "pre-wrap",
overflow: "auto"
},
defaultValue: st.editorContent ?? "",
onInput: (e) => {
commands.setActiveContent?.(e.target.value);
},
onScroll: (e) => {
const stp = e.target.scrollTop;
const slp = e.target.scrollLeft;
if (gutterRef.current) gutterRef.current.scrollTop = stp;
if (hlPreRef.current) { hlPreRef.current.scrollTop = stp; hlPreRef.current.scrollLeft = slp; }
},
onKeyDown: (e) => {
if ((e.ctrlKey || e.metaKey) && e.key === "s") {
e.preventDefault();
commands.saveFile?.();
}
},
spellCheck: false
}))), h("div", { style: {

				display: "flex",

				alignItems: "center",

				padding: "2px 8px",

				borderTop: "1px solid var(--dsw-alias-border-l1)",

				fontSize: "11px",

				color: "var(--dsw-alias-label-tertiary)"

			} }, h("span", null, t("editor.saveHint"))));

		}

/**
 * The editor view registered into the host's view tabs: a tab strip over the
 * active tab's body. The body itself is unchanged — it renders whichever tab
 * the store has active.
 */
export function EditorView() {

			const [, forceUpdate] = useState(0);

			const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

			useEffect(() => {

				const listeners = commands.editorListeners;

				if (listeners) {

					listeners.add(rerender);

					return () => {

						listeners.delete(rerender);

					};

				}

			}, [rerender]);

			const strip = commands.getEditorTabs?.() ?? { tabs: [] as EditorTabView[], activeId: null as string | null, activeStatus: null, activePath: null, activeKind: null };

			// Image zoom lives here so the controls can sit in the info row while
			// the preview itself stays in the body.
			const [zoom, setZoom] = useState(1);


			return h("div", { className: "sol-exp-editor", "data-conversation-composer-overlay": "" },

				h("div", { className: "sol-exp-editor-top" },

					h(EditorTabs, {

						tabs: strip.tabs,

						activeId: strip.activeId,

						onActivate: (id: string) => { commands.activateTab?.(id) },

						onClose: (id: string) => { void commands.closeTab?.(id) }

					}),

					strip.activePath && strip.activeKind
						? h(EditorInfoBar, {

							path: strip.activePath,

							kind: strip.activeKind,

							status: strip.activeStatus,

							diff: strip.activeDiff,

							md: strip.activePreviewToggle === true
								? {
									preview: strip.activePreview === true,
									onToggle: (preview: boolean) => { commands.setTabPreview?.(preview) },
								}
								: null,

							zoom: strip.activeKind === "image" || strip.activeKind === "pdf"
								? {
									percent: Math.round(zoom * 100),
									onIn: () => setZoom((z) => Math.min(10, +(z * 1.25).toFixed(2))),
									onOut: () => setZoom((z) => Math.max(0.5, +(z * 0.8).toFixed(2))),
									onReset: () => setZoom(1),
								}
								: null,

						})
						: null,

				),

				h("div", { className: "sol-exp-editor-body" }, h(EditorBody, { zoom, setZoom })),

			);

		}

