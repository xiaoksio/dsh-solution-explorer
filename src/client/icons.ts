/**
 * Official glyph lookup — one place that survives DSH's icon renames.
 *
 * DSH shipped these primitives as size-suffixed exports (`IconCloseOutline`,
 * `IconChevronDownOutline`) up to 0.1.x and renamed them to weight-suffixed
 * ones (`IconCloseOutlineRegular`, `IconCloseOutlineMedium`) in 0.2. Importing
 * the old spelling from a 0.2 host yields `undefined`, and React renders an
 * `undefined` element type as an invalid element: the throw escapes the
 * plugin's whole render tree, so the right column mounts empty with nothing
 * but a minified React #130 in the console.
 *
 * Every glyph is therefore resolved here at module load — current spelling
 * first, legacy spelling after — and one that no version exports degrades to
 * an empty component (plus one console warning) instead of an invalid element
 * type. Callers import from this module, never from the package directly.
 * @module dsh-solution-explorer/client/icons
 */
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComponentType } from 'react'

/** Props any glyph accepts; concrete components narrow this themselves. */
type IconProps = Record<string, unknown>

/** A glyph component this plugin can render (function, memo, or forwardRef). */
export type IconComponent = ComponentType<IconProps>

/** Renders nothing — the last resort for a glyph this DSH does not export. */
const EMPTY_ICON: IconComponent = () => null

const exports_ = primitives as unknown as Record<string, unknown>

/** Names already reported, so a missing glyph warns once per session. */
const warned = new Set<string>()

/** React accepts a function component or an object component (memo/forwardRef). */
function isRenderable(value: unknown): boolean {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in (value as Record<string, unknown>)
}

/**
 * Resolve one glyph across both naming schemes.
 * @param legacyName - the size-suffixed export this plugin used before.
 * @returns the glyph this DSH version exports, or an empty component.
 */
function resolveIcon(legacyName: string): IconComponent {
  const base = legacyName.replace(/\d+$/, '')
  for (const candidate of [`${base}Regular`, `${base}Medium`, legacyName]) {
    const found = exports_[candidate]
    if (isRenderable(found)) return found as IconComponent
  }
  if (!warned.has(legacyName)) {
    warned.add(legacyName)
    console.warn(`[solution-explorer] ${legacyName} is not exported by this DSH version; that glyph is omitted`)
  }
  return EMPTY_ICON
}

// ── File / file-type glyphs ────────────────────────────────────────────
export const FileTypeIcon = resolveIcon('FileTypeIcon')
export const IconFolderClose = resolveIcon('IconFolderClose16')
export const IconFolderOpen = resolveIcon('IconFolderOpen16')

// ── Structural navigation glyphs ───────────────────────────────────────
export const IconChevronDownOutline = resolveIcon('IconChevronDownOutline14')
export const IconChevronUpOutline = resolveIcon('IconChevronUpOutline14')
export const IconChevronRightOutline = resolveIcon('IconChevronRightOutline14')

// ── Action glyphs ──────────────────────────────────────────────────────
export const IconBranchOutline = resolveIcon('IconBranchOutline16')
export const IconCloseOutline = resolveIcon('IconCloseOutline16')
export const IconCodeOutline = resolveIcon('IconCodeOutline16')
export const IconEditOutline = resolveIcon('IconEditOutline16')
export const IconPanelLeftOutline = resolveIcon('IconPanelLeftOutline16')
export const IconPlusOutline = resolveIcon('IconPlusOutline16')
export const IconProjectAddOutline = resolveIcon('IconProjectAddOutline16')
export const IconRefreshOutline = resolveIcon('IconRefreshOutline16')
export const IconSearchOutline = resolveIcon('IconSearchOutline16')
export const IconTrashOutline = resolveIcon('IconTrashOutline16')

// ── Rendered content ───────────────────────────────────────────────────
export const MarkdownText = resolveIcon('MarkdownText')
