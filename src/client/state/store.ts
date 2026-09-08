/**
 * Shared panel state container — ONE instance per mount (created inside
 * mountPanel's ctx.effect), never a module-level singleton.
 *
 * Holds the 93 mutable fields that used to live in panel.ts's closure,
 * grouped into domain objects. This is a plain mutable container: NO
 * subscription model, rendering still goes through explicit render() calls.
 *
 * NOTE: AppState holds live objects (HTMLElement / Terminal / FitAddon /
 * ResizeObserver / timer ids) — never JSON-serialize or deep-clone it.
 * @module dsh-solution-explorer/client/state/store
 */

// ─── Domain shapes ──────────────────────────────────────────────────────────

export interface TreeState {
  treeState: any
  loading: boolean
  error: any
  expandedPaths: Set<string>
  selectedPath: string | null
  selectedPaths: Set<string>
  renamingPath: string
  selectionAnchor: string | null
}

export interface SearchState {
  searchQuery: string
  searchResults: any[]
  searching: boolean
  searchTimer: any
}

export interface ClipboardState {
  clipboard: { paths: string[]; mode: 'copy' | 'cut' } | null
  dragPaths: string[]
  dropTargetPath: string | null
}

export interface ScmState {
  gitStatus: any
  gitStatusChanged: boolean
  lastHeadHash: string
  repos: any[]
  activeRepo: string
  gitChangesCount: number
  commitMessage: string
  committing: boolean
  /** Whether an AI commit-message generation is in flight. */
  aiGenerating: boolean
  /** SCM panel section fold state (conflicts/changes/staged/repository/commits). */
  collapsedSections: Set<string>
  /** SCM top/bottom split percentage. */
  scmSplit: number
  scmDragging: boolean
  remotePanelOpen: boolean
  branchPanelOpen: boolean
  remotesList: any[]
  branchesList: any[]
  remoteName: string
  remoteUrl: string
  branchName: string
  branchFrom: string
  branchNewName: string
  tagsList: any[]
}

export interface CommitState {
  commitsPage: number
  commitsAllLoaded: boolean
  commitsLoading: boolean
  commitsHTML: string | null
  commitsSeq: number
  graphLanes: any[]
  graphPrevLanes: any[]
  graphDetailOpen: string
  graphColorInUse: Set<any>
  commitDetailCache: Map<string, any>
  commitTipEl: HTMLElement | null
  commitTipHash: string
  commitTipPending: string
  commitTipShowTimer: any
  commitTipHideTimer: any
  remotesResolved: boolean
}

export interface LayoutState {
  PANEL_WIDTH: number
  panelAutoOpen: boolean
  settingsLoaded: boolean
  panelWidth: number
  panelDragged: boolean
  panelCollapsed: boolean
  panelFrame: any
  panelCol: any
  shellTracks: any[]
  lastGridApplied: string
  styleObs: any
  sizeObs: any
  resizeHandle: any
  mountObs: any
}

export interface TerminalState {
  terminalOpen: boolean
  terminalSupported: boolean
  terminalHeight: number
  terminalMaxHeight: number
  terminalMaxTabs: number
  terminalShell: string
  terminalTabs: any[]
  terminalSeq: number
  terminalBusy: boolean
  terminalActiveTab: number
  terminalShellEl: any
  terminalRebootTimer: any
  terminalStreamOn: boolean
  terminalStreamCtrl: any
  termSizeObserver: any
  termSettleUntil: number
  termLastSize: any
  termInputTimer: any
  termInputPending: Map<any, any>
  termInputInFlight: Map<any, any>
  termInputTail: Map<any, any>
  termOutputFlush: any
}

export interface AppState {
  root: string
  currentTab: 'explorer' | 'search' | 'scm'
  activeEl: HTMLElement | null
  loadSeq: number
  contextMenuEl: HTMLElement | null
  tree: TreeState
  search: SearchState
  clipboard: ClipboardState
  scm: ScmState
  commits: CommitState
  layout: LayoutState
  terminal: TerminalState
}

// ─── Factory ────────────────────────────────────────────────────────────────

/** Default panel width (was PANEL_WIDTH_DEFAULT inside panel.ts). */
export const PANEL_WIDTH_DEFAULT = 280

/** Create a fresh AppState with the original closure initial values. */
export function createInitialState(): AppState {
  return {
    root: '',
    currentTab: 'explorer',
    activeEl: null,
    loadSeq: 0,
    contextMenuEl: null,
    tree: {
      treeState: null,
      loading: false,
      error: null,
      expandedPaths: new Set<string>(),
      selectedPath: null,
      selectedPaths: new Set<string>(),
      renamingPath: '',
      selectionAnchor: null,
    },
    search: {
      searchQuery: '',
      searchResults: [],
      searching: false,
      searchTimer: null,
    },
    clipboard: {
      clipboard: null,
      dragPaths: [],
      dropTargetPath: null,
    },
    scm: {
      gitStatus: null,
      gitStatusChanged: true,
      lastHeadHash: '',
      repos: [],
      activeRepo: '',
      gitChangesCount: 0,
      commitMessage: '',
      committing: false,
      aiGenerating: false,
      collapsedSections: new Set<string>(),
      scmSplit: 55,
      scmDragging: false,
      remotePanelOpen: false,
      branchPanelOpen: false,
      remotesList: [],
      branchesList: [],
      remoteName: '',
      remoteUrl: '',
      branchName: '',
      branchFrom: '',
      branchNewName: '',
      tagsList: [],
    },
    commits: {
      commitsPage: 0,
      commitsAllLoaded: false,
      commitsLoading: false,
      commitsHTML: null,
      commitsSeq: 0,
      graphLanes: [],
      graphPrevLanes: [],
      graphDetailOpen: '',
      graphColorInUse: new Set(),
      commitDetailCache: new Map(),
      commitTipEl: null,
      commitTipHash: '',
      commitTipPending: '',
      commitTipShowTimer: 0,
      commitTipHideTimer: 0,
      remotesResolved: false,
    },
    layout: {
      PANEL_WIDTH: PANEL_WIDTH_DEFAULT,
      panelAutoOpen: true,
      settingsLoaded: false,
      panelWidth: 0,
      panelDragged: false,
      panelCollapsed: false,
      panelFrame: null,
      panelCol: null,
      shellTracks: [],
      lastGridApplied: '',
      styleObs: null,
      sizeObs: null,
      resizeHandle: null,
      mountObs: null,
    },
    terminal: {
      terminalOpen: false,
      terminalSupported: true,
      terminalHeight: 400,
      terminalMaxHeight: 1000,
      terminalMaxTabs: 8,
      terminalShell: '',
      terminalTabs: [],
      terminalSeq: 0,
      terminalBusy: false,
      terminalActiveTab: 0,
      terminalShellEl: null,
      terminalRebootTimer: null,
      terminalStreamOn: false,
      terminalStreamCtrl: null,
      termSizeObserver: null,
      termSettleUntil: 0,
      termLastSize: null,
      termInputTimer: null,
      termInputPending: new Map(),
      termInputInFlight: new Map(),
      termInputTail: new Map(),
      termOutputFlush: null,
    },
  }
}

/** Resolve the git working root: the active repo overrides the session root. */
export function gitRoot(state: AppState): string {
  return state.scm.activeRepo || state.root
}
