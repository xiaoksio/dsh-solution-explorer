import z from '@deepseek-ai/schemastery'

/** Plugin configuration schema (all optional with defaults). */
export interface Config {
  /** Default panel width in px (264-420; dragging may widen it further). */
  defaultWidth?: number
  /** Whether to auto-open the panel when a session activates. */
  autoOpen?: boolean
  /** Glob patterns to hide from the file tree. */
  filterPatterns?: string[]
  /** Whether to show dot-prefixed (hidden) files in the tree. */
  showHidden?: boolean
  /** Default shell for embedded terminals (pwsh / powershell / cmd / bash…). */
  terminalShell?: string
  /** Max terminal tabs before the "+" button refuses new sessions. */
  terminalMaxTabs?: number
  /** Initial bottom-terminal panel height in px. */
  terminalHeight?: number
  /** Max bottom-terminal panel height in px (drag limit). */
  terminalMaxHeight?: number
  /** Model used for AI commit-message generation, as `provider|model`. Empty = not configured. */
  commitModel?: string
}

export const Config: z<Config> = z.object({
  defaultWidth: z.number().step(1).min(264).max(420).default(280),
  autoOpen: z.boolean().default(true),
  filterPatterns: z.array(z.string()).default([]),
  showHidden: z.boolean().default(false),
  terminalShell: z.string().default(''),
  terminalMaxTabs: z.number().step(1).min(2).max(16).default(8),
  terminalHeight: z.number().step(1).min(120).max(480).default(400),
  terminalMaxHeight: z.number().step(1).min(240).max(1080).default(1000),
  commitModel: z.string().default(''),
})
