import type { ServerResponse } from 'node:http'
import type { Config } from '../config.ts'

/**
 * Minimal, structural view of DSH's `llm` service (`@deepseek-ai/dsh-llm`).
 * Individually kept here (not imported from the package) so the plugin build
 * stays independent of the host's copy — at runtime the route calls the host
 * `ctx.llm` instance, which structurally satisfies this shape.
 */
export interface LlmProviderInfo {
  id: string
  name: string
}
export interface LlmModelInfo {
  provider: string
  id: string
  name: string
  description?: string
}
export interface LlmMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: { type: 'text'; text: string }[]
  source: { kind: 'user' } | { kind: 'plugin'; plugin: string }
}
export interface LlmStreamOptions {
  provider: string
  model: string
  system?: string
  messages: LlmMessage[]
  temperature?: number
  maxTokens?: number
  stop?: string[]
}
export interface LlmLlmLike {
  listProviders(): LlmProviderInfo[]
  listModels(provider: string): Promise<LlmModelInfo[]>
  stream(options: LlmStreamOptions): AsyncIterable<{
    type: 'text-delta' | 'block-end' | 'usage' | 'finish' | 'reasoning-delta'
    text?: string
  }>
}

/**
 * Shared per-request context passed to every route handler. It carries the
 * parsed request facts plus the two apply-closure dependencies the non-terminal
 * routes need: the effective config (read/write) and settings persistence.
 * `llm` (when the host mounted a model service) backs the AI commit-message
 * feature; it is optional so non-llm hosts degrade gracefully.
 * Terminal routes still live in index.ts until the M1.3 extraction.
 */
export interface RouteContext {
  res: ServerResponse
  pathname: string
  query: Record<string, string>
  payload: Record<string, unknown>
  root: string
  files: string[]
  getConfig(): Config
  setConfig(next: Config): void
  persist(next: Config): Promise<void>
  llm?: LlmLlmLike
}

export type Handler = (ctx: RouteContext) => Promise<void>
