/**
 * SCM panel view builders — SCM domain. Pure functions over state slices.
 * @module dsh-solution-explorer/client/scm/scm-view
 */

import { t } from "../locales.ts"

import { escapeHtml } from "../shared/dom.ts"

import { folderIcon, fileIcon, isImageFile } from "../explorer/icons.ts"

import type { ScmState, CommitState } from "../state/store.ts"

import { commitsListHTML } from "./graph.ts"

export function buildSCMTopHTML(scm: ScmState) {

					const status = scm.gitStatus;

					const staged = status?.staged || [];

					const unstaged = status?.unstaged || [];

					const untracked = status?.untracked || [];

					const allChanges = [...unstaged, ...untracked];

					const conflicts = status?.conflicts || [];

					let topHTML = "";

					if (conflicts.length > 0) topHTML += `

        <div class="sol-exp-scm-section${scm.collapsedSections.has("conflicts") ? " collapsed" : ""}" data-section="conflicts">

          <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('conflicts')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.merge.changes")}<span class="sol-exp-scm-header-actions"></span><span class="sol-exp-scm-section-count">${conflicts.length}</span></div>

          ${conflicts.map((item) => buildSCMItem(item, "conflicts")).join("")}

        </div>

      `;

					topHTML += `

        <div class="sol-exp-commit-box">

          <textarea class="sol-exp-commit-input" placeholder="${t("scm.commit.placeholder")}${status?.branch && status?.branch !== "unknown" ? " (" + status.branch + ")" : ""}" oninput="window.__solExpCommitMsg(this.value)">${escapeHtml(scm.commitMessage)}</textarea>

          <div class="sol-exp-commit-row">

            <button class="sol-exp-commit-btn" onclick="window.__solExpCommit()" ${scm.committing || !scm.commitMessage.trim() ? "disabled" : ""}>${scm.committing ? t("scm.committing") : t("scm.commit.button")}</button>

            <button class="sol-exp-ai-btn" title="${t("scm.ai.gen")}" onclick="window.__solExpGenCommitMsg()" ${scm.aiGenerating || !(scm.gitStatus?.staged?.length) ? "disabled" : ""}><svg class="${scm.aiGenerating ? "sol-exp-ai-spin" : ""}" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5 9.2 6.4l3.3.4-2.5 2.3.8 3.4L8 10.9 5.2 12.5l.8-3.4L3.5 6.8l3.3-.4z"/><path d="M13 1.5l.4 1.1L14.5 3l-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z"/><path d="M3 11.5l.3.7.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3z"/></svg></button>

          </div>

        </div>

      `;

					topHTML += `

        <div class="sol-exp-scm-section${scm.collapsedSections.has("changes") ? " collapsed" : ""}" data-section="changes">

          <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('changes')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.changes")}<span class="sol-exp-scm-header-actions">

            <button class="sol-exp-hdr-btn" title="${t("scm.refresh")}" onclick="event.stopPropagation();window.__solExpRefreshSCM()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89"/><path d="M13.5 3.5V7H10"/></svg></button>

            ${allChanges.length > 0 ? `<button class="sol-exp-hdr-btn" title="${t("scm.stageAll")}" onclick="event.stopPropagation();window.__solExpStageAll()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 2v12M2 8h12"/></svg></button>` : ""}

            ${allChanges.length > 0 ? `<button class="sol-exp-hdr-btn danger" title="${t("scm.discardAll")}" onclick="event.stopPropagation();window.__solExpDiscardAll()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg></button>` : ""}

          </span><span class="sol-exp-scm-section-count">${allChanges.length}</span></div>

          ${allChanges.length === 0 ? `<div style="padding:4px 12px 8px 24px;font-size:12px;color:var(--dsw-alias-label-tertiary,#6e6e6e)">${t("scm.changes.none")}</div>` : ""}

          ${allChanges.map((item) => buildSCMItem(item, "changes")).join("")}

        </div>

      `;

					if (staged.length > 0) topHTML += `

          <div class="sol-exp-scm-section${scm.collapsedSections.has("staged") ? " collapsed" : ""}" data-section="staged">

            <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('staged')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.staged")}<span class="sol-exp-scm-header-actions">

              <button class="sol-exp-hdr-btn" title="${t("scm.unstageAll")}" onclick="event.stopPropagation();window.__solExpUnstageAll()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14V3M3.5 7.5L8 3l4.5 4.5"/></svg></button>

            </span><span class="sol-exp-scm-section-count">${staged.length}</span></div>

            ${staged.map((item) => buildSCMItem(item, "staged")).join("")}

          </div>

        `;

					return topHTML;

				}

export function buildSCMContent(scm: ScmState, commits: CommitState, root: string) {

					if (!root) return `<div class="sol-exp-content"><div class="sol-exp-empty">${t("panel.empty")}</div></div>`;

					const status = scm.gitStatus;

					const isRepo = status && status.branch !== "unknown";

					const staged = status?.staged || [];

					const unstaged = status?.unstaged || [];

					const untracked = status?.untracked || [];

					const allChanges = [...unstaged, ...untracked];

					if (!isRepo) return `<div class="sol-exp-content"><div class="sol-exp-empty">${t("scm.notRepo")}</div><div style="padding:12px;text-align:center"><button class="sol-exp-commit-btn" style="width:auto;padding:6px 16px" onclick="window.__solExpGitInit()">${t("scm.init.button")}</button></div></div>`;

					let topHTML = "";
					let bottomHTML = "";

					const conflicts = status?.conflicts || [];

					if (conflicts.length > 0) topHTML += `

        <div class="sol-exp-scm-section${scm.collapsedSections.has("conflicts") ? " collapsed" : ""}" data-section="conflicts">

          <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('conflicts')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.merge.changes")}<span class="sol-exp-scm-header-actions"></span><span class="sol-exp-scm-section-count">${conflicts.length}</span></div>

          ${conflicts.map((item) => buildSCMItem(item, "conflicts")).join("")}

        </div>

      `;

					topHTML += `

        <div class="sol-exp-commit-box">

          <textarea class="sol-exp-commit-input" placeholder="${t("scm.commit.placeholder")}${status?.branch && status.branch !== "unknown" ? " (" + status.branch + ")" : ""}" oninput="window.__solExpCommitMsg(this.value)">${escapeHtml(scm.commitMessage)}</textarea>

          <div class="sol-exp-commit-row">

            <button class="sol-exp-commit-btn" onclick="window.__solExpCommit()" ${scm.committing || !scm.commitMessage.trim() ? "disabled" : ""}>${scm.committing ? t("scm.committing") : t("scm.commit.button")}</button>

            <button class="sol-exp-ai-btn" title="${t("scm.ai.gen")}" onclick="window.__solExpGenCommitMsg()" ${scm.aiGenerating || !(scm.gitStatus?.staged?.length) ? "disabled" : ""}><svg class="${scm.aiGenerating ? "sol-exp-ai-spin" : ""}" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5 9.2 6.4l3.3.4-2.5 2.3.8 3.4L8 10.9 5.2 12.5l.8-3.4L3.5 6.8l3.3-.4z"/><path d="M13 1.5l.4 1.1L14.5 3l-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z"/><path d="M3 11.5l.3.7.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3z"/></svg></button>

          </div>



        </div>

      `;

					topHTML += `

        <div class="sol-exp-scm-section${scm.collapsedSections.has("changes") ? " collapsed" : ""}" data-section="changes">

          <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('changes')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.changes")}<span class="sol-exp-scm-header-actions">

            <button class="sol-exp-hdr-btn" title="${t("scm.refresh")}" onclick="event.stopPropagation();window.__solExpRefreshSCM()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89"/><path d="M13.5 3.5V7H10"/></svg></button>

            ${allChanges.length > 0 ? `<button class="sol-exp-hdr-btn" title="${t("scm.stageAll")}" onclick="event.stopPropagation();window.__solExpStageAll()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 2v12M2 8h12"/></svg></button>` : ""}

            ${allChanges.length > 0 ? `<button class="sol-exp-hdr-btn danger" title="${t("scm.discardAll")}" onclick="event.stopPropagation();window.__solExpDiscardAll()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg></button>` : ""}

          </span><span class="sol-exp-scm-section-count">${allChanges.length}</span></div>

          ${allChanges.length === 0 ? `<div style="padding:4px 12px 8px 24px;font-size:12px;color:var(--dsw-alias-label-tertiary,#6e6e6e)">${t("scm.changes.none")}</div>` : ""}

          ${allChanges.map((item) => buildSCMItem(item, "changes")).join("")}

        </div>

      `;

					if (staged.length > 0) topHTML += `

          <div class="sol-exp-scm-section${scm.collapsedSections.has("staged") ? " collapsed" : ""}" data-section="staged">

            <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('staged')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.staged")}<span class="sol-exp-scm-header-actions">

              <button class="sol-exp-hdr-btn" title="${t("scm.unstageAll")}" onclick="event.stopPropagation();window.__solExpUnstageAll()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14V3M3.5 7.5L8 3l4.5 4.5"/></svg></button>

            </span><span class="sol-exp-scm-section-count">${staged.length}</span></div>

            ${staged.map((item) => buildSCMItem(item, "staged")).join("")}

          </div>

        `;

					bottomHTML += `

        <div class="sol-exp-scm-section${scm.collapsedSections.has("repository") ? " collapsed" : ""}" data-section="repository">

          <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('repository')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.repository")}<span class="sol-exp-scm-header-actions">
            <button class="sol-exp-hdr-btn" title="${t("scm.sync.fetch")}" onclick="event.stopPropagation();window.__solExpFetch()"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v10M4 8l4 4 4-4"/></svg></button>
            <button class="sol-exp-hdr-btn" title="${t("scm.sync.pull")}" onclick="event.stopPropagation();window.__solExpPull()"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v10M4 8l4 4 4-4"/><path d="M2 14h12"/></svg></button>
            <button class="sol-exp-hdr-btn" title="${t("scm.sync.push")}" onclick="event.stopPropagation();window.__solExpPush()"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12V2M4 6l4-4 4 4"/></svg></button>
            <button class="sol-exp-hdr-btn" title="${t("scm.sync.sync")}" onclick="event.stopPropagation();window.__solExpSync()"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8a6 6 0 0 1 10.47-4.02L14 5.5M14 8a6 6 0 0 1-10.47 4.02L2 10.5"/></svg></button>
          </span><span class="sol-exp-scm-section-count">${(status?.ahead || 0) > 0 || (status?.behind || 0) > 0 ? `↑${status?.ahead || 0} ↓${status?.behind || 0}` : ""}</span></div>

          <div style="padding:4px 12px 8px 24px;display:flex;flex-direction:column">

            ${scm.repos.map((r) => `<div class="sol-exp-repo-item ${scm.activeRepo === r.path ? "active" : ""}" data-repo-path="${r.path.replace(/"/g, "&quot;")}" onclick="window.__solExpSelectRepo('${r.path.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')"><span class="sol-exp-repo-icon">⑂</span><span class="sol-exp-repo-name">${r.name}</span><span class="sol-exp-repo-branch">${r.branch}</span><span class="sol-exp-hdr-btn" title="${t("scm.remote.title")}" onclick="event.stopPropagation();window.__solExpRemotePanel()"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M6.5 9.5a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24l-1 1"/><path d="M9.5 6.5a3 3 0 0 0-4.24 0l-2 2a3 3 0 0 0 4.24 4.24l1-1"/></svg></button></span><span class="sol-exp-hdr-btn" title="${t("scm.branch.title")}" onclick="event.stopPropagation();window.__solExpBranchPanel()"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="3.5" r="1.5"/><circle cx="5" cy="12.5" r="1.5"/><circle cx="11.5" cy="7" r="1.5"/><path d="M5 5v5.5M11.5 8.5c0 2.2-1.3 3-4.2 3"/></svg></button></span></div>`).join("")}<div style="font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:6px">${t("scm.repository.branch")}</div><span class="sol-exp-branch-pill">⑂ ${status?.branch || ""}</span>

            ${scm.remotePanelOpen ? `<div style="margin:6px 0;padding:8px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:6px;font-size:12px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>${t("scm.remote.title")}</b><span style="flex:1"></span><button class="sol-exp-commit-detail-close" onclick="window.__solExpRemotePanel()">✕</button></div>${scm.remotesList.length === 0 ? `<div style="color:var(--dsw-alias-label-tertiary,#6e6e6e);padding:2px 0 6px">${t("scm.remote.none")}</div>` : scm.remotesList.map((r) => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="flex:none;font-weight:600">${escapeHtml(r.name)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#969696)">${escapeHtml(r.url)}</span><button class="sol-exp-commit-detail-btn" onclick="window.__solExpRemoteSetUrl('${r.name.replace(/'/g, "\\'")}')">${t("scm.remote.setUrl")}</button><button class="sol-exp-commit-detail-btn" onclick="window.__solExpRemoteRemove('${r.name.replace(/'/g, "\\'")}')">${t("scm.remote.remove")}</button></div>`).join("")}<div style="display:flex;gap:6px;margin-top:8px"><input class="sol-exp-commit-input" style="min-height:0;height:26px;flex:1" placeholder="${t("scm.remote.name")}" value="${escapeHtml(scm.remoteName)}" oninput="window.__solExpRemoteName(this.value)"/><input class="sol-exp-commit-input" style="min-height:0;height:26px;flex:2" placeholder="${t("scm.remote.url")} (https://… 或 git@…)" value="${escapeHtml(scm.remoteUrl)}" oninput="window.__solExpRemoteUrl(this.value)"/><button class="sol-exp-commit-detail-btn" onclick="window.__solExpRemoteAdd()">${t("scm.remote.addBtn")}</button></div></div>` : ""}

            ${scm.branchPanelOpen ? `<div style="margin:6px 0;padding:8px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:6px;font-size:12px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b>${t("scm.branch.title")}</b><span style="flex:1"></span><button class="sol-exp-commit-detail-close" onclick="window.__solExpBranchPanel()">✕</button></div><div style="color:var(--dsw-alias-label-tertiary,#6e6e6e);margin:2px 0">${t("scm.branch.local")}</div>${scm.branchesList.filter((b) => !b.isRemote).map((b) => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer" onclick="window.__solExpBranchCheckout('${b.name.replace(/'/g, "\\'")}')"><span style="flex:none;width:14px">${b.current ? "➤" : ""}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${b.current ? "font-weight:600;color:var(--dsw-alias-label-primary)" : ""}">${escapeHtml(b.name)}</span><span style="flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#6e6e6e);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.shortHash ? b.shortHash + " " : ""}${escapeHtml((b.subject || "").substring(0, 24))}</span>${b.upstream ? `<span style="flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#6e6e6e)">${escapeHtml(b.upstream)}</span>` : ""}<button class="sol-exp-commit-detail-btn" style="padding:1px 5px" title="${t("scm.branch.rename")}" onclick="event.stopPropagation();window.__solExpBranchRename('${b.name.replace(/'/g, "\\'")}')">✎</button>${!b.current ? `<button class="sol-exp-commit-detail-btn" style="padding:1px 5px" title="${t("scm.branch.merge")}" onclick="event.stopPropagation();window.__solExpBranchMerge('${b.name.replace(/'/g, "\\'")}')">⤵</button><button class="sol-exp-commit-detail-btn" style="padding:1px 5px" title="${t("scm.branch.publish")}" onclick="event.stopPropagation();window.__solExpBranchPublish('${b.name.replace(/'/g, "\\'")}')">↑</button><button class="sol-exp-commit-detail-btn" style="padding:1px 5px" title="${t("scm.branch.delete")}" onclick="event.stopPropagation();window.__solExpBranchDelete('${b.name.replace(/'/g, "\\'")}')">✕</button>` : ""}</div>`).join("")}<div style="color:var(--dsw-alias-label-tertiary,#6e6e6e);margin:4px 0 2px">${t("scm.branch.remote")}</div>${scm.branchesList.filter((b) => b.isRemote).map((b) => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer" onclick="window.__solExpBranchCheckout('${b.name.replace(/'/g, "\\'")}', true)"><span style="flex:none;width:14px"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#969696)">${escapeHtml(b.name)}</span><span style="flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#6e6e6e);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.shortHash ? b.shortHash + " " : ""}${escapeHtml((b.subject || "").substring(0, 24))}</span></div>`).join("")}${scm.tagsList.length > 0 ? `<div style="color:var(--dsw-alias-label-tertiary,#6e6e6e);margin:4px 0 2px">${t("scm.branch.tags")}</div>${scm.tagsList.map((tg) => `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span style="flex:none;width:14px"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#969696)">${escapeHtml(tg.name)}</span><span style="flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#6e6e6e);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tg.commitHash ? escapeHtml((tg.subject || "").substring(0, 24)) : ""}</span></div>`).join("")}` : ""}<div style="display:flex;gap:6px;margin-top:8px"><input class="sol-exp-commit-input" style="min-height:0;height:26px;flex:1" placeholder="${t("scm.branch.name")}" value="${escapeHtml(scm.branchName)}" oninput="window.__solExpBranchName(this.value)"/><input class="sol-exp-commit-input" style="min-height:0;height:26px;flex:1" placeholder="${t("scm.branch.from")}" value="${escapeHtml(scm.branchFrom)}" oninput="window.__solExpBranchFrom(this.value)"/><button class="sol-exp-commit-detail-btn" onclick="window.__solExpBranchCreate()">${t("scm.branch.createBtn")}</button></div></div>` : ""}

          </div>

        </div>

        <div class="sol-exp-scm-section${scm.collapsedSections.has("commits") ? " collapsed" : ""}" data-section="commits">

          <div class="sol-exp-scm-section-header" onclick="window.__solExpToggleSection('commits')"><svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style="transform:rotate(90deg)"><path d="M4.25 2.82782L4.25 11.1722C4.25 11.6622 4.84243 11.9076 5.18891 11.5611L9.36109 7.38891C9.57588 7.17412 9.57588 6.82588 9.36109 6.61109L5.18891 2.43891C4.84243 2.09243 4.25 2.33782 4.25 2.82782Z"/></svg>${t("scm.repository.commits")}<span class="sol-exp-scm-header-actions"></span><span class="sol-exp-scm-section-count"></span></div>

          <div style="padding:4px 12px 8px 24px;flex:1;min-height:0;display:flex;flex-direction:column">

            <div id="sol-exp-commits-list" style="margin-top:6px;font-size:12px;color:var(--dsw-alias-label-tertiary);flex:1;min-height:0;overflow-y:auto" onscroll="window.__solExpCommitsScroll(event)">${commitsListHTML(commits)}</div>

          </div>

        </div>

      `;

					return `<div class="sol-exp-content"><div class="sol-exp-scm-split"><div class="sol-exp-scm-top" style="flex-basis:${scm.scmSplit}%">${topHTML}</div><div class="sol-exp-scm-divider" onpointerdown="window.__solExpScmDividerDown(event)"></div><div class="sol-exp-scm-bottom" style="flex-basis:${100 - scm.scmSplit}%">${bottomHTML}</div></div></div>`;

				}

export function buildSCMItem(item, section) {

					const pathJs = item.path.replace(/'/g, "\\'");

					const action = section === "staged" ? `<button class="sol-exp-scm-action-btn" onclick="event.stopPropagation();window.__solExpUnstage(['${pathJs}'])" title="${t("scm.unstage")}">◦</button>` : section === "conflicts" ? `<button class="sol-exp-scm-action-btn" onclick="event.stopPropagation();window.__solExpStage(['${pathJs}'])" title="标记为已解决">✓</button>` : `<button class="sol-exp-scm-action-btn" onclick="event.stopPropagation();window.__solExpStage(['${pathJs}'])" title="${t("scm.stage")}">+</button>

           <button class="sol-exp-scm-action-btn" onclick="event.stopPropagation();window.__solExpDiscard(['${pathJs}'])" title="${t("scm.discard")}">✕</button>`;

					const staged = section === "staged";

					// A trailing slash marks an untracked directory entry (a folder
					// whose contents are all ignored) — reveal it in the tree.
					const isDir = item.path.endsWith("/") || item.path.endsWith("\\");

					// Images open in the editor's image preview (same as the file
					// tree); everything else opens the diff view.
					const openJs = isDir ? `window.__solExpSelectFile('${pathJs}', true)` : isImageFile(item.path) ? `window.__solExpOpenFile('${pathJs}')` : `window.__solExpOpenDiff('${pathJs}', ${staged})`;

					return `

        <div class="sol-exp-scm-item" title="${t("file.open")}" onclick="${openJs}">

          <span class="sol-exp-file-icon">${isDir ? folderIcon(false) : fileIcon(item.path)}</span>

          <span class="sol-exp-scm-path">${escapeHtml(item.path)}</span>

          <span class="sol-exp-scm-actions">${action}</span>

        </div>

      `;

				}
