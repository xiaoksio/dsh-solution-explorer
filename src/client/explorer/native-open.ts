/**
 * Native "open with system" for Android, with a graceful fallback chain.
 *
 * On Android the host's open-native route is a dead end (xdg-open is the
 * engine's Termux script copy and silently no-ops), so the only real "system
 * open" is a JS bridge injected by the DSH Mobile app:
 *
 *   B  native   window.DshAndroidOpen.open(abs, mime)   → ACTION_VIEW (FileProvider)
 *   D2 share    window.DshAndroidOpen.share(abs, mime)  → ACTION_SEND chooser
 *   D1 download /raw?download=1 → Content-Disposition: attachment, the
 *                                 WebView/app downloader takes it
 *
 * Every step degrades to the next on failure; desktop environments simply
 * never find a bridge and D1 works everywhere a download works.
 * @module dsh-solution-explorer/client/explorer/native-open
 */

import { t } from '../locales.ts'
import { showToast } from '../shared/ui.ts'

/** Contract of the JS bridge the DSH Mobile app injects before page load. */
export interface DshAndroidOpen {
  /** ACTION_VIEW: open with the system default app; true when dispatched. */
  open(absolutePath: string, mime: string): boolean
  /** ACTION_SEND: share/send fallback. */
  share(absolutePath: string, mime: string): boolean
  /** Optional bridge version for future extension. */
  version?: number
}

declare global {
  interface Window {
    DshAndroidOpen?: DshAndroidOpen
  }
}

// Extension → MIME for the bridge call and the raw download route. Images are
// covered too so the bridge receives a real type for them as well.
const FILE_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  apk: 'application/vnd.android.package-archive',
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  ts: 'text/plain',
  tsx: 'text/plain',
  txt: 'text/plain',
  log: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2',
}

/** Lowercase extension of a path ('' when none). */
export function extOf(path: string): string {
  const name = path.split(/[\\/]/).pop() || ''
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Best-effort MIME for a path; application/octet-stream when unknown. */
export function mimeOf(path: string): string {
  return FILE_MIME[extOf(path)] || 'application/octet-stream'
}

/** The injected Android bridge, or null outside the DSH Mobile app. */
export function androidBridge(win: Window = window): DshAndroidOpen | null {
  const b = (win as Window).DshAndroidOpen
  if (!b || typeof b.open !== 'function' || typeof b.share !== 'function') return null
  return b
}

/** Whether the native (C route) bridge is available in this environment. */
export function canNativeOpen(): boolean {
  return androidBridge() !== null
}

/** A one-shot bridge call that must answer synchronously with a boolean. */
function bridgeCall(fn: (b: DshAndroidOpen) => unknown): boolean {
  try {
    const b = androidBridge()
    if (b === null) return false
    return fn(b) === true
  } catch {
    // The app swallows its own errors, but a stale/malformed bridge must
    // never break the fallback chain from the plugin side.
    return false
  }
}

/**
 * The absolute host path of a workspace file (for the bridge). The read
 * route returns `absolutePath` for every readable file — including the
 * unsupported-binary branch — resolved under the same root check.
 */
export async function absolutePathOf(root: string, path: string): Promise<string | null> {
  if (!root || !path) return null
  try {
    const res = await fetch('/solution-explorer/read?root=' + encodeURIComponent(root) + '&file=' + encodeURIComponent(path))
    const json = await res.json()
    if (json?.ok && typeof json.value?.absolutePath === 'string') return json.value.absolutePath
  } catch { /* fall through */ }
  return null
}

/** URL of the raw route flagged as a download (D1). */
export function rawDownloadUrl(root: string, path: string): string {
  return '/solution-explorer/raw?root=' + encodeURIComponent(root)
    + '&file=' + encodeURIComponent(path)
    + '&download=1'
}

/**
 * Trigger a download of a workspace file. Returns whether the navigation
 * was initiated — there is no completion receipt, so this is "handed off",
 * not "done".
 */
export async function triggerDownload(root: string, path: string): Promise<boolean> {
  const url = rawDownloadUrl(root, path)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = (path.split(/[\\/]/).pop() || 'download')
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return true
  } catch { /* fall through */ }
  try {
    window.location.assign(url)
    return true
  } catch {
    return false
  }
}

export type OpenWithSystemResult = 'native' | 'download' | 'share' | 'failed'

/**
 * Open a workspace file with the system, degrading B → D2 → D1:
 * bridge open (ACTION_VIEW default app) → bridge share (chooser) → download.
 * Never throws.
 */
export async function openWithSystem(root: string, path: string): Promise<OpenWithSystemResult> {
  if (!root || !path) return 'failed'
  const abs = await absolutePathOf(root, path)
  const mime = mimeOf(path)
  // B: system default app via the app-provided bridge.
  if (abs !== null && bridgeCall((b) => b.open(abs, mime))) return 'native'
  // D2: share the file out through a chooser.
  if (abs !== null && bridgeCall((b) => b.share(abs, mime))) return 'share'
  // D1: let the platform downloader take the bytes.
  if (await triggerDownload(root, path)) return 'download'
  return 'failed'
}

/** User-facing wrapper: runs the chain and toasts the outcome. */
export async function openWithSystemToast(root: string, path: string): Promise<OpenWithSystemResult> {
  const result = await openWithSystem(root, path)
  if (result === 'native') showToast(t('context.openedWithSystem'))
  else if (result === 'download') showToast(t('context.downloadStarted'))
  else if (result === 'share') showToast(t('context.shareStarted'))
  else showToast(t('context.openFailedNoBridge'), true)
  return result
}
