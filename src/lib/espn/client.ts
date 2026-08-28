/**
 * The ONLY place in the app that talks to ESPN over the network (spec §6).
 *
 * Server-only. Importing this from a client component is a bug — credentials
 * and undocumented payload shapes must never reach the browser.
 */
import { ESPN_BASE } from './constants'
import { EspnHttpError, EspnValidationError } from './errors'
import { leagueResponseSchema, type LeagueResponse } from './schemas'

export interface EspnClientConfig {
  leagueId: number
  season: number
  /** Optional. This league is public; kept so a flip to private is config, not code. */
  swid?: string
  espnS2?: string
  /** Serve from /fixtures instead of the network (spec §16). */
  demoMode?: boolean
  fetchImpl?: typeof fetch
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 400

export class EspnClient {
  constructor(private readonly config: EspnClientConfig) {}

  private get baseUrl() {
    const { leagueId, season } = this.config
    return `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}`
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT }
    const { swid, espnS2 } = this.config
    // Only send cookies if BOTH are present — a half-set cookie pair fails in
    // confusing ways that look like an ESPN outage.
    if (swid && espnS2) h.Cookie = `SWID=${swid}; espn_s2=${espnS2}`
    return h
  }

  /**
   * Fetch one or more views. Views are additive: passing several returns a
   * single merged payload, which is also one request instead of several.
   */
  async getViews(views: string[], params: Record<string, string | number> = {}): Promise<LeagueResponse> {
    const url = new URL(this.baseUrl)
    for (const v of views) url.searchParams.append('view', v)
    for (const [k, val] of Object.entries(params)) url.searchParams.set(k, String(val))

    const raw = await this.fetchWithRetry(url.toString())
    const parsed = leagueResponseSchema.safeParse(raw)
    if (!parsed.success) {
      // Spec §43: diagnose, fail the sync, corrupt nothing.
      throw new EspnValidationError(views.join('+'), parsed.error.issues)
    }
    return parsed.data
  }

  private async fetchWithRetry(url: string): Promise<unknown> {
    const doFetch = this.config.fetchImpl ?? fetch
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await doFetch(url, { headers: this.headers, cache: 'no-store' })
        if (!res.ok) {
          const body = await res.text().catch(() => undefined)
          const err = new EspnHttpError(res.status, url, body?.slice(0, 500))
          // Auth failures and 404s will not fix themselves on retry.
          if (!err.isRetryable) throw err
          lastError = err
        } else {
          return await res.json()
        }
      } catch (err) {
        if (err instanceof EspnHttpError && !err.isRetryable) throw err
        lastError = err
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BASE_BACKOFF_MS * 2 ** (attempt - 1)))
      }
    }
    throw lastError
  }
}

/** Build a client from environment. Server-side only. */
export function createEspnClientFromEnv(): EspnClient {
  const leagueId = Number(process.env.ESPN_LEAGUE_ID)
  const season = Number(process.env.ESPN_SEASON)
  if (!Number.isFinite(leagueId) || !Number.isFinite(season)) {
    throw new Error('ESPN_LEAGUE_ID and ESPN_SEASON must be set')
  }
  return new EspnClient({
    leagueId,
    season,
    swid: process.env.ESPN_SWID || undefined,
    espnS2: process.env.ESPN_S2 || undefined,
    demoMode: process.env.DEMO_MODE === 'true',
  })
}
