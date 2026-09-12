/**
 * Commit history & detail/tooltip — SCM domain.
 * Loaders receive deps = { state, loadRemotes } injected from panel.ts.
 * @module dsh-solution-explorer/client/scm/history
 */

import { t } from "../locales.ts"



import { gitRoot, type AppState, type CommitRow } from "../state/store.ts"

import { resetCommitDetail } from "./graph.ts"
import { createElement as h } from "react"
import { createRoot } from "react-dom/client"
import { CommitTooltip, type CommitTooltipData } from "./CommitTooltip.ts"

export interface HistoryDeps {
  state: AppState
  loadRemotes?: (deps?: any) => Promise<void>
  /** Trigger the React re-render after a data change (the list is React now). */
  render?: () => void
}

export async function getCommitDetail(hash: string, { state }: HistoryDeps) {
  if (state.commits.commitDetailCache.has(hash)) return state.commits.commitDetailCache.get(hash);
  const result = await (await fetch(`/solution-explorer/git-commit-detail?root=${encodeURIComponent(gitRoot(state))}&hash=${encodeURIComponent(hash)}`)).json();
  if (!result.ok || !result.value) throw new Error(result.error?.message || "加载失败");
  state.commits.commitDetailCache.set(hash, result.value);
  return result.value;
}

export async function githubCommitUrl(hash: string, { state, loadRemotes }: HistoryDeps) {
  if (!state.commits.remotesResolved && state.scm.remotesList.length === 0) { await loadRemotes?.({ state }); state.commits.remotesResolved = true; }
  const r = state.scm.remotesList.find((x) => x.type === "fetch" && x.name === "origin") || state.scm.remotesList.find((x) => x.type === "fetch");
  if (!r) return "";
  const url = r.url || "";
  // SSH: git@github.com(-something):user/repo.git
  // HTTPS: https://github.com/user/repo.git
  let m = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/) || url.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m || !/^github\.com/.test(m[1])) return "";
  return `https://github.com/${m[2]}/commit/${hash}`;
}

/** Project one commit payload into the tooltip's display data. */
function commitTooltipData(c: any, link: string): CommitTooltipData {
  const zh = document.documentElement.lang?.startsWith("zh");
  const body = (c.body || c.message || "").trim();
  const s = c.stats || { files: 0, insertions: 0, deletions: 0 };
  let statsText = "";
  if (c.files && c.files.length) {
    statsText = zh
      ? `已更改 ${s.files} 个文件`
      : `${s.files} file${s.files === 1 ? "" : "s"} changed`;
    if (s.insertions) statsText += zh ? `，${s.insertions} 行插入(+)` : `, ${s.insertions} insertion${s.insertions === 1 ? "" : "s"}(+)`;
    if (s.deletions) statsText += zh ? `，${s.deletions} 行删除(-)` : `, ${s.deletions} deletion${s.deletions === 1 ? "" : "s"}(-)`;
  }
  const date = new Date(c.timestamp).toLocaleString();
  return {
    body,
    statsText,
    meta: `${c.author} <${c.email}> · ${date}`,
    shortHash: c.shortHash,
    link,
  };
}

/** Render the tooltip card through its React root. */
function renderCommitTooltip(deps: HistoryDeps, data: CommitTooltipData | null, loading: boolean): void {
  const { state } = deps;
  const zh = document.documentElement.lang?.startsWith("zh") === true;
  state.commits.commitTipRoot?.render(h(CommitTooltip, {
    loading,
    data,
    loadingText: t("loading"),
    linkText: zh ? "在 GitHub 上打开" : "Open on GitHub",
  }));
}

export function buildCommitTooltip({ state }: HistoryDeps) {
  if (state.commits.commitTipEl) return;
  state.commits.commitTipEl = document.createElement("div");
  state.commits.commitTipEl.className = "sol-exp-commit-tooltip";
  state.commits.commitTipEl.style.display = "none";
  document.body.appendChild(state.commits.commitTipEl);
  state.commits.commitTipRoot = createRoot(state.commits.commitTipEl);
}

export function positionCommitTooltip(row: any, { state }: HistoryDeps) {
  const el = state.commits.commitTipEl;
  if (!el || !row) return;
  el.style.visibility = "hidden";
  el.style.display = "block";
  el.style.maxWidth = "340px";
  const tw = el.offsetWidth, th = el.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  const margin = 8;
  const rect = row.getBoundingClientRect();
  let x: number, y: number;
  // Prefer left of the row (not blocking the records below).
  if (rect.left - tw - 6 >= margin) {
    x = rect.left - tw - 6;
    y = rect.top;
  } else if (rect.right + 6 + tw <= vw - margin) {
    x = rect.right + 6;
    y = rect.top;
  } else {
    // Fallback: below the row.
    x = Math.min(Math.max(margin, rect.left), vw - tw - margin);
    y = rect.bottom + 6;
  }
  // Clamp vertically.
  if (y + th > vh - margin) y = Math.max(margin, rect.top - th - 6);
  if (y < margin) y = margin;
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.visibility = "visible";
}

export function hideCommitTooltip({ state }: HistoryDeps) {
  if (state.commits.commitTipShowTimer) { clearTimeout(state.commits.commitTipShowTimer); state.commits.commitTipShowTimer = 0; }
  if (state.commits.commitTipHideTimer) { clearTimeout(state.commits.commitTipHideTimer); state.commits.commitTipHideTimer = 0; }
  state.commits.commitTipHash = "";
  state.commits.commitTipPending = "";
  if (state.commits.commitTipEl) state.commits.commitTipEl.style.display = "none";
}

export function scheduleHideCommitTooltip(deps: HistoryDeps) {
  if (deps.state.commits.commitTipHideTimer) clearTimeout(deps.state.commits.commitTipHideTimer);
  deps.state.commits.commitTipHideTimer = setTimeout(() => hideCommitTooltip(deps), 200);
}

export function cancelHideCommitTooltip({ state }: HistoryDeps) {
  if (state.commits.commitTipHideTimer) { clearTimeout(state.commits.commitTipHideTimer); state.commits.commitTipHideTimer = 0; }
}

export async function showCommitTooltip(row: any, hash: string, deps: HistoryDeps) {
  const { state } = deps;
  state.commits.commitTipHash = hash;
  buildCommitTooltip(deps);
  renderCommitTooltip(deps, null, true);
  try {
    const c = await getCommitDetail(hash, deps);
    if (state.commits.commitTipHash !== hash) return;
    renderCommitTooltip(deps, commitTooltipData(c, ""), false);
    positionCommitTooltip(row, deps);
    // Resolve the GitHub link asynchronously and re-render with the real URL.
    void githubCommitUrl(hash, deps).then((link) => {
      if (state.commits.commitTipHash !== hash) return;
      renderCommitTooltip(deps, commitTooltipData(c, link), false);
    });
  } catch {
    if (state.commits.commitTipHash !== hash) return;
    renderCommitTooltip(deps, null, true);
    positionCommitTooltip(row, deps);
  }
}

export async function loadRecentCommits({ state, render }: HistoryDeps) {
  console.log("[sol-exp] loadRecentCommits", Date.now());
  if (!state.root || !state.scm.gitStatus || state.scm.gitStatus.branch === "unknown") return;
  // Bump the generation so a git-log fetch still in flight for
  // the previous repo/branch is discarded when it lands.
  state.commits.commitsSeq++;
  state.commits.commitsPage = 0;
  state.commits.commitsAllLoaded = false;
  // Drop the cached list: the reload shows the loading
  // placeholder until fresh commits arrive. render() reads from
  // commitsHTML, so a late render can never wipe a filled list
  // back to "Loading…".
  state.commits.rows = null;
  // Release the in-flight guard — the fetch it protects is stale
  // now and its response will be thrown away by the seq check.
  state.commits.commitsLoading = false;
  resetCommitDetail(state.commits);
  render?.();
  await loadCommitsPage({ state, render });
}

export async function loadCommitsPage({ state, render }: HistoryDeps) {
  if (!state.root || state.commits.commitsLoading || state.commits.commitsAllLoaded) return;
  const seq = state.commits.commitsSeq;
  state.commits.commitsLoading = true;
  try {
    const url = `/solution-explorer/git-log?root=${encodeURIComponent(gitRoot(state))}&count=50&skip=${state.commits.commitsPage * 50}`;
    const result = await (await fetch(url)).json();
    // A newer load took over while this fetch was in flight
    // (conversation/repo switch, refresh) — discard the stale
    // response instead of writing it into the current list.
    if (seq !== state.commits.commitsSeq) return;
    if (result.ok && result.value) {
      // The list is React now: publish rows and let the root re-render.
      if (state.commits.commitsPage === 0 && result.value.length === 0) {
        state.commits.rows = [];
        state.commits.commitsAllLoaded = true;
      } else {
        const pageRows: CommitRow[] = result.value.map((commit: any) => ({
          hash: commit.hash,
          shortHash: commit.shortHash,
          message: commit.message,
          timestamp: commit.timestamp,
          unpushed: commit.unpushed,
          parents: commit.parents,
        }));
        state.commits.rows = state.commits.commitsPage === 0
          ? pageRows
          : (state.commits.rows ?? []).concat(pageRows);
        state.commits.commitsPage++;
        if (result.value.length < 50) state.commits.commitsAllLoaded = true;
      }
      render?.();
    }
  } catch (err) {
    if (seq === state.commits.commitsSeq) console.error("Failed to load commits:", err);
  } finally {
    // Only the current generation may release the in-flight
    // guard; a stale fetch must not clear a newer one's flag.
    if (seq === state.commits.commitsSeq) state.commits.commitsLoading = false;
  }
}
