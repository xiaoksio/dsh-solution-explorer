import { fsGet, fsPost } from './fs.ts'
import { gitReadGet } from './git-read.ts'
import { gitWritePost } from './git-write.ts'
import { gitSyncPost } from './git-sync.ts'
import { branchRemotePost } from './branch-remote.ts'
import { llmGet, llmPost } from './llm.ts'
import type { Handler } from './context.ts'

/** Exact-path route tables, keyed by pathname, split by HTTP method.
 *  Terminal routes (SSE stream / open / input / reboot / delete) still live in
 *  index.ts until the M1.3 terminal extraction. */
export const getRoutes: Record<string, Handler> = {
  ...fsGet,
  ...gitReadGet,
  ...llmGet,
}

export const postRoutes: Record<string, Handler> = {
  ...fsPost,
  ...gitWritePost,
  ...gitSyncPost,
  ...branchRemotePost,
  ...llmPost,
}
