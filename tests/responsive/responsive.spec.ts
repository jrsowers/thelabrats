import { test, expect } from '@playwright/test'
import { discoverRoutes } from './routes'
import { auditFn } from './audit'

/**
 * Responsive contract.
 *
 * Every page, at every viewport we support, must:
 *   1. not scroll horizontally
 *   2. keep every element inside the viewport (unless deliberately in a
 *      horizontally scrollable container)
 *   3. keep tap targets at or above the WCAG 2.5.8 floor of 24px
 *   4. not hide the end of its content behind the fixed mobile nav
 *
 * Routes come from the filesystem, so a new page is covered the moment it
 * exists. Nobody has to remember to add it here.
 */

export const VIEWPORTS = [
  { name: 'mobile-sm', width: 320, height: 720, touch: true },  // iPhone SE (1st gen)
  { name: 'mobile',    width: 390, height: 844, touch: true },  // iPhone 14/15
  { name: 'tablet',    width: 768, height: 1024, touch: true }, // iPad portrait
  { name: 'laptop',    width: 1024, height: 768, touch: false },
  { name: 'desktop',   width: 1440, height: 900, touch: false },
] as const

const routes = discoverRoutes()

test('every dynamic route has a sample param', () => {
  const unresolved = routes.filter((r) => r.missing.length > 0)
  expect(
    unresolved,
    `Add a sample value to DYNAMIC_SAMPLES in tests/responsive/routes.ts for: ` +
      unresolved.map((r) => `${r.missing.join(',')} (${r.source})`).join('; '),
  ).toEqual([])
})

test('route discovery found the expected pages', () => {
  // A canary: if this drops to near-zero the walker broke and every other
  // test in this file would vacuously pass.
  expect(routes.length).toBeGreaterThanOrEqual(8)
})

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}px)`, () => {
    // hasTouch is what makes `@media (pointer: coarse)` match, which is how
    // .tap-target knows to grow. Setting only the viewport size would test a
    // desktop pointer at a phone width — a device that does not exist.
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch })

    const minTap = vp.touch ? 44 : 24

    for (const { route } of routes) {
      test(`${route} is responsive`, async ({ page }) => {
        const response = await page.goto(route, { waitUntil: 'networkidle' })
        expect(response?.status(), `${route} did not load`).toBeLessThan(400)

        // Webfonts change metrics; measuring before they settle gives
        // false readings in both directions.
        await page.evaluate(() => document.fonts.ready)

        const result = await page.evaluate(auditFn, { minTap })

        const fmt = (list: { selector: string; text: string }[]) =>
          list.map((o) => `\n    ${o.selector}\n      "${o.text}"`).join('')

        expect(
          result.overflows,
          `${route} @ ${vp.width}px — ${result.overflows.length} element(s) ` +
            `outside the viewport:${fmt(result.overflows)}\n`,
        ).toEqual([])

        expect(
          result.docScrollWidth,
          `${route} @ ${vp.width}px scrolls horizontally ` +
            `(${result.docScrollWidth}px of content in a ${result.viewportWidth}px viewport)`,
        ).toBeLessThanOrEqual(result.viewportWidth + 1)

        expect(
          result.smallTapTargets,
          `${route} @ ${vp.width}px — tap target(s) below the ${minTap}px ` +
            `floor for this device class. Add \`tap-target\` to:` +
            `${fmt(result.smallTapTargets)}\n`,
        ).toEqual([])

        expect(
          result.contentClearsBottomNav,
          `${route} @ ${vp.width}px — the end of the content sits behind the ` +
            `fixed bottom nav (${result.bottomNavHeight}px tall). ` +
            `Increase the bottom padding on the content container.`,
        ).toBe(true)
      })
    }
  })
}
