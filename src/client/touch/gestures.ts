/**
 * Panel touch gestures — swipe to collapse/expand the right column.
 *
 * Pure decision function + a thin binder, so the thresholds are unit-testable.
 * The gesture is horizontal-dominant only: vertical scrolls and scrollers
 * that consume horizontal pans (diff view, terminal, code editor) are left
 * alone. It binds passively and never preventDefault — it only observes.
 * @module dsh-solution-explorer/client/touch/gestures
 */

/** Distance the finger must travel before a direction is confirmed. */
export const SWIPE_DIRECTION_CONFIRM = 24
/** Horizontal distance that triggers collapse/expand. */
export const SWIPE_TRIGGER = 48
/**
 * Right-edge zone (px) where an inward swipe opens the closed panel. Wide on
 * purpose: the outermost ~56 CSS px of a phone edge belong to the system's
 * full-screen (back) gesture — a swipe starting there never reaches the page.
 * A narrow zone forces the finger onto that strip, so opens are eaten by the
 * launcher more often than they land.
 */
export const EDGE_OPEN_ZONE = 120

export interface SwipeDecideInput {
  /** Total horizontal delta, positive = rightward. */
  dx: number
  /** Total vertical delta (absolute value). */
  dy: number
  /** True when the touch started inside a scroller that owns horizontal pans. */
  scrollerConsumes: boolean
  /** True when the panel column is currently folded to the rail. */
  collapsed: boolean
}

export type SwipeDecision = 'collapse' | 'expand' | null

/**
 * Decide what a completed touch swipe means for the panel column.
 * Horizontal must dominate, direction must be confirmed, and the trigger
 * distance reached. A swipe inside a horizontal scroller never collapses.
 */
export function decidePanelSwipe({ dx, dy, scrollerConsumes, collapsed }: SwipeDecideInput): SwipeDecision {
  if (scrollerConsumes) return null
  if (Math.abs(dx) < SWIPE_DIRECTION_CONFIRM) return null
  if (Math.abs(dx) <= Math.abs(dy)) return null
  if (Math.abs(dx) < SWIPE_TRIGGER) return null
  // Rightward on the expanded panel → fold; leftward on the rail → unfold.
  if (dx > 0 && !collapsed) return 'collapse'
  if (dx < 0 && collapsed) return 'expand'
  return null
}

/**
 * Selectors of elements that legitimately own horizontal panning inside the
 * panel: the terminal, syntax-highlighted/diff code blocks and any explicit
 * horizontal scroller.
 */
const SCROLLER_EXCLUDE = '.sol-exp-terminal, .sol-exp-hl'

function touchScrollerConsumes(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null
  if (el === null) return false
  if (el.closest(SCROLLER_EXCLUDE) !== null) return true
  // A container explicitly flagged as a horizontal scroller owns its pans.
  if (el.closest('[data-sol-exp-hscroll]') !== null) return true
  let node: HTMLElement | null = el instanceof HTMLElement ? el : el.parentElement
  while (node !== null) {
    if (node.scrollWidth > node.clientWidth + 1 && node.clientWidth > 0) {
      const ov = getComputedStyle(node).overflowX
      if (ov === 'auto' || ov === 'scroll' || ov === 'hidden') return true
    }
    node = node.parentElement
  }
  return false
}

export interface PanelSwipeHandlers {
  onCollapse(): void
  onExpand(): void
  /** When false the binder is inert (e.g. dsh-mobile-layout owns the screen). */
  enabled(): boolean
  /** Current fold state of the panel column. */
  collapsed(): boolean
}

/**
 * Bind observe-only swipe listeners to the panel column element.
 * Returns a disposer. All listeners are passive: the gesture never blocks
 * scrolling, it just measures start/end points.
 */
export function bindPanelSwipe(el: HTMLElement, handlers: PanelSwipeHandlers): () => void {
  let startX = 0
  let startY = 0
  let tracking = false
  let scrollerConsumes = false

  const onStart = (e: TouchEvent) => {
    if (!handlers.enabled()) { tracking = false; return }
    const touch = e.touches[0]
    if (!touch) return
    tracking = true
    startX = touch.clientX
    startY = touch.clientY
    scrollerConsumes = touchScrollerConsumes(e.target)
  }

  const onEnd = (e: TouchEvent) => {
    if (!tracking) return
    tracking = false
    const touch = e.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY
    const collapsed = handlers.collapsed()
    const decision = decidePanelSwipe({ dx, dy, scrollerConsumes, collapsed })
    if (decision === 'collapse') handlers.onCollapse()
    else if (decision === 'expand') handlers.onExpand()
  }

  el.addEventListener('touchstart', onStart, { passive: true })
  el.addEventListener('touchend', onEnd, { passive: true })
  el.addEventListener('touchcancel', () => { tracking = false }, { passive: true })
  return () => {
    el.removeEventListener('touchstart', onStart)
    el.removeEventListener('touchend', onEnd)
    el.removeEventListener('touchcancel', () => { tracking = false })
  }
}

/**
 * Bind a right-edge inward swipe that expands the collapsed panel. On a phone
 * the closed column has zero width — nothing to swipe on — so the open
 * gesture lives on the document instead: start within the edge zone, end
 * leftward-dominant past the trigger.
 * @returns a disposer.
 */
export function bindEdgeSwipeOpen(handlers: PanelSwipeHandlers): () => void {
  let startX = 0
  let startY = 0
  let tracking = false
  let scrollerConsumes = false

  const inZone = (x: number): boolean =>
    x >= window.innerWidth - EDGE_OPEN_ZONE

  const onStart = (e: TouchEvent) => {
    if (!handlers.enabled() || !handlers.collapsed()) { tracking = false; return }
    const touch = e.touches[0]
    if (!touch) return
    tracking = inZone(touch.clientX)
    if (!tracking) return
    // The native right column fullscreen owns horizontal swipes (the mobile
    // layout plugin runs its own exit gesture on it) — an open on top of that
    // would break the one-column-at-a-time rule.
    if (document.querySelector('[data-rightbar-fullscreen]') !== null) { tracking = false; return }
    // A horizontal scroller under the finger (PDF pages, wide sheets) owns
    // its pans: the zone is wide enough now to cover real content edges.
    scrollerConsumes = touchScrollerConsumes(e.target)
    startX = touch.clientX
    startY = touch.clientY
  }

  const onEnd = (e: TouchEvent) => {
    if (!tracking) return
    tracking = false
    const touch = e.changedTouches[0]
    if (!touch) return
    const decision = decidePanelSwipe({
      dx: touch.clientX - startX,
      dy: touch.clientY - startY,
      scrollerConsumes,
      collapsed: true,
    })
    if (decision === 'expand') handlers.onExpand()
  }

  // Capture phase: the mobile layout plugin observes gestures at window
  // level, and any stopPropagation there would keep a bubble-phase listener
  // on `document` from ever firing.
  document.addEventListener('touchstart', onStart, { passive: true, capture: true })
  document.addEventListener('touchend', onEnd, { passive: true, capture: true })
  document.addEventListener('touchcancel', () => { tracking = false }, { passive: true, capture: true })
  return () => {
    document.removeEventListener('touchstart', onStart, { capture: true } as EventListenerOptions)
    document.removeEventListener('touchend', onEnd, { capture: true } as EventListenerOptions)
    document.removeEventListener('touchcancel', () => { tracking = false }, { capture: true } as EventListenerOptions)
  }
}
