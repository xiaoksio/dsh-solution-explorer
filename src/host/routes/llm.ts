/**
 * AI-assisted SCM routes — SCM domain, host half.
 *
 * `/solution-explorer/llm-models`             GET  — flatten the host's configured
 *                                                    providers and their models into a
 *                                                    flat `provider|model` list for the
 *                                                    settings picker (refreshed on
 *                                                    `llm/adapters-updated`).
 * `/solution-explorer/llm-generate-commit`    POST — stream a commit-message draft from
 *                                                    the models built on the staged diff,
 *                                                    optionally guided by the repo's
 *                                                    AGENTS.md.
 *
 * The LLM capability is optional: every handler fails cleanly (never throws a raw
 * error) when `ctx.llm` is absent, so non-llm hosts keep working.
 * @module dsh-solution-explorer/host/routes/llm
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { json } from '../http-util.ts'
import { git } from '../git-runner.ts'
import type { LlmLlmLike, Handler, RouteContext, LlmMessage } from './context.ts'

const MODELS_CACHE_MS = 15 * 60 * 1000

/** Module-level flat model cache + last-fetch timestamp (invalidated by adapters-updated). */
let cachedModels: Array<{ provider: string; providerName: string; model: string; name: string }> | null = null
let cachedAt = 0

/** Simple module-level message-id counter (uniqueness is all the structural shape needs). */
let msgSeq = 0

/** Build a structural user message (see LlmMessage) without importing dsh-llm. */
function textMessage(text: string): LlmMessage {
  msgSeq += 1
  return {
    id: `sol-exp-${Date.now()}-${msgSeq}`,
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: 'dsh-solution-explorer' },
  }
}

/**
 * Vision-backend wrapper/chain routes injected by dsh-vision-router (mirror
 * providers such as "DeepSeek + 自动识图"). They are real `llm` routes but are
 * transport shims, not user-facing chat models, and DSH's own model picker
 * hides them — so we do too, to keep the commit-model list identical.
 *
 * Besides the known stock ids, we also catch user-renamed wrapper/chain routes
 * (vision-router lets you change `wrapperRoute`/`chainRoute`): an id that
 * contains a `vision` token or a display name that says「自动识图」is treated
 * as a vision shim. The English `vision` check is scoped to the route id only,
 * never the display name, so a real multimodal provider id like `openai` whose
 * model names mention "vision" is not removed.
 */
function isVisionBackendProvider(id: string, name?: string): boolean {
  if (id === 'vision-http' || id === 'vision-chain' || id === 'deepseek-vision') return true
  if (id.endsWith('-vision')) return true
  if (/\bvision\b|-vision|vision-/i.test(id)) return true
  if (name && name.includes('自动识图')) return true
  return false
}

/** Flatten providers × models into a deduplicated `provider|model` list. */
async function listLlmModels(llm: LlmLlmLike): Promise<Array<{ provider: string; providerName: string; model: string; name: string }>> {
  const out: Array<{ provider: string; providerName: string; model: string; name: string }> = []
  const seen = new Set<string>()
  let providers: Array<{ id: string; name: string }> = []
  try {
    providers = (llm.listProviders() || []).filter((p) => !isVisionBackendProvider(p.id, p.name))
  } catch { providers = [] }
  for (const p of providers) {
    let models: Array<{ provider: string; id: string; name?: string }> = []
    try {
      models = await llm.listModels(p.id) || []
    } catch { models = [] }
    for (const m of models) {
      const key = `${p.id}|${m.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ provider: p.id, providerName: p.name || p.id, model: m.id, name: m.name || m.id })
    }
  }
  return out
}

/** Invalidate the module-level models cache (call on `llm/adapters-updated`). */
export function clearLlmModelsCache(): void {
  cachedModels = null
  cachedAt = 0
}

export const llmGet: Record<string, Handler> = {
  '/solution-explorer/llm-models': async ({ res, llm }: RouteContext) => {
    if (!llm) {
      json(res, { ok: false, error: { message: 'AI 模型服务不可用（宿主未挂载 llm）' } })
      return
    }
    const now = Date.now()
    try {
      if (!cachedModels || now - cachedAt > MODELS_CACHE_MS) {
        cachedModels = await listLlmModels(llm)
        cachedAt = now
      }
      json(res, { ok: true, value: cachedModels })
    } catch (err) {
      json(res, { ok: false, error: { message: err instanceof Error ? err.message : String(err) } })
    }
  },
}

export const llmPost: Record<string, Handler> = {
  '/solution-explorer/llm-generate-commit': async ({ res, payload, root, llm, getConfig }: RouteContext) => {
    if (!llm) {
      json(res, { ok: false, error: { message: 'AI 模型服务不可用（宿主未挂载 llm）' } })
      return
    }
    // Model route: explicit provider/model wins; otherwise fall back to the
    // saved `commitModel` setting (`provider|model`), so the client needs no
    // settings round-trip to know which model is configured.
    let provider = typeof payload.provider === 'string' ? payload.provider : ''
    let model = typeof payload.model === 'string' ? payload.model : ''
    if ((!provider || !model) && getConfig) {
      const saved = getConfig().commitModel || ''
      const sep = saved.indexOf('|')
      if (sep > 0) { provider = provider || saved.slice(0, sep); model = model || saved.slice(sep + 1) }
    }
    if (!provider || !model) {
      json(res, { ok: false, error: { message: 'AI 模型未配置' } })
      return
    }
    if (!root) {
      json(res, { ok: false, error: { message: 'root required' } })
      return
    }

    // Staged diff = what will be committed.
    const diffResult = git(['diff', '--cached'], root)
    const diff = diffResult.ok ? diffResult.stdout : ''
    if (!diff.trim()) {
      json(res, { ok: false, error: { message: '没有已暂存的变更可供生成' } })
      return
    }

    // Optional repo-level AGENTS.md guidance (best effort, first match wins).
    let repoGuide = ''
    for (const name of ['AGENTS.md', 'agents.md']) {
      try {
        const p = path.resolve(root, name)
        repoGuide = await readFile(p, 'utf8')
        if (repoGuide.trim()) break
      } catch { /* missing or unreadable — keep trying / fall through */ }
    }

    const system = [
      '你是一名资深 Git 提交信息撰写助手。根据给定的变更 diff 生成一条简洁、准确、符合规范的提交信息。',
      '硬性要求：',
      '- 首行为类型 + 简短摘要，类型取自 Conventional Commits（feat/fix/docs/style/refactor/perf/test/chore）',
      '- 摘要以中文撰写、以动词短语开头（如「新增」「修复」「重构」），控制在 60 字以内',
      '- 如有必要可在摘要后另起几行补充影响范围或原因，保持精炼',
      '- 只输出提交信息本身，不要任何解释、前后缀或代码块标记',
    ].join('\n')

    const repoSection = repoGuide.trim()
      ? `\n\n该仓库的 AGENTS.md 提交规范（优先遵循，仅作风格参考，不要逐字照搬）：\n${repoGuide.slice(0, 4000)}`
      : ''

    const user = `以下是本次提交的 staged diff：\n\n${diff.slice(-6000)}\n${repoSection}`

    let text = ''
    let failed = false
    try {
      const stream = llm.stream({
        provider,
        model,
        system,
        messages: [textMessage(user)],
        maxTokens: 1000,
      })
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta' && chunk.text) text += chunk.text
        if (chunk.type === 'finish') {
          const reason = (chunk as { reason?: { kind?: string } }).reason
          if (reason?.kind === 'error' || reason?.kind === 'aborted') failed = true
        }
      }
    } catch (err) {
      json(res, { ok: false, error: { message: err instanceof Error ? err.message : String(err) } })
      return
    }

    const cleaned = text.trim()
    if (failed || !cleaned) {
      json(res, { ok: false, error: { message: failed ? '模型调用失败' : '模型未返回内容' } })
      return
    }
    json(res, { ok: true, value: cleaned })
  },
}