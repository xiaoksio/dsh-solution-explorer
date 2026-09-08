/**
 * dsh-solution-explorer — host half: the workspace-gated filesystem and git
 * services via /solution-explorer/* HTTP routes. Provides file tree browsing,
 * file reading, search, git status, staging, diff, commit, and log.
 *
 * The browser half (exports "./client") is served by client-modules from the
 * same package's dsh.client declaration.
 * @module dsh-solution-explorer
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-system-prompt'
import z from '@deepseek-ai/schemastery'

import { json, readJsonBody, parseQuery } from './host/http-util.ts'
import { SECTION_ORDER, EXPLORER_GUIDANCE } from './host/prompt.ts'
import { Config } from './host/config.ts'
import { getRoutes, postRoutes } from './host/routes/index.ts'
import { clearLlmModelsCache } from './host/routes/llm.ts'
import type { LlmLlmLike } from './host/routes/context.ts'
import { createTerminalState, type SubprocessServiceLike } from './host/terminal/state.ts'
import { createTerminalSessions } from './host/terminal/session.ts'
import { createTerminalStream } from './host/terminal/sse.ts'
import { createTerminalRoutes } from './host/routes/terminal.ts'

export { Config } from './host/config.ts'
export { EXPLORER_GUIDANCE } from './host/prompt.ts'

/** Required services: the route registry, the workspace registry, and the prompt band. */
export const inject = ['webServer', 'workspaceRegistry', 'systemPrompt']

// ─── Plugin apply ───────────────────────────────────────────────────────────

export function apply(ctx: Context, config: Config = {}): void {
  // Settings-page persistence: the `settings` service (when mounted) must be
  // registered before reads/writes work — an unregistered namespace makes get()
  // return undefined and update() throw. Registering with the bundle row as the
  // `base` layer resolves: schema defaults → bundle config → user document.
  const settings = ctx.get('settings') as
    | {
        register<T>(ns: string, schema: z<Config>, options?: { base?: Partial<T> }): {
          get(): T
          update(patch: object): Promise<void>
        }
      }
    | undefined
  let settingsScope: { get(): Config; update(patch: object): Promise<void> } | undefined
  let effectiveConfig: Config = { ...config }
  if (settings) {
    try {
      settingsScope = settings.register('solution-explorer', Config, { base: config })
      effectiveConfig = settingsScope.get()
    } catch { /* unregistered or invalid stored section — keep bundle defaults */ }
  }

  // ── Embedded terminal sessions (ConPTY through the dsh subprocess service) ──
  // Assembly: shared state → session lifecycle → SSE stream → terminal routes.
  const terminalState = createTerminalState()
  const terminalSessions = createTerminalSessions(terminalState, {
    getSubprocess: () => ctx.get('subprocess') as SubprocessServiceLike | undefined,
  })
  const terminalStream = createTerminalStream(terminalState, {
    killAllSessions: () => terminalSessions.killAllSessions(),
  })
  const terminalRoutes = createTerminalRoutes(terminalState, terminalSessions, terminalStream)

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'plugin:solution-explorer',
    order: SECTION_ORDER,
    text: EXPLORER_GUIDANCE,
  }), 'dsh-solution-explorer: prompt section')

  ctx.effect(() => {
    const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      const url = new URL(req.url ?? '/', 'http://x')
      const pathname = url.pathname
      const query = parseQuery(url)

      // Build the per-request route context. The apply-closure dependencies
      // (effective config + settings persistence) are injected as closures;
      // terminal routes are wired separately through the terminal subsystem.
      const routeCtx = (over: { payload?: Record<string, unknown>; root?: string; files?: string[] } = {}) => ({
        res,
        pathname,
        query,
        payload: over.payload ?? {},
        root: over.root ?? '',
        files: over.files ?? [],
        llm: ctx.get('llm') as LlmLlmLike | undefined,
        getConfig: (): Config => effectiveConfig,
        setConfig: (next: Config): void => { effectiveConfig = next },
        persist: async (next: Config): Promise<void> => {
          if (settingsScope) {
            try { await settingsScope.update(next) } catch { /* persistence failure is non-fatal */ }
          }
        },
      })

      // ── GET routes ────────────────────────────────────────────────
      if (req.method === 'GET') {
        // Terminal output: ONE shared SSE stream multiplexes every session
        // (browsers cap concurrent HTTP/1.1 connections per origin).
        if (pathname === '/solution-explorer/terminal/stream') {
          terminalRoutes.stream(res)
          return
        }
        const getHandler = getRoutes[pathname]
        if (getHandler) { await getHandler(routeCtx()); return }
        json(res, { ok: false, error: { message: 'not found' } }, 404)
        return
      }

      // ── POST routes ───────────────────────────────────────────────
      if (req.method === 'POST') {
        const contentType = req.headers['content-type'] ?? ''
        if (!contentType.toLowerCase().startsWith('application/json')) {
          json(res, { ok: false, error: { message: 'content-type must be application/json' } }, 415)
          return
        }
        const payload = await readJsonBody(req)
        if (payload === null) { json(res, { ok: false, error: { message: 'malformed body' } }); return }
        const root = typeof payload.root === 'string' ? payload.root : ''
        const files = Array.isArray(payload.files) ? payload.files.filter((f): f is string => typeof f === 'string') : []

        const postHandler = postRoutes[pathname]
        if (postHandler) { await postHandler(routeCtx({ payload, root, files })); return }

        if (pathname === '/solution-explorer/terminal') {
          await terminalRoutes.open(res, payload, root, () => effectiveConfig)
          return
        }
        const inputMatch = /^\/solution-explorer\/terminal\/([^/]+)\/input$/.exec(pathname)
        if (inputMatch) {
          await terminalRoutes.input(res, inputMatch[1], payload)
          return
        }
        const rebootMatch = /^\/solution-explorer\/terminal\/([^/]+)\/reboot$/.exec(pathname)
        if (rebootMatch) {
          await terminalRoutes.reboot(res, rebootMatch[1], payload)
          return
        }
        json(res, { ok: false, error: { message: 'not found' } }, 404)
        return
      }

      // ── DELETE routes ─────────────────────────────────────────────
      if (req.method === 'DELETE') {
        const deleteMatch = /^\/solution-explorer\/terminal\/([^/]+)$/.exec(pathname)
        if (deleteMatch) {
          terminalRoutes.remove(res, deleteMatch[1])
          return
        }
        json(res, { ok: false, error: { message: 'not found' } }, 404)
        return
      }

      json(res, { ok: false, error: { message: 'method not allowed' } }, 405)
    }

    const disposers = [
      ctx.webServer.register({ kind: 'prefix', path: '/solution-explorer', handler }),
    ]
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'dsh-solution-explorer: HTTP routes')

  // Model topology changed (adapter routes/catalog) → drop the AI-models cache
  // so the picker re-reads the host's current providers/models on next request.
  ctx.effect(() => {
    return ctx.on('llm/adapters-updated', () => clearLlmModelsCache())
  }, 'dsh-solution-explorer: llm model cache invalidation')

  // Host teardown / profile reload: every terminal session is killed so no
  // shell process outlives the plugin.
  ctx.effect(() => {
    return () => {
      for (const session of terminalState.terminals.values()) {
        void session.handle.terminate().catch(() => { /* host teardown */ })
      }
      terminalState.terminals.clear()
    }
  }, 'dsh-solution-explorer: terminal teardown')
}

// ─── Type exports ───────────────────────────────────────────────────────────

export type { FileTreeNode, FileSearchResult } from './host/tree.ts'
export type { GitChange, GitStatusData } from './host/status.ts'

export interface GitCommit {
  hash: string
  parents: string[]
  shortHash: string
  author: string
  email: string
  timestamp: number
  message: string
}