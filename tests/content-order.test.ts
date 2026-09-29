/**
 * The archive's lead story must be the most recently published piece.
 *
 * This shipped wrong. `publishedRecaps` sorted by week and then broke ties
 * alphabetically on the series name, under a comment asserting that Monday's
 * preview would sort BELOW Tuesday's recap. `'miracles'.localeCompare('recap')`
 * is negative, so it did the reverse: the Monday preview took the lead-story
 * slot and the newer recap sat underneath it in the grid.
 *
 * Ordering is the most visible thing on that page and the least likely to be
 * unit-tested, which is a bad combination.
 */
import { describe, it, expect } from 'vitest'
import { RECAPS, publishedRecaps, seriesOf, type Recap } from '@/content/recaps'

describe('the archive leads with the newest piece', () => {
  it('orders every published post by publication date, newest first', () => {
    const dates = publishedRecaps().map((r) => r.publishedAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('puts Tuesday’s recap above Monday’s preview from the same week', () => {
    // The exact case that broke: two posts, same week, different series.
    const week3 = publishedRecaps().filter((r) => r.week === 3)
    if (week3.length < 2) return
    expect(seriesOf(week3[0])).toBe('recap')
    expect(seriesOf(week3[1])).toBe('miracles')
  })

  it('does not depend on the series name sorting alphabetically', () => {
    // A future series called "autopsy" would sort first under the old rule
    // no matter when it was published. The date has to be what decides.
    const synthetic: Recap[] = [
      { slug: 'a', series: 'miracles', week: 9, title: 'Older',
        summary: '', publishedAt: '2026-11-01', published: true, body: [] },
      { slug: 'b', series: 'recap', week: 9, title: 'Newer',
        summary: '', publishedAt: '2026-11-02', published: true, body: [] },
    ]
    const sorted = [...synthetic].sort(
      (x, y) => y.publishedAt.localeCompare(x.publishedAt) || y.week - x.week,
    )
    expect(sorted[0].title).toBe('Newer')
  })

  it('gives every published post a sortable ISO date', () => {
    // A malformed date would sort as a string and quietly land anywhere.
    for (const r of RECAPS.filter((x) => x.published)) {
      expect(r.publishedAt, r.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('has no two published posts sharing a slug', () => {
    const slugs = RECAPS.filter((r) => r.published).map((r) => r.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
