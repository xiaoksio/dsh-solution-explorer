/**
 * SCM panel bridges (window.__solExp*) — SCM domain.
 * Registered via registerScmBridges(deps); deps injected from panel.ts.
 * @module dsh-solution-explorer/client/scm/bridges
 */

import { t } from "../locales.ts"

import { escapeHtml } from "../shared/dom.ts"

import { showToast, showConfirm, showPrompt } from "../shared/ui.ts"

import { gitRoot, type AppState } from "../state/store.ts"

import { buildSCMTopHTML } from "./scm-view.ts"

import type { ActionsDeps } from "./actions.ts"

import type { HistoryDeps } from "./history.ts"

import type { BranchesDeps } from "./branches.ts"

export interface ScmBridgesDeps {
  state: AppState
  render: () => void
  actionsDeps: ActionsDeps
  historyDeps: HistoryDeps
  branchesDeps: BranchesDeps
  loadGitStatus: (d: ActionsDeps) => Promise<void>
  loadRepos: (d: ActionsDeps) => Promise<void>
  loadRecentCommits: (d: HistoryDeps) => Promise<void>
  loadRemotes: (d: BranchesDeps) => Promise<void>
  loadBranches: (d: BranchesDeps) => Promise<void>
  loadTags: (d: BranchesDeps) => Promise<void>
  loadCommitsPage: (d: HistoryDeps) => Promise<void>
  getCommitDetail: (hash: string, d: HistoryDeps) => Promise<any>
  ensureCommitDetailInline: (hash: string, c: any) => void
  hideCommitTooltip: (d: HistoryDeps) => void
  doStage: (files: string[], d: ActionsDeps) => Promise<void>
  doUnstage: (files: string[], d: ActionsDeps) => Promise<void>
  doDiscard: (files: string[], d: ActionsDeps) => Promise<void>
  doCommit: (d: ActionsDeps) => Promise<void>
}

export function registerScmBridges(deps: ScmBridgesDeps): () => void {
  const { state } = deps
  const render = deps.render

  window.__solExpSelectRepo = (path) => {
    if (!path || path === state.scm.activeRepo) return;
    state.scm.activeRepo = path;
    state.commits.commitDetailCache.clear();
    state.commits.remotesResolved = false;
    deps.loadGitStatus(deps.actionsDeps);
    deps.loadRecentCommits(deps.historyDeps);
    // Update the repository selection highlight and the change
    // list in place (loadGitStatus no longer re-renders).
    if (state.activeEl && state.currentTab === "scm") {
      state.activeEl.querySelectorAll(".sol-exp-repo-item").forEach((el) => {
        el.classList.toggle("active", el.getAttribute("data-repo-path") === path);
      });
      const scmTop = state.activeEl.querySelector(".sol-exp-scm-top");
      if (scmTop) scmTop.innerHTML = buildSCMTopHTML(state.scm);
    }
  };

  window.__solExpCommitDetail = async (hash) => {
    deps.hideCommitTooltip(deps.historyDeps);
    if (!hash) return;
    state.commits.graphDetailOpen = state.commits.graphDetailOpen === hash ? "" : hash;
    const rows = document.querySelectorAll(".sol-exp-commit-item");
    rows.forEach((r) => r.classList.toggle("selected", r.getAttribute("data-hash") === state.commits.graphDetailOpen));
    if (!state.commits.graphDetailOpen) { deps.ensureCommitDetailInline("", null); return; }
    deps.ensureCommitDetailInline(hash, null);
    try {
      const c = await deps.getCommitDetail(hash, deps.historyDeps);
      if (state.commits.graphDetailOpen === hash) deps.ensureCommitDetailInline(hash, c);
    } catch (err) {
      if (state.commits.graphDetailOpen === hash) {
        const list = document.getElementById("sol-exp-commits-list");
        const block = list?.querySelector(".sol-exp-commit-detail-inline");
        if (block) block.innerHTML = `<div style="color:var(--dsw-color-error,#f48771)">${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`;
      }
    }
  };

  window.__solExpCommitCheckout = async (hash) => {
    if (!hash) return;
    const zh = document.documentElement.lang?.startsWith("zh");
    const ok = await showConfirm({ title: "Checkout", okText: "Checkout", message: zh ? `Checkout 到 ${hash.substring(0, 8)}？\n注意：将进入 detached HEAD 状态（不在任何分支上）。` : `Checkout ${hash.substring(0, 8)}?\nNote: this enters a detached HEAD state.` });
    if (!ok) return;
    const result = await (await fetch("/solution-explorer/git-branch-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name: hash }) })).json();
    if (!result.ok) showToast(result.error?.message || "切换失败", true);
    else { await deps.loadGitStatus(deps.actionsDeps); await deps.loadRecentCommits(deps.historyDeps); }
  };

  window.__solExpGitInit = async () => {
    if (!(await showConfirm({ title: t("scm.init.button"), message: t("scm.init.confirm"), okText: t("scm.init.button") }))) return;
    const result = await (await fetch("/solution-explorer/git-init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state) }) })).json();
    if (!result.ok) showToast(result.error?.message || "初始化失败", true);
    else { await deps.loadRepos(deps.actionsDeps); await deps.loadGitStatus(deps.actionsDeps); window.__solExpRefresh(); }
  };
  window.__solExpFetch = async () => {
    const result = await (await fetch("/solution-explorer/git-fetch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state) }) })).json();
    if (!result.ok) showToast(result.error?.message || "抓取失败", true);
    else {
      await deps.loadGitStatus(deps.actionsDeps); await deps.loadBranches(deps.branchesDeps);
      const out = (result.value || "").trim();
      showToast(out ? t("scm.sync.fetch") + ":\n" + out : t("scm.sync.upToDate"));
    }
  };
  window.__solExpPull = async () => {
    if (!(await showConfirm({ title: t("scm.sync.pull"), message: t("scm.sync.pullConfirm"), okText: t("scm.sync.pull") }))) return;
    const result = await (await fetch("/solution-explorer/git-pull", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state) }) })).json();
    if (!result.ok) showToast(result.error?.message || "拉取失败", true);
    else {
      await deps.loadGitStatus(deps.actionsDeps); await deps.loadRecentCommits(deps.historyDeps);
      const out = (result.value || "").trim();
      showToast(out ? t("scm.sync.pull") + ":\n" + out : t("scm.sync.upToDate"));
    }
  };
  window.__solExpPush = async () => {
    if (!(await showConfirm({ title: t("scm.sync.push"), message: t("scm.sync.pushConfirm"), okText: t("scm.sync.push") }))) return;
    const result = await (await fetch("/solution-explorer/git-push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state) }) })).json();
    if (!result.ok) showToast(result.error?.message || "推送失败", true);
    else {
      await deps.loadGitStatus(deps.actionsDeps);
      const out = (result.value || "").trim();
      showToast(out ? t("scm.sync.push") + ":\n" + out : t("scm.sync.done"));
    }
  };
  window.__solExpSync = async () => {
    if (!(await showConfirm({ title: t("scm.sync.sync"), message: t("scm.sync.syncConfirm"), okText: t("scm.sync.sync") }))) return;
    const result = await (await fetch("/solution-explorer/git-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state) }) })).json();
    if (!result.ok) showToast(result.error?.message || "同步失败", true);
    else {
      await deps.loadGitStatus(deps.actionsDeps); await deps.loadRecentCommits(deps.historyDeps);
      const out = (result.value || "").trim();
      showToast(out ? t("scm.sync.sync") + ":\n" + out : t("scm.sync.done"));
    }
  };
  window.__solExpRemotePanel = async () => { state.scm.remotePanelOpen = !state.scm.remotePanelOpen; if (state.scm.remotePanelOpen) await deps.loadRemotes(deps.branchesDeps); render(); };
  window.__solExpRemoteName = (v) => { state.scm.remoteName = v; };
  window.__solExpRemoteUrl = (v) => { state.scm.remoteUrl = v; };
  window.__solExpRemoteAdd = async () => {
    if (!state.scm.remoteName.trim() || !state.scm.remoteUrl.trim()) return;
    const result = await (await fetch("/solution-explorer/git-remote-add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name: state.scm.remoteName.trim(), url: state.scm.remoteUrl.trim() }) })).json();
    if (!result.ok) showToast(result.error?.message || "添加远程失败", true);
    else { state.scm.remoteName = ""; state.scm.remoteUrl = ""; await deps.loadRemotes(deps.branchesDeps); render(); }
  };
  window.__solExpRemoteRemove = async (name) => {
    if (!(await showConfirm({ title: t("scm.remote.title"), message: t("scm.remote.removeConfirm").replace("{name}", name), okText: t("scm.remote.remove"), danger: true }))) return;
    const result = await (await fetch("/solution-explorer/git-remote-remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name }) })).json();
    if (!result.ok) showToast(result.error?.message || "删除远程失败", true); else { await deps.loadRemotes(deps.branchesDeps); render(); }
  };
  window.__solExpRemoteSetUrl = async (name) => {
    const url = await showPrompt({ title: t("scm.remote.title"), message: "新的 URL（" + name + "）", placeholder: "https://… 或 git@…" });
    if (!url || !url.trim()) return;
    const result = await (await fetch("/solution-explorer/git-remote-set-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name, url: url.trim() }) })).json();
    if (!result.ok) showToast(result.error?.message || "修改地址失败", true); else await deps.loadRemotes(deps.branchesDeps);
  };
  window.__solExpBranchPanel = async () => { state.scm.branchPanelOpen = !state.scm.branchPanelOpen; if (state.scm.branchPanelOpen) { await deps.loadBranches(deps.branchesDeps); await deps.loadTags(deps.branchesDeps); } render(); };
  window.__solExpBranchName = (v) => { state.scm.branchName = v; };
  window.__solExpBranchFrom = (v) => { state.scm.branchFrom = v; };
  window.__solExpBranchCreate = async () => {
    if (!state.scm.branchName.trim()) return;
    const body: { root: string; name: string; from?: string } = { root: gitRoot(state), name: state.scm.branchName.trim() };
    if (state.scm.branchFrom.trim()) body.from = state.scm.branchFrom.trim();
    const result = await (await fetch("/solution-explorer/git-branch-create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
    if (!result.ok) showToast(result.error?.message || "创建分支失败", true);
    else { state.scm.branchName = ""; state.scm.branchFrom = ""; await deps.loadBranches(deps.branchesDeps); render(); }
  };
  window.__solExpBranchCheckout = async (name, isRemote) => {
    const result = await (await fetch("/solution-explorer/git-branch-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name, track: isRemote === true }) })).json();
    if (!result.ok) showToast(result.error?.message || "切换失败", true);
    else {
      // Order matters: update state, rebuild the DOM, then load commits into the
      // fresh list node — loading before render() lets render wipe the result
      // and leave the history stuck on "Loading…".
      await deps.loadGitStatus(deps.actionsDeps);
      await deps.loadBranches(deps.branchesDeps);
      render();
      await deps.loadRecentCommits(deps.historyDeps);
    }
  };
  window.__solExpBranchDelete = async (name) => {
    if (!(await showConfirm({ title: t("scm.branch.title"), message: t("scm.branch.deleteConfirm").replace("{name}", name), okText: t("scm.branch.delete"), danger: true }))) return;
    let result = await (await fetch("/solution-explorer/git-branch-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name }) })).json();
    // Safe delete (-d) refuses unmerged branches — offer a forced delete (-D).
    if (!result.ok && String(result.error?.message || "").includes("not fully merged")) {
      const zh = document.documentElement.lang?.startsWith("zh");
      const ok = await showConfirm({ title: t("scm.branch.title"), message: zh ? "该分支有未合并的提交，确定强制删除？此操作不可撤销。" : "This branch has unmerged commits. Force delete? This cannot be undone.", okText: zh ? "强制删除" : "Force delete", danger: true });
      if (!ok) return;
      result = await (await fetch("/solution-explorer/git-branch-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name, force: true }) })).json();
    }
    if (!result.ok) showToast(result.error?.message || "删除失败", true); else { await deps.loadBranches(deps.branchesDeps); render(); }
  };
  window.__solExpBranchRename = async (name) => {
    const newName = await showPrompt({ title: t("scm.branch.title"), message: t("scm.branch.newName") + " (" + name + ")", placeholder: name });
    if (!newName || !newName.trim()) return;
    const result = await (await fetch("/solution-explorer/git-branch-rename", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), oldName: name, newName: newName.trim() }) })).json();
    if (!result.ok) showToast(result.error?.message || "重命名失败", true); else { await deps.loadBranches(deps.branchesDeps); render(); }
  };
  window.__solExpBranchMerge = async (name) => {
    if (!(await showConfirm({ title: t("scm.branch.title"), message: t("scm.branch.mergeConfirm").replace("{name}", name), okText: t("scm.branch.merge") }))) return;
    const result = await (await fetch("/solution-explorer/git-branch-merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name }) })).json();
    if (!result.ok) showToast(result.error?.message || "合并失败", true); else { await deps.loadGitStatus(deps.actionsDeps); await deps.loadRecentCommits(deps.historyDeps); }
  };
  window.__solExpBranchPublish = async (name) => {
    if (!(await showConfirm({ title: t("scm.branch.title"), message: t("scm.branch.publishConfirm").replace("{name}", name), okText: t("scm.branch.publish") }))) return;
    const result = await (await fetch("/solution-explorer/git-branch-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: gitRoot(state), name }) })).json();
    if (!result.ok) showToast(result.error?.message || "发布失败", true); else await deps.loadBranches(deps.branchesDeps);
  };

  window.__solExpCommitsScroll = (evt) => {
    const el = evt.target as HTMLElement;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      deps.loadCommitsPage(deps.historyDeps);
    }
  };

  window.__solExpRefreshSCM = () => {
    // Silent refresh: re-render only the SCM region, no flash.
    deps.loadGitStatus(deps.actionsDeps);
    deps.loadRecentCommits(deps.historyDeps);
  };

  window.__solExpCommitMsg = (msg) => {
    state.scm.commitMessage = msg;
    // Toggle the commit button in place: a full render() resets the
    // async-loaded commit history and the textarea caret on every keystroke.
    document.querySelectorAll(".sol-exp-commit-btn").forEach((btn) => {
      if (state.scm.committing || !state.scm.commitMessage.trim()) btn.setAttribute("disabled", "disabled");
      else btn.removeAttribute("disabled");
    });
  };

  window.__solExpGenCommitMsg = async () => {
    if (state.scm.aiGenerating) return;
    state.scm.aiGenerating = true;
    render();
    try {
      const result = await (await fetch("/solution-explorer/llm-generate-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root: gitRoot(state) }),
      })).json();
      if (!result.ok) {
        showToast(result.error?.message || t("scm.ai.failed") + "unknown", true);
        return;
      }
      state.scm.commitMessage = result.value;
      render();
      // Re-enable the commit button after filling the message in place.
      document.querySelectorAll(".sol-exp-commit-btn").forEach((btn) => {
        if (state.scm.committing || !state.scm.commitMessage.trim()) btn.setAttribute("disabled", "disabled");
        else btn.removeAttribute("disabled");
      });
    } catch (err) {
      showToast(t("scm.ai.failed") + (err instanceof Error ? err.message : String(err)), true);
    } finally {
      state.scm.aiGenerating = false;
      render();
    }
  };

  window.__solExpCommit = () => {
    deps.doCommit(deps.actionsDeps);
  };

  window.__solExpStage = (files) => {
    deps.doStage(files, deps.actionsDeps);
  };

  window.__solExpUnstage = (files) => {
    deps.doUnstage(files, deps.actionsDeps);
  };

  window.__solExpDiscard = (files) => {
    deps.doDiscard(files, deps.actionsDeps);
  };

  window.__solExpStageAll = () => {
    const all = [...state.scm.gitStatus?.unstaged || [], ...state.scm.gitStatus?.untracked || []].map((i) => i.path);
    if (all.length) deps.doStage(all, deps.actionsDeps);
  };

  window.__solExpUnstageAll = () => {
    const all = (state.scm.gitStatus?.staged || []).map((i) => i.path);
    if (all.length) deps.doUnstage(all, deps.actionsDeps);
  };

  window.__solExpDiscardAll = async () => {
    const all = [...state.scm.gitStatus?.unstaged || [], ...state.scm.gitStatus?.untracked || []].map((i) => i.path);
    if (all.length && (await showConfirm({ title: t("scm.changes"), message: t("scm.discardAllConfirm"), okText: document.documentElement.lang?.startsWith("zh") ? "放弃" : "Discard", danger: true }))) deps.doDiscard(all, deps.actionsDeps);
  };

  window.__solExpToggleSection = (id) => {
    // Query inside the active panel: a global query could hit a
    // stale or duplicate SCM region after session/repo switches,
    // leaving the visible section stuck open.
    const scope = state.activeEl ?? document;
    const el = scope.querySelector(`[data-section="${id}"]`);
    if (el) {
      if (el.classList.contains("collapsed")) {
        el.classList.remove("collapsed");
        state.scm.collapsedSections.delete(id);
      } else {
        el.classList.add("collapsed");
        state.scm.collapsedSections.add(id);
      }
    }
  };

  return () => {
    delete window.__solExpSelectRepo;
    delete window.__solExpCommitDetail;
    delete window.__solExpCommitCheckout;
    delete window.__solExpGitInit;
    delete window.__solExpFetch;
    delete window.__solExpPull;
    delete window.__solExpPush;
    delete window.__solExpSync;
    delete window.__solExpRemotePanel;
    delete window.__solExpRemoteName;
    delete window.__solExpRemoteUrl;
    delete window.__solExpRemoteAdd;
    delete window.__solExpRemoteRemove;
    delete window.__solExpRemoteSetUrl;
    delete window.__solExpBranchPanel;
    delete window.__solExpBranchName;
    delete window.__solExpBranchFrom;
    delete window.__solExpBranchCreate;
    delete window.__solExpBranchCheckout;
    delete window.__solExpBranchDelete;
    delete window.__solExpBranchRename;
    delete window.__solExpBranchMerge;
    delete window.__solExpBranchPublish;
    delete window.__solExpCommitsScroll;
    delete window.__solExpRefreshSCM;
    delete window.__solExpCommitMsg;
    delete window.__solExpGenCommitMsg;
    delete window.__solExpCommit;
    delete window.__solExpStage;
    delete window.__solExpUnstage;
    delete window.__solExpDiscard;
    delete window.__solExpStageAll;
    delete window.__solExpUnstageAll;
    delete window.__solExpDiscardAll;
    delete window.__solExpToggleSection;
  };
}
