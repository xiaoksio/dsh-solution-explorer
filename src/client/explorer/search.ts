/**
 * File-name search view & loader — explorer domain.
 * @module dsh-solution-explorer/client/explorer/search
 */

import { t } from "../locales.ts"

import { escapeHtml } from "../shared/dom.ts"

import { folderIcon, fileIcon } from "./icons.ts"

import type { SearchState, TreeState, AppState } from "../state/store.ts"

export async function searchFiles(query: string, { state, render }: { state: AppState; render: () => void }) {

					state.search.searchQuery = query;

					if (!query.trim()) {

						state.search.searching = false;

						state.search.searchResults = [];

						render();

						return;

					}

					state.search.searching = true;

					render();

					try {

						const result = await (await fetch(`/solution-explorer/search?root=${encodeURIComponent(state.root)}&q=${encodeURIComponent(query)}`)).json();

						if (state.search.searchQuery !== query) return;

						if (result.ok) state.search.searchResults = result.value;

						render();

					} catch {

						render();

					}

				}

export function buildSearchContent(search: SearchState, tree: TreeState, root: string): string {

					const searchPlaceholder = t("file.search");

					let contentHTML = "";

					if (search.searching) if (search.searchResults.length === 0) contentHTML = `<div class="sol-exp-empty">${document.documentElement.lang?.startsWith("zh") ? "无匹配文件" : "No matching files"}</div>`;

					else contentHTML = "<div class=\"sol-exp-search-results\">" + search.searchResults.map((r) => {

						const pathJs = r.path.replace(/'/g, "\\'").replace(/\\/g, "\\\\");

						return `

              <div class="sol-exp-search-item ${tree.selectedPath === r.path ? "sol-exp-selected" : ""}"

                   onclick="window.__solExpSelectFile('${pathJs}', ${r.type === "directory"})"

                   data-sol-exp-path="${escapeHtml(r.path)}"

                   oncontextmenu="event.preventDefault();event.stopPropagation();window.__solExpContextMenu(this.dataset.solExpPath||'', event.pageX, event.pageY, ${r.type === "directory"})">

                <span class="sol-exp-icon">${r.type === "directory" ? folderIcon(false) : fileIcon(r.name)}</span>

                <span class="sol-exp-name">${escapeHtml(r.name)}</span>

                <span class="sol-exp-path">${escapeHtml(r.path)}</span>

              </div>

            `;

					}).join("") + "</div>";

					else contentHTML = `<div class="sol-exp-empty">${document.documentElement.lang?.startsWith("zh") ? "输入关键词搜索文件" : "Type to search files"}</div>`;

					return `

        <div class="sol-exp-header"><span class="sol-exp-title">${root ? root.split(/[\\\/]/).pop() || root : ""}</span></div>

        <div class="sol-exp-search">

          <svg class="sol-exp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>

          <input type="text" class="sol-exp-search-input" placeholder="${searchPlaceholder}" value="${search.searchQuery}" oninput="window.__solExpSearch(this.value)" onkeydown="if(event.key==='Escape'){this.value='';window.__solExpSearch('')}"/>

        </div>

        <div class="sol-exp-content">${contentHTML}</div>

      `;

				}

/** Register the search bridges (window.__solExp*). Returns a disposer. */
export function registerSearchBridges(deps: { state: AppState; render: () => void }): () => void {
  const { state, render } = deps

  window.__solExpClearSearch = () => {
    state.search.searchQuery = "";
    state.search.searching = false;
    state.search.searchResults = [];
    render();
  };

  window.__solExpSearch = (query) => {
    if (state.search.searchTimer) clearTimeout(state.search.searchTimer);
    state.search.searchTimer = setTimeout(() => searchFiles(query, deps), 300);
  };

  return () => {
    delete window.__solExpClearSearch;
    delete window.__solExpSearch;
  };
}
