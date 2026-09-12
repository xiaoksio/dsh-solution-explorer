/**
 * Embedded terminal controller — terminal domain.
 * createTerminalController(deps) returns the terminal functions plus a
 * disposer; deps injected from panel.ts. All terminal state lives in
 * deps.state.terminal.
 * @module dsh-solution-explorer/client/terminal-client/terminal
 */

import { Terminal } from "@xterm/xterm"

import { FitAddon } from "@xterm/addon-fit"

import { t } from "../locales.ts"

import { showToast } from "../shared/ui.ts"

import { gitRoot, type AppState } from "../state/store.ts"
import { commands } from '../commands.ts'

import { createElement as h } from "react"

import { createRoot } from "react-dom/client"

import { flushSync } from "react-dom"

import type { Root } from "react-dom/client"

import { TerminalShell } from "./TerminalShell.ts"

const TERM_CELL_W = 9;
const TERM_CELL_H = 18;

export interface TerminalDeps {
  state: AppState
  render: () => void
}

export interface TerminalController {
  toggleTerminal: () => void
  fitTerminal: () => void
  placeTerminal: () => void
  renderTerminalTabs: () => void
  dispose: () => void
}

export function createTerminalController({ state, render }: TerminalDeps): TerminalController {
  const termLang = () => document.documentElement.lang?.startsWith("zh") === true;
  const terminalCwd = () => gitRoot(state) || state.root;
  const terminalCellSize = (el) => ({
    cols: Math.max(20, Math.floor((el?.clientWidth || 320) / TERM_CELL_W)),
    rows: Math.max(5, Math.floor((el?.clientHeight || 120) / TERM_CELL_H)),
  });
  const terminalShellName = (shell) => {
    const first = String(shell ?? "").trim().split(/\s+/)[0] || "shell";
    const base = first.replace(/\\/g, "/").split("/").pop() || first;
    return base.replace(/\.exe$/i, "");
  };

  // Localized terminal error toast: known host failures get a
  // friendly hint (with the raw detail appended for debugging).
  const showTerminalError = (msg) => {
    const raw = String(msg || "");
    if (/file not found/i.test(raw)) {
      showToast(t("terminal.shellNotFound") + (raw ? " (" + raw + ")" : ""));
    } else {
      showToast(t("terminal.startFail") + raw);
    }
  };

  let shellRoot: Root | null = null;

  /** Render the shell chrome (React) for the current tab set. */
  const renderShell = () => {
    if (shellRoot === null) return;
    const tabs = state.terminal.terminalTabs.map((tab) => ({ title: tab.title, shell: tab.shell, exited: !!tab.exited }));
    // flushSync: the controller reads the rendered body right after this call.
    flushSync(() => {
      shellRoot!.render(h(TerminalShell, {
        tabs,
        active: state.terminal.terminalActiveTab,
        canAdd: !(state.terminal.terminalBusy || state.terminal.terminalTabs.length >= state.terminal.terminalMaxTabs),
        labels: {
          tab: t("panel.terminal"),
          close: t("terminal.close") || t("terminal.new"),
          add: t("terminal.new"),
        },
        onActivate: (i) => activateTerminalTab(i),
        onClose: (i) => { void closeTerminalTab(i) },
        onAdd: () => { void addTerminalTab() },
      }));
    });
  };

  const ensureTerminalShell = () => {
    if (state.terminal.terminalShellEl !== null) return state.terminal.terminalShellEl;
    const shell = document.createElement("div");
    shell.className = "sol-exp-terminal-shell";
    // Start collapsed (0 height) so the first open animates.
    shell.style.height = "0px";
    shell.style.opacity = "0";
    shell.style.display = "flex";
    state.terminal.terminalShellEl = shell;
    // Chrome (grip + tab strip + pane host) is React; the pane host stays
    // childless so the controller can mount xterm panes into it.
    shellRoot = createRoot(shell);
    renderShell();
    const bodyEl = shell.querySelector(".sol-exp-term-body") as HTMLElement;
    const exitedEl = document.createElement("div");
    exitedEl.className = "sol-exp-term-exited";
    exitedEl.style.display = "none";
    exitedEl.textContent = t("terminal.empty");
    bodyEl.appendChild(exitedEl);
    // Keep the PTY size in sync with the rendered body: any width
    // change (window, sidebar drag, layout shifts) re-fits and
    // rebuilds so pwsh wraps and redraws at the same columns.
    const sizeObs = new ResizeObserver(() => {
      if (state.terminal.terminalTabs.length === 0) return;
      if (Date.now() < state.terminal.termSettleUntil) return;
      fitTerminal();
      scheduleTerminalReboot();
    });
    const termBody = shell.querySelector(".sol-exp-term-body");
    if (termBody !== null) sizeObs.observe(termBody);
    state.terminal.termSizeObserver = sizeObs;
    let dragStart = null;
    const onMove = (e: PointerEvent) => {
      if (dragStart === null) return;
      state.terminal.terminalHeight = Math.min(state.terminal.terminalMaxHeight, Math.max(120, dragStart.h - (e.clientY - dragStart.y)));
      shell.style.height = state.terminal.terminalHeight + "px";
    };
    const onUp = () => {
      if (dragStart === null) return;
      dragStart = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      // Re-enable the height transition eased back in for later
      // expand/collapse animations (disabled while dragging).
      shell.style.transition = "";
      fitTerminal();
      scheduleTerminalReboot();
    };
    const grab = shell.querySelector(".sol-exp-term-resize") as HTMLDivElement;
    grab.addEventListener("pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      dragStart = { y: e.clientY, h: state.terminal.terminalHeight };
      // No transition while dragging: the panel must track the
      // pointer one-to-one, not ease behind it.
      shell.style.transition = "none";
      grab.setPointerCapture?.(e.pointerId);
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
    return shell;
  };

  const renderTerminalTabs = () => {
    if (state.terminal.terminalShellEl === null) return;
    const body = state.terminal.terminalShellEl.querySelector(".sol-exp-term-body");
    // The chrome is React; the panes stay imperative (xterm owns them).
    state.terminal.terminalTabs.forEach((tab, i) => { tab.pane.dataset.index = String(i); });
    renderShell();
    body.querySelectorAll(".sol-exp-term-pane").forEach((p) => p.classList.toggle("active", p.dataset.index === String(state.terminal.terminalActiveTab)));
    const empty = body.querySelector(".sol-exp-term-exited");
    if (empty) empty.style.display = state.terminal.terminalTabs.length === 0 ? "flex" : "none";
  };

  const activateTerminalTab = (i) => {
    state.terminal.terminalActiveTab = i;
    renderTerminalTabs();
    fitTerminal();
  };

  const fitTerminal = () => {
    const tab = state.terminal.terminalTabs[state.terminal.terminalActiveTab];
    if (!tab || !state.terminal.terminalOpen) return;
    try { tab.fit.fit(); } catch { /* hidden or sizing */ }
  };

  const scheduleTerminalReboot = () => {
    if (state.terminal.terminalRebootTimer !== null) clearTimeout(state.terminal.terminalRebootTimer);
    state.terminal.terminalRebootTimer = setTimeout(async () => {
      state.terminal.terminalRebootTimer = null;
      const tab = state.terminal.terminalTabs[state.terminal.terminalActiveTab];
      if (!tab || tab.exited || !state.terminal.terminalOpen) return;
      // Authoritative size: xterm's own post-fit cols/rows, so the
      // PTY wraps and redraws at EXACTLY the columns/rows the
      // renderer uses (an estimate like paneWidth/9 drifts from
      // the real cell width and PSReadLine's recall redraw then
      // lands on the wrong line).
      let size = { cols: tab.term.cols, rows: tab.term.rows };
      if (!size.cols || !size.rows) {
        size = terminalCellSize(tab.pane);
        size.rows = Math.max(8, Math.floor((state.terminal.terminalHeight - 40) / TERM_CELL_H));
      }
      // Height-only changes keep the shell alive: stale rows only
      // affect scroll-region edge cases, while a width (cols)
      // mismatch corrupts line wrapping and redraws. Reboot —
      // and with it the shell — only when cols really change.
      if (state.terminal.termLastSize !== null && state.terminal.termLastSize.cols === size.cols) return;
      state.terminal.termLastSize = size;
      try {
        const resp = await fetch("/solution-explorer/terminal/" + tab.id + "/reboot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rows: size.rows, cols: size.cols }),
        });
        const res = await resp.json();
        if (!res.ok) showTerminalError(res.error?.message || t("terminal.rebootFail"));
      } catch { /* keep the tab as is */ }
    }, 400);
  };

  // ONE shared SSE stream carries every tab's output — per-tab streams
  // would exhaust the browser's connection pool (~6 per origin)
  // after a few terminals.

  // Input batching: keystrokes coalesce into one POST every few ms
  // instead of one fetch per key (typing bursts stall otherwise).
  // Pending/in-flight state is PER TAB so typing in one terminal can
  // never leak keystrokes into another.
  const flushTerminalInput = async () => {
    state.terminal.termInputTimer = null;
    const batch = [...state.terminal.termInputPending.entries()];
    state.terminal.termInputPending.clear();
    for (const [id, data] of batch) {
      if (data === "") continue;
      if (state.terminal.termInputInFlight.get(id)) {
        state.terminal.termInputTail.set(id, (state.terminal.termInputTail.get(id) || "") + data);
        continue;
      }
      state.terminal.termInputInFlight.set(id, true);
      (async () => {
        try {
          await fetch("/solution-explorer/terminal/" + id + "/input", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ data }),
          });
        } catch { /* keep typing */ }
        state.terminal.termInputInFlight.set(id, false);
        const tail = state.terminal.termInputTail.get(id);
        state.terminal.termInputTail.set(id, "");
        if (tail) queueTerminalInput({ id }, tail);
      })();
    }
  };
  const queueTerminalInput = (tab, data) => {
    state.terminal.termInputPending.set(tab.id, (state.terminal.termInputPending.get(tab.id) || "") + data);
    if (state.terminal.termInputTimer === null) state.terminal.termInputTimer = setTimeout(flushTerminalInput, 12);
  };

  // Output coalescing: burst frames accumulate and flush to xterm
  // once per animation frame instead of one write per frame.
  const flushTerminalOutput = () => {
    state.terminal.termOutputFlush = null;
    for (const tab of state.terminal.terminalTabs) {
      if (tab._out !== undefined && tab._out !== "") {
        const s = tab._out;
        tab._out = "";
        tab.term.write(s);
      }
    }
  };
  const queueTerminalOutput = (tab, text) => {
    tab._out = (tab._out || "") + text;
    if (state.terminal.termOutputFlush === null) state.terminal.termOutputFlush = requestAnimationFrame(flushTerminalOutput);
  };

  const ensureTerminalStream = () => {
    if (state.terminal.terminalStreamOn) return;
    state.terminal.terminalStreamOn = true;
    state.terminal.terminalStreamCtrl = new AbortController();
    (async () => {
      try {
        const resp = await fetch("/solution-explorer/terminal/stream", { signal: state.terminal.terminalStreamCtrl.signal });
        if (!resp.ok || !resp.body) {
          state.terminal.terminalStreamOn = false;
          // A 404 means the HOST is still running an older
          // build (the shared stream route is new) — a page
          // refresh cannot fix that; the app process must
          // fully restart.
          showToast(termLang() ? "宿主进程版本过旧，终端输出不可用——请完全退出并重启 DSH 应用" : "Host is outdated — fully restart DSH to enable terminal output");
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (state.terminal.terminalStreamOn) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          let frameCount = 0;
          while ((idx = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            let ev = "";
            let data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) ev = line.slice(6).trim();
              else if (line.startsWith("data:")) data = line.slice(5).trim();
            }
            if (ev === "t" && data.includes("|")) {
              const sep = data.indexOf("|");
              const id = data.slice(0, sep);
              const b64 = data.slice(sep + 1);
              const tab = state.terminal.terminalTabs.find((x) => x.id === id);
              if (tab && b64) {
                try {
                  // base64 → bytes → streaming UTF-8 decode:
                  // feeding raw latin-1 chars to xterm breaks
                  // multibyte (Chinese) output.
                  const bin = window.atob(b64);
                  const bytes = new Uint8Array(bin.length);
                  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                  queueTerminalOutput(tab, tab.decoder.decode(bytes, { stream: true }));
                } catch { /* bad frame */ }
              }
            } else if (ev === "end") {
              const tab = state.terminal.terminalTabs.find((x) => x.id === data);
              if (tab && !tab.exited) {
                try { tab.decoder.decode(); } catch { /* flush tail */ }
                if (state.terminal.termOutputFlush !== null) { cancelAnimationFrame(state.terminal.termOutputFlush); state.terminal.termOutputFlush = null; }
                flushTerminalOutput();
                tab.exited = true;
                tab.term.write("\r\n\x1b[90m[" + (termLang() ? "进程已退出" : "process exited") + "]\x1b[0m\r\n");
                renderTerminalTabs();
              }
            }
            // Yield during output bursts so the main thread
            // never stays blocked in this parse loop.
            if (++frameCount % 128 === 0) await new Promise((r) => setTimeout(r, 0));
          }
        }
      } catch { /* aborted or dropped */ }
      state.terminal.terminalStreamOn = false;
    })();
  };

  const stopTerminalStream = () => {
    state.terminal.terminalStreamOn = false;
    if (state.terminal.terminalStreamCtrl !== null) { try { state.terminal.terminalStreamCtrl.abort(); } catch { /* ignore */ } state.terminal.terminalStreamCtrl = null; }
  };

  const addTerminalTab = async () => {
    if (state.terminal.terminalBusy) return;
    if (!state.terminal.terminalSupported) { showToast(t("terminal.unsupported")); return; }
    if (state.root === "") { showToast(termLang() ? "先打开工作区再使用终端" : "Open a workspace first"); return; }
    if (state.terminal.terminalTabs.length >= state.terminal.terminalMaxTabs) {
      showToast(termLang() ? "最多 " + state.terminal.terminalMaxTabs + " 个终端标签" : "Up to " + state.terminal.terminalMaxTabs + " terminal tabs");
      return;
    }
    state.terminal.terminalBusy = true;
    renderTerminalTabs();
    try {
      const pane = document.createElement("div");
      pane.className = "sol-exp-term-pane";
      pane.dataset.index = String(state.terminal.terminalTabs.length);
      ensureTerminalShell().querySelector(".sol-exp-term-body").appendChild(pane);
      const term = new Terminal({
        fontSize: 13,
        fontFamily: 'Consolas, "Cascadia Mono", "Microsoft YaHei", Menlo, monospace',
        cursorBlink: true,
        allowProposedApi: false,
        theme: {
          background: "transparent",
          foreground: "#d4d4d4",
          cursorAccent: "#101010",
          selectionBackground: "rgba(75,159,255,0.30)",
          black: "#242424", red: "#f85149", green: "#3fb950", yellow: "#d29922",
          blue: "#58a6ff", magenta: "#bc8cff", cyan: "#39c5cf", white: "#d4d4d4",
          brightBlack: "#6e6e6e", brightRed: "#ff7b72", brightGreen: "#56d364",
          brightYellow: "#e3b341", brightBlue: "#79c0ff", brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd", brightWhite: "#ffffff",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(pane);
      // Measure the EXACT post-fit size: stretch the shell to the
      // target height momentarily (the open animation starts
      // from 0) so xterm reports real cols/rows, then restore.
      // Creating the PTY with the true size from the first prompt
      // eliminates the occasional history-recall misplacement.
      const shellEl = ensureTerminalShell();
      const prevHeight = shellEl.style.height;
      const prevOpacity = shellEl.style.opacity;
      shellEl.style.height = state.terminal.terminalHeight + "px";
      shellEl.style.opacity = "1";
      let exactCols = 20;
      let exactRows = 8;
      try {
        fit.fit();
        exactCols = term.cols || 20;
        exactRows = term.rows || 8;
      } catch { /* keep fallbacks */ }
      shellEl.style.height = prevHeight;
      shellEl.style.opacity = prevOpacity;
      const resp = await fetch("/solution-explorer/terminal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ root: state.root, cwd: terminalCwd(), shell: state.terminal.terminalShell || undefined, rows: exactRows, cols: exactCols }),
      });
      const res = await resp.json();
      if (!res.ok) {
        state.terminal.terminalSupported = res.code !== "unsupported";
        pane.remove();
        term.dispose();
        if (res.code === "unsupported") showToast(t("terminal.unsupported"));
        else showTerminalError(res.error?.message);
        return;
      }
      const tab = {
        id: res.value.id,
        shell: res.value.shell || terminalShellName(state.terminal.terminalShell) || "shell",
        title: terminalShellName(res.value.shell),
        pane, term, fit,
        decoder: new TextDecoder(),
        exited: false, aborted: false,
      };
      state.terminal.terminalSeq++;
      state.terminal.terminalTabs.push(tab);
      state.terminal.terminalActiveTab = state.terminal.terminalTabs.length - 1;
      try { fit.fit(); } catch { /* zero-size parent */ }
      term.onData((data) => queueTerminalInput(tab, data));
      renderTerminalTabs();
      ensureTerminalStream();
    } catch (err) {
      showTerminalError(err instanceof Error ? err.message : String(err));
    } finally {
      state.terminal.terminalBusy = false;
      renderTerminalTabs();
    }
  };

  const closeTerminalTab = async (i) => {
    const tab = state.terminal.terminalTabs[i];
    if (!tab) return;
    tab.aborted = true;
    if (state.terminal.terminalRebootTimer !== null) { clearTimeout(state.terminal.terminalRebootTimer); state.terminal.terminalRebootTimer = null; }
    state.terminal.terminalTabs.splice(i, 1);
    if (state.terminal.terminalActiveTab >= state.terminal.terminalTabs.length) state.terminal.terminalActiveTab = Math.max(0, state.terminal.terminalTabs.length - 1);
    fetch("/solution-explorer/terminal/" + tab.id, { method: "DELETE" }).catch(() => {});
    try { tab.term.dispose(); } catch { /* already gone */ }
    tab.pane.remove();
    // Closing the last terminal collapses the whole bottom panel.
    if (state.terminal.terminalTabs.length === 0) {
      state.terminal.terminalOpen = false;
      syncTerminalUI();
      render(); // refresh the rail/activity toggle active state
      return;
    }
    renderTerminalTabs();
    fitTerminal();
  };

  const terminalCenterCol = () => {
    if (state.layout.panelFrame === null) return null;
    for (const child of state.layout.panelFrame.children) {
      if (getComputedStyle(child).gridColumnStart === "2") return child;
    }
    return state.layout.panelFrame.children[1] ?? null;
  };

  const placeTerminal = () => {
    if (state.terminal.terminalShellEl === null) return;
    state.terminal.terminalShellEl.remove();
    if (!state.terminal.terminalOpen) return;
    const centerEl = terminalCenterCol();
    if (centerEl === null) return;
    // The terminal lives INSIDE the center column's flow, as its
    // last child: it spans exactly the column width (between the
    // two sidebars) and the composer above it moves up with the
    // reflow — no overlay, no z-index, nothing floats.
    const cs = getComputedStyle(centerEl);
    if (cs.display !== "flex" && cs.display !== "inline-flex" && cs.display !== "-webkit-flex") {
      centerEl.style.display = "flex";
      centerEl.style.flexDirection = "column";
      const first = centerEl.firstElementChild;
      if (first !== null) { first.style.flex = "1 1 0%"; first.style.minHeight = "0"; }
    }
    centerEl.appendChild(state.terminal.terminalShellEl);
  };

  const syncTerminalUI = () => {
    if (state.terminal.terminalOpen) {
      const shell = ensureTerminalShell();
      // Ignore size events during the open/close animation so
      // the height transition can't trigger resize-rebuilds.
      state.terminal.termSettleUntil = Date.now() + 420;
      shell.style.transition = "height .2s cubic-bezier(.2,.7,.3,1), opacity .16s ease";
      shell.style.display = "flex";
      placeTerminal();
      ensureTerminalStream();
      // From 0 → target height on the next frames so the CSS
      // transition actually animates (0 was the resting state).
      shell.style.height = "0px";
      shell.style.opacity = "0";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shell.style.height = state.terminal.terminalHeight + "px";
          shell.style.opacity = "1";
          window.setTimeout(() => { fitTerminal(); scheduleTerminalReboot(); }, 260);
        });
      });
    } else {
      if (state.terminal.terminalShellEl !== null) {
        state.terminal.terminalShellEl.style.transition = "height .18s cubic-bezier(.2,.7,.3,1), opacity .14s ease";
        state.terminal.terminalShellEl.style.height = "0px";
        state.terminal.terminalShellEl.style.opacity = "0";
        // Leave the zero-height shell attached: it occupies no
        // layout space, so the composer stays where it is.
      }
      // The shared stream stays open: sessions survive a panel
      // close and reopen with their output intact. It is only
      // torn down on page unload (see cleanups).
    }
  };

  const toggleTerminal = () => {
    if (!state.terminal.terminalSupported && !state.terminal.terminalOpen) { showToast(t("terminal.unsupported")); return; }
    state.terminal.terminalOpen = !state.terminal.terminalOpen;
    syncTerminalUI();
    render(); // refresh rail strip / activity button active state
    if (state.terminal.terminalOpen && state.terminal.terminalTabs.length === 0) addTerminalTab();
  };
  commands.toggleTerminal = toggleTerminal;
  const onWindowResize = () => { fitTerminal(); scheduleTerminalReboot(); };
  window.addEventListener("resize", onWindowResize);

  const dispose = () => {
    delete commands.toggleTerminal;
    window.removeEventListener("resize", onWindowResize);
    stopTerminalStream();
    if (state.terminal.termSizeObserver !== null) { state.terminal.termSizeObserver.disconnect(); state.terminal.termSizeObserver = null; }
    if (state.terminal.termInputTimer !== null) { clearTimeout(state.terminal.termInputTimer); state.terminal.termInputTimer = null; }
    if (state.terminal.termOutputFlush !== null) { cancelAnimationFrame(state.terminal.termOutputFlush); state.terminal.termOutputFlush = null; }
    if (state.terminal.terminalRebootTimer !== null) { clearTimeout(state.terminal.terminalRebootTimer); state.terminal.terminalRebootTimer = null; }
    for (const tab of state.terminal.terminalTabs) { fetch("/solution-explorer/terminal/" + tab.id, { method: "DELETE" }).catch(() => {}); }
    state.terminal.terminalTabs = [];
    shellRoot?.unmount();
    shellRoot = null;
    if (state.terminal.terminalShellEl !== null) { state.terminal.terminalShellEl.remove(); state.terminal.terminalShellEl = null; }
  };

  return { toggleTerminal, fitTerminal, placeTerminal, renderTerminalTabs, dispose };
}
