import { createElement as h, useEffect, useState } from "react"

import { t } from "../locales.ts"

export function SettingsPage() {

			const [width, setWidth] = useState("280");

			const [autoOpen, setAutoOpen] = useState(true);

			const [patterns, setPatterns] = useState("");

			const [showHidden, setShowHidden] = useState(false);

			const [hideRightbarExpand, setHideRightbarExpand] = useState(false);

			const [termShell, setTermShell] = useState("");

			const [termHeight, setTermHeight] = useState("400");

			const [termTabs, setTermTabs] = useState("8");

			const [termMaxHeight, setTermMaxHeight] = useState("1000");

			const [commitModel, setCommitModel] = useState("");

			const [aiModels, setAiModels] = useState([] as Array<{ provider: string; providerName: string; model: string; name: string }>);

			const [aiModelsOk, setAiModelsOk] = useState(true);

			const [saved, setSaved] = useState(false);

			useEffect(() => {

				let alive = true;

				fetch("/solution-explorer/settings").then((r) => r.json()).then((res) => {

					if (!alive || !res || !res.ok || !res.value) return;

					setWidth(String(res.value.defaultWidth));

					setAutoOpen(!!res.value.autoOpen);

					setPatterns((res.value.filterPatterns || []).join(", "));

					setShowHidden(!!res.value.showHidden);

					setHideRightbarExpand(!!res.value.hideOfficialRightbarExpand);

					setTermShell(typeof res.value.terminalShell === "string" ? res.value.terminalShell : "");

					setTermHeight(String(typeof res.value.terminalHeight === "number" ? res.value.terminalHeight : 400));

					setTermTabs(String(typeof res.value.terminalMaxTabs === "number" ? res.value.terminalMaxTabs : 8));

					setTermMaxHeight(String(typeof res.value.terminalMaxHeight === "number" ? res.value.terminalMaxHeight : 1000));

					setCommitModel(typeof res.value.commitModel === "string" ? res.value.commitModel : "");

				}).catch(() => {});

				fetch("/solution-explorer/llm-models").then((r) => r.json()).then((res) => {

					if (!alive) return;

					if (!res || !res.ok || !Array.isArray(res.value)) { setAiModelsOk(false); setAiModels([]); return; }

					setAiModelsOk(true);

					setAiModels(res.value);

				}).catch(() => { if (alive) { setAiModelsOk(false); setAiModels([]); } });

				return () => { alive = false };

			}, []);

			const save = () => {

				const num = parseInt(width, 10);

				fetch("/solution-explorer/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({

					defaultWidth: Number.isFinite(num) ? Math.min(420, Math.max(264, num)) : 280,

					autoOpen,

					showHidden,

					hideOfficialRightbarExpand: hideRightbarExpand,

					filterPatterns: patterns.split(",").map((s) => s.trim()).filter((s) => s.length > 0),

					terminalShell: termShell.trim(),

					terminalHeight: Math.min(480, Math.max(120, parseInt(termHeight, 10) || 400)),

					terminalMaxHeight: Math.min(1080, Math.max(240, parseInt(termMaxHeight, 10) || 1000)),

					terminalMaxTabs: Math.min(16, Math.max(2, parseInt(termTabs, 10) || 8)),

					commitModel,

				}) }).then((r) => r.json()).then((res) => {

					if (res && res.ok) {
						setSaved(true);
						window.dispatchEvent(new Event("sol-exp-settings-saved"));
					}

				}).catch(() => {});

			};

			const reset = () => { setWidth("280"); setAutoOpen(true); setShowHidden(false); setHideRightbarExpand(false); setPatterns(""); setTermShell(""); setTermHeight("400"); setTermTabs("8"); setTermMaxHeight("1000"); setCommitModel(""); };

			const field = (label, hint, control) => h("div", { className: "sol-set-field" },

				h("div", { className: "sol-set-label" }, label),

				hint ? h("p", { className: "sol-set-hint" }, hint) : null,

				control);

			const card = (title, desc, ...children) => h("div", { className: "sol-set-card" },

				h("div", { className: "sol-set-card-head" },

					h("div", { className: "sol-set-name" }, title),

					h("div", { className: "sol-set-desc" }, desc)),

				h("div", { className: "sol-set-card-body" }, children));

			return h("div", { className: "sol-set-root" },

				h("h2", { className: "sol-set-heading" }, t("settings.explorer")),

				h("p", { className: "sol-set-intro" }, t("settings.intro")),

				card(t("settings.group.appearance"), t("settings.group.appearance.desc"),

					field(t("settings.width.label"), t("settings.width.hint"),

						h("input", { className: "sol-set-input", type: "number", min: 264, max: 420, value: width, onChange: (e) => setWidth(e.target.value) })),

					field(t("settings.autoOpen.label"), t("settings.autoOpen.hint"),

						h("label", { className: "sol-set-sw" },

							h("input", { type: "checkbox", checked: autoOpen, onChange: (e) => setAutoOpen(e.target.checked) }),

							h("span", { className: "sol-set-sw-track" }, h("span", { className: "sol-set-sw-thumb" }))))),

				card(t("settings.group.tree"), t("settings.group.tree.desc"),

					field(t("settings.hidden.label"), t("settings.hidden.hint"),

						h("label", { className: "sol-set-sw" },

							h("input", { type: "checkbox", checked: showHidden, onChange: (e) => setShowHidden(e.target.checked) }),

							h("span", { className: "sol-set-sw-track" }, h("span", { className: "sol-set-sw-thumb" })))),

					field(t("settings.hideOfficialRightbarExpand.label"), t("settings.hideOfficialRightbarExpand.hint"),

						h("label", { className: "sol-set-sw" },

							h("input", { type: "checkbox", checked: hideRightbarExpand, onChange: (e) => setHideRightbarExpand(e.target.checked) }),

							h("span", { className: "sol-set-sw-track" }, h("span", { className: "sol-set-sw-thumb" })))),

					field(t("settings.patterns.label"), t("settings.patterns.hint"),

						h("input", { className: "sol-set-input", type: "text", placeholder: "*.log, temp/", value: patterns, onChange: (e) => setPatterns(e.target.value) }))),

				card(t("settings.group.terminal"), t("settings.group.terminal.desc"),

					field(t("settings.terminal.shell.label"), t("settings.terminal.shell.hint"),

						h("select", { className: "sol-set-input", value: termShell, onChange: (e) => setTermShell((e.target as HTMLSelectElement).value) },

							h("option", { value: "" }, t("settings.terminal.shell.auto")),

							h("option", { value: "pwsh" }, "pwsh"),

							h("option", { value: "powershell" }, "powershell"),

							h("option", { value: "cmd" }, "cmd"),

							h("option", { value: "bash" }, "bash"))),

					field(t("settings.terminal.height.label"), t("settings.terminal.height.hint"),

						h("input", { className: "sol-set-input", type: "number", min: 120, max: 480, value: termHeight, onChange: (e) => setTermHeight(e.target.value) })),

					field(t("settings.terminal.maxHeight.label"), t("settings.terminal.maxHeight.hint"),

						h("input", { className: "sol-set-input", type: "number", min: 240, max: 1080, value: termMaxHeight, onChange: (e) => setTermMaxHeight(e.target.value) })),

					field(t("settings.terminal.tabs.label"), t("settings.terminal.tabs.hint"),

						h("input", { className: "sol-set-input", type: "number", min: 2, max: 16, value: termTabs, onChange: (e) => setTermTabs(e.target.value) }))),

				card(t("settings.group.ai"), t("settings.group.ai.desc"),

					aiModelsOk

						? field(t("settings.ai.model.label"), t("settings.ai.model.hint"),

							h("select", { className: "sol-set-input", value: commitModel, onChange: (e) => setCommitModel((e.target as HTMLSelectElement).value) },

								h("option", { value: "" }, t("settings.ai.none")),

								(() => {

									const groups: Array<{ providerName: string; models: typeof aiModels }> = [];

									for (const m of aiModels) {

										const g = groups[groups.length - 1];

										if (g && g.providerName === m.providerName) g.models.push(m);

										else groups.push({ providerName: m.providerName, models: [m] });

									}

									return groups.map((g) => h("optgroup", { key: g.providerName, label: g.providerName },

										g.models.map((m) => h("option", { key: m.provider + "|" + m.model, value: m.provider + "|" + m.model }, m.name))));

								})()))

						: field(t("settings.ai.model.label"), "", h("span", { className: "sol-set-hint", style: { color: "var(--dsw-alias-label-tertiary,#6e6e6e)" } }, t("settings.ai.unavailable")))),

				h("div", { className: "sol-set-actions" },

					saved ? h("span", { className: "sol-set-saved" }, t("settings.saved")) : null,

					h("button", { className: "sol-set-discard", type: "button", onClick: reset }, t("settings.reset")),

					h("button", { className: "sol-set-save", type: "button", onClick: save }, t("settings.save"))));

		}

