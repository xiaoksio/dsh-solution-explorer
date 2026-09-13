import type { IncomingMessage, ServerResponse } from 'node:http'
import * as fsp from 'node:fs/promises'
import * as pathModule from 'node:path'

export function json(res: ServerResponse, payload: unknown, status = 200): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

export async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch { resolve(null) }
    })
    req.on('error', () => resolve(null))
  })
}

/** The root's resolved spelling with no trailing separator, so containment compares like with like. */
function trimRoot(root: string): string {
  return pathModule.resolve(root).replace(/[\\/]+$/, '')
}

/** Strict containment: the resolved path must be inside the workspace root. */
export function ensureInside(root: string, p: string): boolean {
  const base = trimRoot(root)
  const full = pathModule.resolve(root, p)
  return full !== base && full.startsWith(base + pathModule.sep)
}

/**
 * The file a read may open.
 *
 * A relative path must stay inside the workspace root, exactly as a write does. An
 * absolute path names the file itself: the resource grammar's `absolute` scope and
 * a Session's file references outside its workspace are legitimate reads, so the
 * workspace fence does not apply to them. Writes are unaffected — every write route
 * still goes through {@link ensureInside}.
 * @param root - the workspace root the GUI asked through.
 * @param file - the requested path, relative or absolute.
 * @returns the path to read, or null when a relative path escapes the root.
 */
export function resolveReadTarget(root: string, file: string): string | null {
  if (pathModule.isAbsolute(file)) return pathModule.resolve(file)
  return ensureInside(root, file) ? pathModule.resolve(root, file) : null
}

/** Pick a non-colliding destination: append " copy" / " copy 2" while taken. */
export async function autoRename(dest: string): Promise<string> {
  const exists = async (p: string) => fsp.stat(p).then(() => true).catch(() => false)
  if (!(await exists(dest))) return dest
  const dir = pathModule.dirname(dest)
  const ext = pathModule.extname(dest)
  const base = pathModule.basename(dest, ext)
  for (let i = 1; ; i++) {
    const candidate = pathModule.join(dir, `${base} copy${i > 1 ? ' ' + i : ''}${ext}`)
    if (!(await exists(candidate))) return candidate
  }
}

/** Move a path; cross-device (EXDEV) falls back to copy + remove. */
export async function movePath(source: string, dest: string): Promise<void> {
  try {
    await fsp.rename(source, dest)
  } catch (err: any) {
    if (err?.code !== 'EXDEV') throw err
    await fsp.cp(source, dest, { recursive: true })
    await fsp.rm(source, { recursive: true, force: true })
  }
}

/** Parse a query string into a record. */
export function parseQuery(url: URL): Record<string, string> {
  const out: Record<string, string> = {}
  url.searchParams.forEach((v, k) => { out[k] = v })
  return out
}
