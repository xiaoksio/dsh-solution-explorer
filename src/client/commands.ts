/**
 * Module-level command registry for the solution-explorer panel.
 *
 * The panel used to publish every view command as a `window.__solExp*` global
 * so inline `onclick` strings and cross-module callers could reach it. The
 * views are React components now and call their actions through this registry
 * instead, so nothing is attached to `window`.
 * @module dsh-solution-explorer/client/commands
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- registry of heterogeneous command handlers */
export const commands: Record<string, any> = {}
