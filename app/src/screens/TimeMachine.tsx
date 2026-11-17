// Time machine. Two parts:
// 1. Notes to future you: write a question or a wish, pick the year, and it is sealed until then.
//    Only you can open and answer it. When it opens, you say whether it happened, and Windy offers to help plan it.
// 2. A message from future you about the rent trade-off, using the engine's figures (same as Your options).
// In the demo a sealed note can be opened early so the flow can be shown.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Capsule, type NoteCheck } from '../api'
import { Card, Chip, Lock, Seg, TopBar, WindyPill } from '../components/ui'
import { money, shortDate } from '../format'
import { useApp, useSnap } from '../store'

const OPENERS: Record<string, string> = {
  A: 'I went. Two weeks, too much ramen, zero regrets.',
  B: 'I did not pick a favourite, and honestly both goals are still alive.',
  C: 'I am writing this from a flat inspection. It has a balcony.',
}
const CLOSERS: Record<string, string> = {
  A: 'The home deposit took longer. I knew that when I chose it.',
  B: 'Nothing moved far. It was the calm option and it felt like it.',
  C: 'Japan had to wait. It is still on the list, just later.',
}
const ANSWERS = { done: 'I did it', not_yet: 'Not yet', dropped: 'I don’t want this any more' } as const

export default function TimeMachine() {
  const nav = useNavigate()
  const s = useSnap()
  const { act, busy } = useApp()
  const [when, setWhen] = useState(`${s.this_year + 5}${s.today.slice(4)}`)
  const [who, setWho] = useState<'Me' | 'A friend'>('Me')
  const [friend, setFriend] = useState('Danica')
  const [text, setText] = useState('')
  const full = (iso: string) => `${shortDate(iso)} ${iso.slice(0, 4)}`
  const okWhen = when > s.today
  const okFriend = who === 'Me' || friend.trim().length > 0
  const [open, setOpen] = useState<number | null>(null)
  const [sealed, setSealed] = useState<{ text: string; when: string; check: NoteCheck | null } | null>(null)
  const [ask, setAsk] = useState<NoteCheck | null>(null) // the year in the note differs from the date: which one?
  const [checking, setChecking] = useState(false)
  const DAY = 864e5
  // Rough guide: what the matched goal would need each payday to be ready by the opening date
  const needed = (g: NonNullable<NoteCheck['goal']>, by: string) => {
    const n = Math.floor((Date.parse(by) - Date.parse(s.everyday.next_payday)) / (14 * DAY)) + 1
    return n > 0 ? Math.ceil(Math.max(0, g.target - g.saved) / n) : null
  }
  const byYear = [...new Set(s.capsules.map((c) => c.year))].sort((a, b) => a - b)
  const opts = s.tradeoff.options
  const [pick, setPick] = useState(opts[0]?.name ?? '')
  const o = opts.find((x) => x.name === pick) ?? opts[0]

  const seal = async () => {
    const t = text.trim()
    await write(t, when, true)
  }
  // Windy reads the note first: is the year right, is it a goal, does it match a goal she has?
  const write = async (t: string, date: string, checkYear: boolean) => {
    setChecking(true)
    const check = await api.capsuleCheck(t, date).catch(() => null)
    setChecking(false)
    if (check && check.mismatch && checkYear) { setAsk(check); return }
    setAsk(null)
    const params: Record<string, unknown> = { open_date: date, text: t }
    if (who === 'A friend') params.from_name = friend.trim()
    if (check) { params.kind = check.kind; if (check.goal) params.goal_id = check.goal.id }
    if (await act('capsule_write', params, `Sealed until ${full(date)}`)) { setSealed(who === 'Me' ? { text: t, when: date, check } : null); setText(''); setOpen(Number(date.slice(0, 4))) }
  }
  const plan = (c: Pick<Capsule, 'text'>) => nav('/chat', { state: { q: `I wrote this to my future self: "${c.text}". Can you help me plan for it?` } })

  return (
    <>
      <TopBar title="Time machine" fallback="/insights/tools" />

      <Card variant="windy">
        <WindyPill label="Note to future you" />
        <h2 style={{ marginTop: 8 }}>Ask yourself in a few years</h2>
        <p>Write a wish or a question. It stays sealed until the day you pick, and only you can open and answer it. A friend can send you one too.</p>
        <div className="spread" style={{ marginBottom: 8 }}>
          <span>From</span>
          <Seg options={['Me', 'A friend']} value={who} onChange={setWho} />
        </div>
        {who === 'A friend' && (
          <label className="spread" style={{ gap: 8, marginBottom: 8 }}>
            <span>Their name <span className="small">(demo)</span></span>
            <input className="field" style={{ width: 170 }} value={friend} onChange={(e) => setFriend(e.target.value)} maxLength={30} aria-label="Friend’s name" />
          </label>
        )}
        <textarea className="field" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={who === 'Me' ? 'I want my own place in five years. Will I have made it?' : 'Did we ever take that trip together?'} aria-label="The note" />
        <label className="spread" style={{ marginTop: 8, gap: 8 }}>
          <span>Open it on</span>
          <input className="field" style={{ width: 170 }} type="date" min={s.today} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Opening date" />
        </label>
        {!okWhen && <div className="small" style={{ color: 'var(--bad)', marginTop: 4 }}>Pick a date in the future.</div>}
        {ask && ask.text_year && (
          <div className="ideas" style={{ margin: '10px 0 0' }}>
            <b>Which year did you mean?</b>
            <p className="small" style={{ margin: '4px 0 8px' }}>Your note says {ask.text_year}, but the opening date is in {ask.open_year}.</p>
            <div className="hstack">
              <button className="btn outline" style={{ flex: 1 }} disabled={busy || checking} onClick={() => { const d = `${ask.text_year}${when.slice(4)}`; setWhen(d); write(text.trim(), d, false) }}>Open in {ask.text_year}</button>
              <button className="btn outline" style={{ flex: 1 }} disabled={busy || checking} onClick={() => write(text.trim(), when, false)}>Keep {ask.open_year}</button>
            </div>
          </div>
        )}
        {!ask && <button className="btn primary block" style={{ marginTop: 10 }} disabled={busy || checking || text.trim().length < 3 || !okWhen || !okFriend} onClick={seal}>{checking ? 'Windy is reading it…' : who === 'Me' ? 'Seal it' : `Seal it from ${friend.trim() || 'a friend'}`}</button>}
      </Card>

      {sealed && sealed.check?.kind === 'message' && (
        <Card>
          <h3>Sealed</h3>
          <p className="small" style={{ margin: '2px 0 8px' }}>Windy read this as a note, not a goal, so there is nothing to plan. It will be waiting for you on {full(sealed.when)}.</p>
          <button className="btn ghost block" onClick={() => setSealed(null)}>OK</button>
        </Card>
      )}
      {sealed && sealed.check?.kind !== 'message' && sealed.check?.goal && (() => {
        const g = sealed.check.goal
        const need = needed(g, sealed.when)
        return (
          <Card>
            <h3>Sealed. This sounds like your {g.name} goal</h3>
            <div className="row"><span>Saved so far</span><b>{money(g.saved)} of {money(g.target)}</b></div>
            <div className="row"><span>On your plan</span><b>{g.reached ? `Reached ${g.reached_label}` : g.reached_label}</b></div>
            <div className="row"><span>Your note opens</span><b>{full(sealed.when)}</b></div>
            <p style={{ marginTop: 8 }}>
              {g.on_time
                ? 'Your plan gets there before the note opens. Future you should have good news.'
                : need !== null
                  ? <>Your plan gets there after the note opens. About <b>{money(need)}</b> a payday would make it in time. You add {money(g.per_payday)} now.</>
                  : 'Your plan gets there after the note opens.'}
            </p>
            <div className="hstack">
              {!g.on_time && <button className="btn primary" style={{ flex: 1 }} onClick={() => nav(`/goals/${g.id}`)}>Adjust this goal</button>}
              <button className={g.on_time ? 'btn primary' : 'btn outline'} style={g.on_time ? { flex: 1 } : undefined} onClick={() => plan({ text: sealed.text })}>Ask Windy</button>
              <button className="btn ghost" onClick={() => setSealed(null)}>Not now</button>
            </div>
          </Card>
        )
      })()}
      {sealed && sealed.check?.kind !== 'message' && !sealed.check?.goal && (
        <Card>
          <h3>Sealed. Want a head start?</h3>
          <p className="small" style={{ margin: '2px 0 8px' }}>This sounds like a goal you don’t have yet. Windy can help you plan for it now, so future you has a better answer.</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => plan({ text: sealed.text })}>Help me plan it</button>
            <button className="btn outline" onClick={() => nav('/goals/new')}>Start a goal</button>
            <button className="btn ghost" onClick={() => setSealed(null)}>Not now</button>
          </div>
        </Card>
      )}

      {byYear.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 16 }}><h3>Your years</h3></div>
          <div className="year-row">
            {byYear.map((y) => {
              const list = s.capsules.filter((c) => c.year === y)
              const sealed = list.some((c) => !c.opened)
              return (
                <button key={y} className={`year-tile ${open === y ? 'on' : ''}`} onClick={() => setOpen(open === y ? null : y)}>
                  <b>{y}</b>
                  <span>{list.length} note{list.length === 1 ? '' : 's'} · {y < s.this_year || (y === s.this_year && !sealed) ? 'past' : sealed ? 'sealed' : 'opened'}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {open !== null && s.capsules.filter((c) => c.year === open).map((c) => (
        <Card key={c.id} variant={c.opened ? 'selected' : undefined}>
          <div className="spread"><h3>{c.from ? `From ${c.from}` : 'From me'} · {full(c.open_date)}</h3><Chip tone={c.opened ? 'good' : 'warn'}>{c.opened ? 'Opened' : 'Sealed'}</Chip></div>
          {!c.opened ? (
            <>
              <p className="small" style={{ margin: '4px 0 8px' }}>{c.from ? `${c.from} wrote this` : 'Written'} on {full(c.written)}. Opens on {full(c.open_date)}{c.from ? `, the day ${c.from} chose` : ''}. Only you can read it then.</p>
              {c.open_date <= s.today
                ? <button className="btn primary block" disabled={busy} onClick={() => act('capsule_open', { id: c.id }, 'Your note is open.')}>Open it</button>
                : <button className="btn outline block" disabled={busy} onClick={() => act('capsule_open', { id: c.id }, `It is ${full(c.open_date)}. Your note is open.`)}>Demo: jump to {full(c.open_date)} and open it</button>}
            </>
          ) : (
            <>
              <p style={{ marginTop: 8 }}>“{c.text}”</p>
              <p className="small">{c.from ? `${c.from} wrote this` : 'You wrote this'} on {full(c.written)}.</p>
              {c.goal_id && s.goals.find((g) => g.id === c.goal_id) && (() => {
                const g = s.goals.find((x) => x.id === c.goal_id)!
                return <div className="row"><span>{g.name} today</span><b>{money(g.saved)} of {money(g.target)}</b></div>
              })()}
              {c.kind === 'message' ? (
                <p className="small" style={{ marginBottom: 0 }}>Just a note. Nothing to answer.</p>
              ) : c.answer === null ? (
                <>
                  <div style={{ margin: '8px 0 6px', fontWeight: 600 }}>So, did it happen?</div>
                  <div className="stack" style={{ gap: 6 }}>
                    {(Object.keys(ANSWERS) as (keyof typeof ANSWERS)[]).map((a) => (
                      <button key={a} className="btn outline block" disabled={busy} onClick={() => act('capsule_answer', { id: c.id, answer: a })}>{ANSWERS[a]}</button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="row"><span>Your answer</span><b>{ANSWERS[c.answer]}</b></div>
                  {c.answer === 'done' && <p style={{ marginBottom: 0 }}>You told yourself you would, and you did. Windy has nothing to add.</p>}
                  {c.answer === 'dropped' && <p style={{ marginBottom: 0 }}>That is fine. Plans change, and you get to decide what still matters.</p>}
                  {c.answer === 'not_yet' && (
                    <>
                      <p>Not yet is not never. Want Windy to help you make a plan for it?</p>
                      <div className="hstack">
                        <button className="btn primary" style={{ flex: 1 }} onClick={() => plan(c)}>Help me plan it</button>
                        {c.goal_id
                          ? <button className="btn outline" onClick={() => nav(`/goals/${c.goal_id}`)}>Adjust the goal</button>
                          : <button className="btn outline" onClick={() => nav('/goals/new')}>Start a goal</button>}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Card>
      ))}

      {!s.tradeoff.no_conflict && o && (
        <>
          <div className="section-head" style={{ marginTop: 18 }}><h3>A message from 2028</h3></div>
          <div style={{ marginBottom: 12 }}><Seg options={opts.map((x) => x.name)} value={o.name} onChange={setPick} /></div>
          <Card>
            <WindyPill label={`From you, 2028 · ${o.name}`} />
            <p style={{ marginTop: 10 }}>Hi {s.user.first_name}. It’s me. {OPENERS[o.id]}</p>
            <p>Back in 2026 the rent went up {money(s.tradeoff.rent_rise_per_fortnight)} a fortnight and I chose “{o.name}”. {o.summary}</p>
            {o.rows.map((r) => <div key={r.label} className="row"><span>{r.label}</span><b style={{ color: r.tone === 'good' ? 'var(--good)' : r.tone === 'warn' ? 'var(--warn)' : 'var(--bad)' }}>{r.value}</b></div>)}
            <p style={{ marginTop: 10, marginBottom: 0 }}>{CLOSERS[o.id]}</p>
            <button className="link" style={{ marginTop: 8 }} onClick={() => nav('/goals/options')}>Compare the plans side by side ›</button>
          </Card>
        </>
      )}

      <Lock>Your notes are private to you. Numbers in the 2028 message come from the calculator. The voice is Windy having fun.</Lock>
    </>
  )
}
