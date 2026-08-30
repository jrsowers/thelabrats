/**
 * Browser-side audit. Runs inside the page via page.evaluate, so it must be
 * completely self-contained — no imports, no closure over Node scope.
 */

export interface Offender {
  selector: string
  text: string
  right: number
  width: number
}

export interface TapTarget {
  selector: string
  text: string
  w: number
  h: number
}

export interface AuditResult {
  docScrollWidth: number
  viewportWidth: number
  overflows: Offender[]
  smallTapTargets: TapTarget[]
  bottomNavHeight: number
  contentClearsBottomNav: boolean
}

/** Serialised as a string into the browser; keep it dependency-free. */
export const auditFn = (opts: { minTap: number }) => {
  const vw = document.documentElement.clientWidth

  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.')
      : ''
    return `${tag}${id}${cls}`
  }

  const textOf = (el: Element) =>
    (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)

  /**
   * An element wider than the viewport is fine if an ancestor scrolls
   * horizontally — that is the wrapped-table pattern, deliberate and good.
   */
  const insideScroller = (el: Element): boolean => {
    let p = el.parentElement
    while (p && p !== document.documentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true
      p = p.parentElement
    }
    return false
  }

  const overflows: Offender[] = []
  const seen = new Set<string>()

  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return
    // Fixed/sticky chrome is positioned against the viewport, not the flow.
    if (cs.position === 'fixed') return

    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return

    // 1px of tolerance for subpixel rounding.
    if (r.right > vw + 1 || r.left < -1) {
      if (insideScroller(el)) return
      const key = describe(el) + '|' + Math.round(r.right)
      if (seen.has(key)) return
      seen.add(key)
      overflows.push({
        selector: describe(el),
        text: textOf(el),
        right: Math.round(r.right),
        width: Math.round(r.width),
      })
    }
  })

  // Tap targets. WCAG 2.5.8 puts the floor at 24px; Apple and Google both ask
  // for 44 on touch. The caller passes whichever applies to this viewport.
  const smallTapTargets: TapTarget[] = []
  document.querySelectorAll('a[href], button, select, [role="button"]').forEach((el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    if (el.hasAttribute('aria-disabled')) return
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    if (r.width < opts.minTap || r.height < opts.minTap) {
      smallTapTargets.push({
        selector: describe(el), text: textOf(el),
        w: Math.round(r.width), h: Math.round(r.height),
      })
    }
  })

  // The fixed bottom bar must not sit on top of the last of the content.
  //
  // Identified by shape, not by tag: fixed, flush to the bottom, spanning the
  // width, and short. The desktop side rail is also fixed with bottom:0 — it is
  // excluded because it also touches the top and is nowhere near full width.
  const bottomNav = Array.from(document.querySelectorAll('nav, footer')).find((n) => {
    const cs = getComputedStyle(n)
    if (cs.position !== 'fixed') return false
    const r = n.getBoundingClientRect()
    const flush = Math.abs(r.bottom - window.innerHeight) <= 2
    const wide = r.width >= vw * 0.8
    const short = r.height <= window.innerHeight * 0.35
    return flush && wide && short
  })
  const bottomNavHeight = bottomNav ? Math.round(bottomNav.getBoundingClientRect().height) : 0

  let contentClearsBottomNav = true
  if (bottomNav) {
    const navTop = bottomNav.getBoundingClientRect().top
    const root = document.querySelector('main') || document.body

    // Scrolled fully down, the last line of real content must still be legible
    // above the bar. Measuring the padded container instead would be circular:
    // its own bottom padding is the very clearance we are trying to verify.
    window.scrollTo(0, document.documentElement.scrollHeight)

    let lowest = -Infinity
    root.querySelectorAll('*').forEach((el) => {
      if (el.children.length > 0) return                  // leaves only
      if (!(el.textContent || '').trim()) return          // that carry text
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return
      // Skip anything inside fixed chrome. The nav's own labels are not
      // content, and measuring them would make this check always fail.
      let a: Element | null = el
      while (a && a !== document.body) {
        if (getComputedStyle(a).position === 'fixed') return
        a = a.parentElement
      }
      const r = el.getBoundingClientRect()
      if (r.height === 0) return
      lowest = Math.max(lowest, r.bottom)
    })

    contentClearsBottomNav = lowest === -Infinity || lowest <= navTop + 1
    window.scrollTo(0, 0)
  }

  return {
    docScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: vw,
    overflows,
    smallTapTargets,
    bottomNavHeight,
    contentClearsBottomNav,
  } as AuditResult
}
