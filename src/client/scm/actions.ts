/**
 * SCM actions & status loading — SCM domain.
 * Loaders/actions receive deps = { state, render, loadRecentCommits }.
 * @module dsh-solution-explorer/client/scm/actions
 */

import { t } from "../locales.ts"

import { showToast } from "../shared/ui.ts"

import { gitRoot, type AppState } from "../state/store.ts"

import { buildSCMTopHTML } from "./scm-view.ts"

import { loadTree } from "../explorer/tree-render.ts"

import type { HistoryDeps } from "./history.ts"

export interface ActionsDeps {
  state: AppState
  render: () => void
  loadRecentCommits: (d: HistoryDeps) => Promise<void>
}

export async function loadRepos({ state, render }: ActionsDeps) {
  if (!state.root) return;
  try {
    const result = await (await fetch(`/solution-explorer/git-repos?root=${encodeURIComponent(state.root)}`)).json();
    if (result.ok && Array.isArray(result.value)) {
      state.scm.repos = result.value;
      if (!state.scm.activeRepo || !state.scm.repos.some((r) => r.path === state.scm.activeRepo)) {
        state.scm.activeRepo = state.scm.repos[0]?.path || state.root;
      }
      render();
    }
  } catch (err) { console.error("Failed to load repos:", err); }
}

export async function loadGitStatus(deps: ActionsDeps) {
  const { state, render } = deps;

  if (!state.root) return;

  const hadStatus = !!state.scm.gitStatus;

  try {

    const result = await (await fetch(`/solution-explorer/git-status?root=${encodeURIComponent(gitRoot(state))}`)).json();

    if (result.ok) {

      const prev = state.scm.gitStatus;

      state.scm.gitStatus = result.value;

      state.scm.gitChangesCount = (result.value.staged?.length || 0) + (result.value.unstaged?.length || 0) + (result.value.untracked?.length || 0);

      // Remember whether the UI-relevant status changed. Only
      // the branch and the change lists drive the SCM view;
      // ignored/ahead/behind may jitter between polls and
      // must not force a rebuild (which would interrupt a
      // divider drag).
      state.scm.gitStatusChanged = prev === null
        || JSON.stringify([prev.branch, prev.staged, prev.unstaged, prev.untracked, prev.conflicts])
        !== JSON.stringify([state.scm.gitStatus.branch, state.scm.gitStatus.staged, state.scm.gitStatus.unstaged, state.scm.gitStatus.untracked, state.scm.gitStatus.conflicts]);

      // Detect a HEAD change (external commit or checkout) and reload the commit
      // history so a command-line git commit shows up without a manual refresh.
      const head = typeof state.scm.gitStatus.head === "string" ? state.scm.gitStatus.head : "";
      if (head && head !== state.scm.lastHeadHash) {
        state.scm.lastHeadHash = head;
        if (hadStatus && state.currentTab === "scm") deps.loadRecentCommits(deps);
      }

      // Update the sync counter (↑ahead ↓behind) in place when
      // it changed — e.g. after a command-line git commit —
      // without rebuilding the repository section.
      if (hadStatus && state.activeEl && (prev?.ahead !== state.scm.gitStatus.ahead || prev?.behind !== state.scm.gitStatus.behind)) {
        const repoCount = state.activeEl.querySelector('.sol-exp-scm-section[data-section="repository"] .sol-exp-scm-section-count');
        if (repoCount) {
          const a = state.scm.gitStatus.ahead || 0;
          const b = state.scm.gitStatus.behind || 0;
          repoCount.textContent = (a > 0 || b > 0) ? `↑${a} ↓${b}` : "";
        }
      }

    }

  } catch {}

  // First load renders the panel; later loads update only
  // the SCM region and the badge, leaving the tree alone.
  if (!hadStatus) render();

  else if (state.scm.gitStatusChanged && state.activeEl) {

    const scmHost = state.activeEl.querySelector("[data-sol-exp-scm-host]");

    if (scmHost && state.currentTab === "scm") {

      // Update only the change-list half; the repository
      // half (commits list, scroll state) stays untouched.
      // Compare before writing so an unchanged region is
      // never repainted, even if the change flag jitters.
      const scmTop = scmHost.querySelector(".sol-exp-scm-top");

      if (scmTop) {

        const html = buildSCMTopHTML(state.scm);

        if (scmTop.innerHTML !== html) {

          console.log("[sol-exp] rebuild scm top", Date.now());

          scmTop.innerHTML = html;

        }

      }

    }

    const badge = state.activeEl.querySelector(".sol-exp-activity-badge");

    if (badge) {

      if (state.scm.gitChangesCount > 0) badge.textContent = String(state.scm.gitChangesCount);

      else badge.remove();

    }

  }

  if (!hadStatus && state.scm.gitStatus && state.scm.gitStatus.branch !== "unknown") deps.loadRecentCommits(deps);

}

export async function doStage(files: string[], deps: ActionsDeps) {
  const { state } = deps;
  if (!state.root) return;
  await fetch("/solution-explorer/git-stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      root: gitRoot(state),
      files
    })
  });
  await loadGitStatus(deps);
}

export async function doUnstage(files: string[], deps: ActionsDeps) {
  const { state } = deps;
  if (!state.root) return;
  await fetch("/solution-explorer/git-unstage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      root: gitRoot(state),
      files
    })
  });
  await loadGitStatus(deps);
}

export async function doDiscard(files: string[], deps: ActionsDeps) {
  const { state } = deps;
  if (!state.root) return;
  await fetch("/solution-explorer/git-discard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      root: gitRoot(state),
      files
    })
  });
  await loadGitStatus(deps);
  await loadTree(deps);
}

export async function doCommit(deps: ActionsDeps) {
  const { state, render } = deps;
  if (!state.root || !state.scm.commitMessage.trim()) return;
  state.scm.committing = true;
  render();
  try {
    const result = await (await fetch("/solution-explorer/git-commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        root: gitRoot(state),
        message: state.scm.commitMessage.trim()
      })
    })).json();
    if (result.ok) {
      state.scm.commitMessage = "";
      await loadGitStatus(deps);
      await loadTree(deps);
    } else showToast(t("scm.commitFailed") + ": " + (result.error?.message || ""), true);
  } catch (err) {
    showToast(t("scm.commitFailed") + ": " + err.message, true);
  }
  state.scm.committing = false;
  render();
  console.log("[sol-exp] doCommit -> loadRecentCommits", Date.now());
  await deps.loadRecentCommits(deps);
}
