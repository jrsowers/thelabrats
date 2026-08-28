import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Manual "Sync ESPN Now" (§40).
 *
 * Authenticated with the same CRON_SECRET as the scheduler — there are no user
 * accounts, so a shared secret is the whole auth model. It is passed as a form
 * field rather than a query string so it never lands in browser history, server
 * access logs, or a Referer header.
 */
export async function POST(request: Request) {
  const form = await request.formData()
  const provided = String(form.get('key') ?? '')
  const secret = process.env.CRON_SECRET

  if (!secret || provided !== secret) {
    return NextResponse.redirect(new URL('/admin?error=1', request.url), 303)
  }

  const { syncLeague } = await import('@/lib/ingest/syncLeague')
  const { syncPlayers } = await import('@/lib/ingest/syncPlayers')
  const { createEspnClientFromEnv } = await import('@/lib/espn/client')

  const league = await syncLeague('manual')
  await syncPlayers(createEspnClientFromEnv())

  const url = new URL('/admin', request.url)
  url.searchParams.set(league.ok ? 'synced' : 'failed', '1')
  return NextResponse.redirect(url, 303)
}
