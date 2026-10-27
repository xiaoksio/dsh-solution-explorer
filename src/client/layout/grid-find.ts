/**
 * Locate the shell's column grid — layout domain.
 * @module dsh-solution-explorer/client/layout/grid-find
 */

/** Whether an element's class attribute contains a class fragment (safe for any element). */
function hasClass(el: any, fragment: string): boolean {

	const cls = el?.className;

	if (typeof cls === "string") return cls.includes(fragment);

	return typeof cls?.baseVal === "string" && cls.baseVal.includes(fragment);

}

/**
 * The shell's own column grid: the element whose `grid-template-columns` sizes
 * the frame's columns.
 *
 * Two shells exist in the wild. Current DSH declares three tracks
 * (sidebar | center | rightbar) on a grid whose left column is class-named
 * `sidebarCol`, and nests that grid under a `display:contents` slot wrapper.
 * Older shells declared `sidebar | center | details` and carried a
 * `data-dsh-frame` marker. Both are found from the left sidebar itself, because
 * the layout's class names are hashed per build and the marker may be absent.
 *
 * The returned element is the grid, never the wrapper: a column appended to a
 * `display:contents` wrapper sits outside the tracks that size columns, which
 * renders it in the document flow instead of the right-hand column.
 * @returns the grid element, or null while the shell has not rendered yet.
 */
export function resolveShellGrid(): any {

	const slot = document.querySelector('[data-slot="sidebar"]');

	const anchored = slot?.parentElement ?? null;

	const fallback = document.querySelector("[class*=\"sidebarCol\"]");

	const start = anchored ?? fallback;

	if (start === null || start === undefined) {

		return document.querySelector("[data-dsh-frame]");

	}

	// The anchor may be the column itself or a node nested inside it.
	let column: any = start;

	for (let depth = 0; column !== null && depth < 3; depth++) {

		if (hasClass(column, "sidebarCol")) break;

		column = column.parentElement;

	}

	if (!hasClass(column, "sidebarCol")) column = start;

	const grid = column?.parentElement ?? null;

	if (grid !== null && grid !== document.body) return grid;

	return document.querySelector("[data-dsh-frame]");

}
