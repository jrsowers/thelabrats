import type { Metadata } from 'next'
import {
  Eyebrow, SectionHeader, Tag, LiveBadge, StatTile, Card, EmptyState, Skeleton, LabSeal,
} from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Style Guide · The Lab Rats' }

/* Living style guide. Renders from the same tokens the app uses, so it cannot
   drift from reality the way a static spec can. */

const GROUND = ['bg', 'surface', 'surface-2', 'surface-3', 'border', 'border-strong'] as const
const INK = ['text', 'text-muted', 'text-dim'] as const
const SIGNAL = ['brand', 'live', 'win', 'loss', 'warn'] as const
const SERIES = ['series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6'] as const

function Swatch({ token, label }: { token: string; label?: string }) {
  return (
    <div>
      <div
        className="h-14 rounded-md border border-border"
        style={{ background: `var(--${token})` }}
      />
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        --{token}
      </div>
      {label && <div className="text-[10px] text-dim">{label}</div>}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border py-4 last:border-0 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <div className="font-mono text-[10.5px] uppercase tracking-wider text-dim">{label}</div>
      <div>{children}</div>
    </div>
  )
}

export default function StyleGuide() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <header className="field-lines -mx-5 mb-12 border-b border-border px-5 pb-8 sm:-mx-8 sm:px-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Eyebrow>Design System · v1</Eyebrow>
            <h1 className="display mt-2 text-[46px] sm:text-[58px]">Field Lab</h1>
            <p className="mt-3 max-w-lg text-sm text-muted">
              A sports broadcast graphics package, operated by scientists. Precision
              instruments pointed at chaos.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block"><LabSeal size={104} /></div>
        </div>
      </header>

      {/* ---- COLOR ---- */}
      <section className="mb-14">
        <SectionHeader eyebrow="01" title="Color" />
        <p className="mb-5 text-sm text-muted">
          Restrained by default so that color always means something. Signal colors are
          reserved for state — never decoration.
        </p>

        <Eyebrow className="mb-2">Ground</Eyebrow>
        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {GROUND.map((t) => <Swatch key={t} token={t} />)}
        </div>

        <Eyebrow className="mb-2">Ink</Eyebrow>
        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {INK.map((t) => <Swatch key={t} token={t} />)}
        </div>

        <Eyebrow className="mb-2">Signal</Eyebrow>
        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Swatch token="brand" label="Identity, links, active nav" />
          <Swatch token="live" label="In progress" />
          <Swatch token="win" label="Victory, positive delta" />
          <Swatch token="loss" label="Defeat, negative delta" />
          <Swatch token="warn" label="Provisional, championships" />
        </div>

        <Eyebrow className="mb-2">Data series</Eyebrow>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {SERIES.map((t) => <Swatch key={t} token={t} />)}
        </div>
      </section>

      {/* ---- TYPE ---- */}
      <section className="mb-14">
        <SectionHeader eyebrow="02" title="Typography" />
        <p className="mb-2 text-sm text-muted">
          Three voices. <strong className="text-text">Display</strong> is the scoreboard —
          condensed, uppercase, loud. <strong className="text-text">Body</strong> is the
          analyst — neutral and readable. <strong className="text-text">Mono</strong> is the
          instrument label — small, tracked, factual.
        </p>

        <div className="mt-6">
          <Row label="Display / 52">
            <div className="display text-[52px]">Bad Beat of the Week</div>
          </Row>
          <Row label="Display / 34">
            <div className="display text-[34px]">Doug&apos;s Dangerous Team</div>
          </Row>
          <Row label="Score / 40">
            <div className="display text-[40px] tnum">128.4</div>
          </Row>
          <Row label="Eyebrow / 10.5">
            <Eyebrow>Week 07 · Matchup 03</Eyebrow>
          </Row>
          <Row label="Body / 15">
            <p className="text-[15px] leading-relaxed">
              Miller benched a player who scored 28.7 and lost by 4.8. The decision cost
              19.3 points and the matchup.
            </p>
          </Row>
          <Row label="Small / 13">
            <p className="text-[13px] text-muted">Supporting detail and secondary metadata.</p>
          </Row>
          <Row label="Mono / 11">
            <p className="font-mono text-[11px] text-dim">ESPN_TXN_4482 · PROCESSED 10:14 ET</p>
          </Row>
        </div>
      </section>

      {/* ---- COMPONENTS ---- */}
      <section className="mb-14">
        <SectionHeader eyebrow="03" title="Components" />

        <Row label="Tags">
          <div className="flex flex-wrap gap-2">
            <Tag>Final</Tag>
            <LiveBadge />
            <Tag tone="brand">Playoff</Tag>
            <Tag tone="win">Won</Tag>
            <Tag tone="loss">Lost</Tag>
            <Tag tone="warn">Provisional</Tag>
          </div>
        </Row>

        <Row label="Stat tiles">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile label="Points For" value="1,284.6" sub="league high" tone="brand" />
            <StatTile label="Record" value="7–2" sub="2nd seed" />
            <StatTile label="Streak" value="W4" tone="live" />
            <StatTile label="Luck" value="+2.1" sub="wins above expected" tone="loss" />
          </div>
        </Row>

        <Row label="State bars">
          <div className="space-y-1.5">
            {[
              ['var(--live)', 'Live', 'In progress'],
              ['var(--brand)', 'Playoff line', 'Above the cut'],
              ['var(--loss)', 'Eliminated', 'Cannot qualify'],
            ].map(([color, label, desc]) => (
              <div
                key={label}
                className="state-bar flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-2.5"
                style={{ '--state': color } as React.CSSProperties}
              >
                <span className="display text-[15px]">{label}</span>
                <span className="ml-auto text-xs text-muted">{desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-dim">
            State is always carried by a bar <em>and</em> a text label — never color alone.
          </p>
        </Row>

        <Row label="Empty / loading">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card flush><EmptyState title="No transactions this week." hint="Moves appear here once the season opens." /></Card>
            <Card>
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </Card>
          </div>
        </Row>
      </section>

      {/* ---- PRINCIPLES ---- */}
      <section className="mb-10">
        <SectionHeader eyebrow="04" title="Principles" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Scores are the loudest thing', 'Everything else is supporting cast. If a number decides a matchup, it gets display type and tabular figures.'],
            ['Hairlines, not shadows', 'Structure comes from 1px borders. Elevation is reserved for genuine overlays.'],
            ['Color means state', 'Green is live. Red is loss. Blue is identity. Amber is provisional. Nothing is colored to look nice.'],
            ['Tables are good', 'Fantasy players read tables. Do not hide data in cards to look modern.'],
            ['Never blank the scoreboard', 'Preserve existing scores while refreshing. Skeletons on first load only.'],
            ['Provisional is always labeled', 'A mid-week award never masquerades as final.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-border bg-surface p-4">
              <div className="display text-[17px]">{title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border pt-5 font-mono text-[10.5px] text-dim">
        Full rationale: AI-References/STYLE-GUIDE.md
      </footer>
    </main>
  )
}
