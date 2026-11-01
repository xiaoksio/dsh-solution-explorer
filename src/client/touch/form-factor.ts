/**
 * Device form-factor probes shared by layout and touch modules.
 * @module dsh-solution-explorer/client/touch/form-factor
 */

/**
 * The shell's own layout mode flag (`data-dshm-mode` on `<html>`, set by the
 * dsh-mobile-layout plugin on phone portrait; empty on hosts that never set it).
 * @returns the mode string.
 */
export function dshmMode(): string {
  return document.documentElement.dataset.dshmMode ?? document.body?.dataset.dshmMode ?? ""
}

/**
 * Whether this session runs on a phone held upright. The shell flag wins;
 * a coarse pointer plus a portrait viewport is the fallback for hosts that
 * never set the attribute.
 * @returns true when the panel should behave as a fullscreen phone sheet.
 */
export function isPortraitPhone(): boolean {
  if (dshmMode() === "mobile") return true
  try {
    return window.matchMedia("(pointer: coarse)").matches
      && window.innerHeight > window.innerWidth
  } catch { return false }
}
