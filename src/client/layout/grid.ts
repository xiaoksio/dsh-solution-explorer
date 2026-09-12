/**
 * Panel grid layout — layout domain.
 * @module dsh-solution-explorer/client/layout/grid
 */

import type { AppState } from "../state/store.ts"
import { commands } from '../commands.ts'

/** Panel width bounds and collapsed rail width (mirrors panel.ts constants). */
const PANEL_MIN = 264;
const PANEL_MAX = 560;
const PANEL_RAIL = 56;

export interface GridDeps {
  state: AppState
  render: () => void
  applySettings?: () => void
}

export function parseGridTracks(input: string): string[] {

					const tracks = [];

					let depth = 0;

					let current = "";

					for (const char of input) {

						if (char === "(") depth++;

						if (char === ")") depth = Math.max(0, depth - 1);

						if (char === " " && depth === 0) {

							if (current !== "") {

								tracks.push(current);

								current = "";

							}

							continue;

						}

						current += char;

					}

					if (current !== "") tracks.push(current);

					return tracks;

				}

export function trackPx(track: string): number {

					const m = /^(-?[\d.]+)px$/.exec(String(track ?? "").trim());

					return m === null ? 0 : Number(m[1]);

				}

export function clampPanelWidth(px: number): number {

					return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(px)));

				}

export function findFrame(): any {

					const s = document.querySelector("[data-dsh-frame]");

					if (s !== null) return s;

					return document.querySelector("[class*=\"sidebarCol\"]")?.parentElement ?? null;

				}

export function applyGrid({ state }: { state: AppState }): void {

					if (state.layout.panelFrame === null || state.layout.shellTracks.length < 3) return;

					// Folded: the column keeps a fixed narrow rail (mirrors the
					// native collapsed sidebar); expanded it uses the width
					// preference.
					const track = state.layout.panelCollapsed ? PANEL_RAIL : state.layout.panelWidth;

					const value = `${state.layout.shellTracks[0]} minmax(0, 1fr) ${state.layout.shellTracks[2]} ${Math.round(track)}px`;
					state.layout.panelFrame.style.gridTemplateColumns = value;
					state.layout.lastGridApplied = value;

					if (state.layout.panelCol !== null) state.layout.panelCol.style.visibility = state.layout.panelCollapsed || state.layout.panelWidth > 0 ? "visible" : "hidden";

					if (state.layout.resizeHandle !== null) {
						// The collapsed rail is fixed-width: no resize handle
						// while folded (native sidebar behavior).
						if (state.layout.panelCollapsed) {
							state.layout.resizeHandle.style.display = "none";
							return;
						}
						state.layout.resizeHandle.style.display = "";
						const w = state.layout.panelFrame.getBoundingClientRect().width;
						const handleLeft = w - state.layout.panelWidth - 3;
						// The panel grabber and the shell sidebar grabber both
						// sit on 8px hit strips; once the chat column is
						// squeezed away they overlap, and the later-appended
						// panel grabber wins the pointer. Disable it there so
						// the sidebar drag keeps full control.
						const overlapped = handleLeft - 4 <= (trackPx(state.layout.shellTracks[0]) || 0) + 4;
						state.layout.resizeHandle.style.left = handleLeft + "px";
						state.layout.resizeHandle.style.pointerEvents = overlapped ? "none" : "auto";
						state.layout.resizeHandle.dataset.overlapped = overlapped ? "true" : "false";
					}
				}

export function mountColumn({ state, render, applySettings }: GridDeps): void {

					if (state.layout.panelFrame !== null) return;

					const frame = findFrame();

					if (frame === null) return;

					state.layout.panelFrame = frame;

					state.layout.panelCol = document.createElement("div");

					state.layout.panelCol.dataset.solutionExplorer = "";

					state.layout.panelCol.style.minWidth = "0";

					state.layout.panelCol.style.overflow = "hidden";

					state.layout.panelCol.style.display = "flex";

					state.layout.panelCol.style.flexDirection = "column";

					state.layout.panelCol.style.borderLeft = "1px solid var(--dsw-alias-border-l2, #333)";

					frame.appendChild(state.layout.panelCol);

					state.activeEl = state.layout.panelCol;

					render();

					state.layout.panelCol.addEventListener("dragenter", (e) => e.stopPropagation());

					state.layout.panelCol.addEventListener("dragover", (e) => e.stopPropagation());

					state.layout.panelCol.addEventListener("drop", (e) => e.stopPropagation());

					state.layout.resizeHandle = document.createElement("div");

					state.layout.resizeHandle.className = "sol-exp-resize-handle";

					state.layout.resizeHandle.addEventListener("pointerdown", (e) => {

						e.preventDefault();

						state.layout.resizeHandle.dataset.dragging = "true";

						state.layout.resizeHandle.setPointerCapture(e.pointerId);

						const startX = e.clientX;

						const startWidth = state.layout.panelWidth;

						let dragging = false;

						const onMove = (me) => {

							const dx = me.clientX - startX;

							// Ignore sub-threshold jitter: a bare click on the
							// grabber (or a tiny pointer wobble) must not nudge
							// the panel width the wrong way.
							if (!dragging && Math.abs(dx) < 4) return;

							dragging = true;

							state.layout.panelWidth = clampPanelWidth(startWidth - dx);

							// A drag owns the width: settings never rewrite it
							// again until the next software start.
							state.layout.panelDragged = true;

							applyGrid({ state });

						};

						const onUp = () => {

							state.layout.resizeHandle.removeEventListener("pointermove", onMove);

							state.layout.resizeHandle.removeEventListener("pointerup", onUp);

							state.layout.resizeHandle.dataset.dragging = void 0;

						};

						state.layout.resizeHandle.addEventListener("pointermove", onMove);

						state.layout.resizeHandle.addEventListener("pointerup", onUp);

					});

					frame.appendChild(state.layout.resizeHandle);

					applyGrid({ state });

										const syncGrid = () => {

						if (state.layout.panelFrame === null) return;

						const inline = state.layout.panelFrame.style.gridTemplateColumns;
						if (inline === "" || inline === state.layout.lastGridApplied) return;

						const tracks = parseGridTracks(inline);
						if (tracks.length >= 2) {
							state.layout.shellTracks = tracks.length >= 3 ? tracks.slice(0, 3) : [...tracks, "minmax(0, 1fr)"];
							applyGrid({ state });
						}
					};
state.layout.styleObs = new MutationObserver(syncGrid);

					state.layout.styleObs.observe(frame, {

						attributes: true,

						attributeFilter: ["style"]

					});

				

					state.layout.sizeObs = new ResizeObserver(() => {

						applyGrid({ state });

					});

					state.layout.sizeObs.observe(frame);

					const initial = (frame as HTMLElement).style.gridTemplateColumns;

					if (initial !== "") {

						const tracks = parseGridTracks(initial);

						if (tracks.length >= 2 && tracks.length <= 3) state.layout.shellTracks = tracks;

						else if (tracks.length === 4 && trackPx(tracks[0]) > 0) state.layout.shellTracks = tracks.slice(0, 3);

					}

					applyGrid({ state });

					// Panel is mounted: re-apply the persisted settings so
					// autoOpen/width/symmetry land even if the settings fetch
					// resolved before the frame existed.
					applySettings?.();

				}

/** Register the layout commands. Returns a disposer. */
export function registerGridCommands({ state }: GridDeps): () => void {

  commands.scmDividerDown = (e) => {
    e.preventDefault();
    // Freeze auto-refresh for the duration of the drag so a poll
    // cannot rebuild the SCM region under the pointer.
    state.scm.scmDragging = true;
    // Query inside the active panel: global queries could hit a stale
    // or duplicate SCM region after session/repo switches.
    const scope = state.activeEl ?? document;
    const split = scope.querySelector(".sol-exp-scm-split");
    const top = scope.querySelector(".sol-exp-scm-top") as HTMLElement;
    const bottom = scope.querySelector(".sol-exp-scm-bottom") as HTMLElement;
    if (!split || !top || !bottom) { state.scm.scmDragging = false; return; }
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    const rect = split.getBoundingClientRect();
    // Guard against a zero-height split (collapsed region): fall back
    // to the panel height so the ratio never becomes NaN.
    const height = rect.height > 0 ? rect.height : (split.parentElement?.getBoundingClientRect().height ?? 300) || 300;
    const startY = e.clientY;
    const startSplit = state.scm.scmSplit;
    const onMove = (me) => {
      const dy = me.clientY - startY;
      // Re-measure each move: right after startup the split may still be
      // settling, and a stale tiny height would blow up the ratio.
      const curRect = split.getBoundingClientRect();
      const h = curRect.height > 200 ? curRect.height : height;
      const target = Math.min(85, Math.max(15, startSplit + (dy / h) * 100));
      // Clamp the per-move delta so one bad measurement cannot jump the
      // divider far down/up — the ratio only ever moves by <= 8% per move.
      const next = Math.min(Math.max(target, state.scm.scmSplit - 8), state.scm.scmSplit + 8);
      if (next === state.scm.scmSplit) return;
      state.scm.scmSplit = next;
      // Re-query each move so a refresh replacing the SCM region
      // mid-drag cannot invalidate the element references.
      const t = scope.querySelector(".sol-exp-scm-top") as HTMLElement | null;
      const b = scope.querySelector(".sol-exp-scm-bottom") as HTMLElement | null;
      if (t) t.style.flexBasis = state.scm.scmSplit + "%";
      if (b) b.style.flexBasis = (100 - state.scm.scmSplit) + "%";
    };
    const onUp = () => {
      state.scm.scmDragging = false;
      try { el.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  return () => {
    delete commands.scmDividerDown;
  };
}
