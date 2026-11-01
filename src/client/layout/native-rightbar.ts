/**
 * Native right-sidebar bridge — keeps this plugin's fullscreen phone sheet and
 * the shell's own right column (工作台) mutually exclusive, and makes the
 * official "open right sidebar" header button usable again on a portrait
 * phone.
 *
 * The official button is the only entry to the native column on the main
 * window (dsh-mobile-layout's classic preset has no workbench key). It is
 * hidden out from under the user twice over:
 *
 * 1. The sidebarRight store persists `expanded` across restarts while the
 *    mobile grid collapses the column track to 0 — the store claims open,
 *    nothing renders. The official header then hides the "expand" button
 *    (it believes the column is already shown), so neither of the two
 *    official toggles is reachable.
 * 2. Its one-click semantics are store-driven: with the stale persisted
 *    state a click would "collapse" an invisible column instead of opening.
 *
 * Both are fixed here rather than in dsh-mobile-layout: the exclusion duty is
 * this plugin's (our sheet covers the screen, so coexistence is ours to
 * refuse), and the button takeover rides the same click.
 * @module dsh-solution-explorer/client/layout/native-rightbar
 */

import { commands } from "../commands.ts"
import { isPortraitPhone } from "../touch/form-factor.ts"

/** The shell's sidebar-right face, structurally typed. */
interface SidebarRightFace {
  toggleExpanded?(): void
  isExpanded?(): boolean
}

type ServiceGetter = (name: string) => unknown

function serviceOf(get: ServiceGetter | undefined): SidebarRightFace | undefined {
  if (get === undefined) return undefined
  try {
    const face = get("sidebarRight") as SidebarRightFace | undefined
    return face !== null && typeof face === "object" ? face : undefined
  } catch {
    return undefined
  }
}

/**
 * The native column's DOM truth: `data-sidebar-right-open` on the official
 * panel. `null` when the panel is not mounted (store is the only witness —
 * and a stale one, per the module comment).
 */
function domOpen(): boolean | null {
  const panel = document.querySelector("[data-sidebar-right-panel]")
  return panel instanceof HTMLElement ? panel.hasAttribute("data-sidebar-right-open") : null
}

/**
 * Whether the native column currently covers the screen. On a portrait phone
 * an expanded right column always takes the fullscreen form; the frame flag
 * is the authoritative signal (the panel node may still be mounting).
 */
export function nativeRightbarFullscreen(): boolean {
  const frame = document.querySelector("[data-dshm-frame]")
  return frame instanceof HTMLElement && frame.hasAttribute("data-rightbar-fullscreen")
}

/**
 * Reconcile the persisted store with the DOM before any toggle, mirroring the
 * dance dsh-mobile-layout performs: a store that disagrees with a mounted
 * panel is first reset to the DOM truth, otherwise the next toggle is read as
 * "close the panel that is already open" and nothing happens on screen.
 * @returns the open state the store was left in, or `null` when the panel is
 * unmounted and only the store could be asked.
 */
function alignStore(face: SidebarRightFace | undefined): boolean | null {
  if (face?.toggleExpanded === undefined || face.isExpanded === undefined) return null
  const dom = domOpen()
  let store: boolean
  try {
    store = Boolean(face.isExpanded())
  } catch {
    return dom
  }
  if (dom !== null && store !== dom) {
    try {
      face.toggleExpanded()
    } catch {
      return dom
    }
    store = dom
  }
  return store
}

function clickOfficialToggle(selector: string): boolean {
  const button = document.querySelector(selector)
  if (!(button instanceof HTMLButtonElement)) return false
  button.click()
  return true
}

/**
 * Open the native right column, closing this plugin's sheet first: on a
 * portrait phone the two are both fullscreen, so only one may stand.
 * Falls back to the official header button when the service face is absent.
 * @returns true when an open was triggered.
 */
export function openNativeRightbar(get: ServiceGetter | undefined): boolean {
  if (isPortraitPhone() && !stateWantsPanelClosed()) commands.togglePanel?.()
  const face = serviceOf(get)
  const current = alignStore(face)
  if (current === null) return clickOfficialToggle("[data-sidebar-right-expand]")
  if (current) return true
  try {
    face?.toggleExpanded?.()
    return true
  } catch {
    return clickOfficialToggle("[data-sidebar-right-expand]")
  }
}

/**
 * Close the native right column when it stands. Runs before this plugin's
 * sheet expands (portrait exclusivity) and is a no-op everywhere else — a
 * desktop right column may coexist with the explorer panel as before.
 */
export function closeNativeRightbar(get: ServiceGetter | undefined): void {
  if (!nativeRightbarFullscreen() && domOpen() !== true) return
  const face = serviceOf(get)
  if (face?.toggleExpanded === undefined) {
    clickOfficialToggle("[data-sidebar-right-toggle]")
    return
  }
  // After this the store matches the mounted panel (or the panel is absent).
  const dom = alignStore(face)
  if (dom === null) {
    // Panel unmounted while the fullscreen flag stood: reset the stale store
    // so the header button reads "open" again, there is nothing else to do.
    let store = false
    try {
      store = Boolean(face.isExpanded?.())
    } catch {
      store = false
    }
    if (store) {
      try {
        face.toggleExpanded()
      } catch {
        /* the store stays stale; the next open realigns again */
      }
    }
    return
  }
  if (dom) {
    try {
      face.toggleExpanded()
    } catch {
      clickOfficialToggle("[data-sidebar-right-toggle]")
    }
  }
}

/**
 * Whether this plugin's sheet should stay closed — read through the command
 * registry so the module never imports panel state directly.
 */
function stateWantsPanelClosed(): boolean {
  return commands.panelClosed?.() === true
}

/**
 * Bind the bridge. Registers the shared commands and intercepts the official
 * expand button on a portrait phone (capture phase, before the shell's own
 * handler): the interception re-aligns the store first so the very first tap
 * opens the column, and routes the open through the exclusivity rules above.
 * On non-phone form factors the button keeps its stock behavior untouched.
 * @param get - the context's soft service reader (`ctx.get`), optional.
 * @returns a disposer.
 */
export function bindNativeRightbar(get: ServiceGetter | undefined): () => void {
  commands.closeNativeRightbar = () => closeNativeRightbar(get)

  const onClick = (e: MouseEvent): void => {
    if (!isPortraitPhone()) return
    const target = e.target
    if (!(target instanceof Element)) return
    if (target.closest("[data-sidebar-right-expand]") === null) return
    e.preventDefault()
    e.stopPropagation()
    openNativeRightbar(get)
  }
  document.addEventListener("click", onClick, { capture: true })
  return () => {
    document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions)
    delete commands.closeNativeRightbar
  }
}

/**
 * Watch the shell for the native column taking the fullscreen form and step
 * this plugin's sheet aside when it does — only one right column may stand.
 * The attribute filter keeps the callback rare: only mutations of that one
 * attribute anywhere in the document reach it.
 * @returns a disposer.
 */
export function watchNativeRightbarExclusive(): () => void {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== "attributes") continue
      const frame = record.target
      if (!(frame instanceof HTMLElement)) continue
      if (!frame.hasAttribute("data-rightbar-fullscreen")) continue
      commands.nativeRightbarOpened?.()
    }
  })
  observer.observe(document, { attributes: true, attributeFilter: ["data-rightbar-fullscreen"], subtree: true })
  return () => observer.disconnect()
}
