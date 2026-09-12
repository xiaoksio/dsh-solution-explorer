/**
 * Commit-graph planning — SCM domain. Pure function over the loaded commit rows.
 * @module dsh-solution-explorer/client/scm/graph
 */

import type { CommitState, CommitRow } from "../state/store.ts"

/** Lane color palette (8 colors; wraps for >8 simultaneous branches). */
const GRAPH_COLORS = ["#e2b714", "#4ec9b0", "#58a6ff", "#d2a8ff", "#ff7b72", "#79c0ff", "#7ee787", "#ffa657"];

/** Drop the selected inline commit detail (called when the list reloads). */
export function resetCommitDetail(commits: CommitState) {
  commits.graphDetailOpen = "";
}

/** One lane's drawing plan for a row. */
export interface GraphLaneDraw {
  x: number
  color: string
  node: boolean
  unpushed: boolean
  hasParent: boolean
  forks: { x: number; color: string }[]
}

/** One row's graph drawing plan (pure: no shared state mutation). */
export interface GraphRowDraw {
  width: number
  transitions: { x1: number; x2: number; color: string }[]
  lanes: GraphLaneDraw[]
}

/**
 * Plan the commit graph for the whole loaded list in one deterministic pass.
 * Every lane lives in local state, so React can render the graph without
 * mutating the store per row.
 * @param rows - loaded commit rows, newest first.
 * @returns one drawing plan per row.
 */
export function planGraph(rows: readonly CommitRow[]): GraphRowDraw[] {
  const laneW = 14, rowH = 20, nodeR = 3;
  void rowH; void nodeR;
  let lanes: { hash: string; color: number }[] = [];
  let prevLanes: { hash: string; color: number }[] = [];
  const inUse = new Set<number>();
  const alloc = (): number => {
    for (let c = 0; c < GRAPH_COLORS.length; c++) if (!inUse.has(c)) { inUse.add(c); return c; }
    return inUse.size % GRAPH_COLORS.length;
  };
  const free = (c: number): void => { inUse.delete(c); };
  const colorOf = (c: number): string => GRAPH_COLORS[c % GRAPH_COLORS.length];

  const out: GraphRowDraw[] = [];
  for (const commit of rows) {
    const parents = commit.parents ?? [];
    let idx = lanes.findIndex((l) => l.hash === commit.hash);
    if (idx === -1) { idx = lanes.length; lanes = lanes.concat([{ hash: commit.hash, color: alloc() }]); }
    const nodeColor = lanes[idx].color;

    const nextLanes = lanes.slice();
    nextLanes.splice(idx, 1);
    if (parents[0]) nextLanes.splice(idx, 0, { hash: parents[0], color: nodeColor });
    else free(nodeColor);

    const forks: { hash: string; color: number; x: number }[] = [];
    for (let p = 1; p < parents.length; p++) {
      const color = alloc();
      forks.push({ hash: parents[p], color, x: (nextLanes.length + forks.length) * laneW + laneW / 2 });
    }

    const transitions: { x1: number; x2: number; color: string }[] = [];
    prevLanes.forEach((pl, pi) => {
      const ci = lanes.findIndex((l) => l.hash === pl.hash);
      if (ci !== -1 && ci !== pi) {
        transitions.push({ x1: pi * laneW + laneW / 2, x2: ci * laneW + laneW / 2, color: colorOf(pl.color) });
      }
    });

    const laneDraws: GraphLaneDraw[] = lanes.map((lane, i) => ({
      x: i * laneW + laneW / 2,
      color: colorOf(lane.color),
      node: i === idx,
      unpushed: i === idx && !!commit.unpushed,
      hasParent: i === idx && !!parents[0],
      forks: i === idx ? forks.map((f) => ({ x: f.x, color: colorOf(f.color) })) : [],
    }));

    out.push({ width: Math.max(laneW, (nextLanes.length + forks.length) * laneW), transitions, lanes: laneDraws });

    prevLanes = lanes.slice();
    lanes = nextLanes;
    for (const f of forks) lanes.push({ hash: f.hash, color: f.color });
  }
  return out;
}
