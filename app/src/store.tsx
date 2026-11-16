// App state: one snapshot from the backend, shared by every screen.
// When Mia approves something, the backend returns a fresh snapshot and every screen updates.
// Each request's guardrail checks go into `runs`, shown in the "Behind the scenes" panel.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, type Check, type Proposal, type Snapshot } from './api'

export type Run = { id: number; time: string; label: string; checks: Check[]; ok: boolean; error?: string }

type Ctx = {
  snap: Snapshot | null
  error: string | null
  busy: boolean
  runs: Run[]
  toast: string | null
  proposals: Record<string, Proposal>
  propose: (kind: string, params?: Record<string, unknown>) => Promise<Proposal | null>
  approve: (id: string) => Promise<boolean>
  act: (kind: string, params?: Record<string, unknown>, toast?: string) => Promise<boolean>
  undo: (id: string) => Promise<void>
  reset: () => Promise<void>
  reload: () => Promise<void>
  say: (msg: string) => void
}

const AppCtx = createContext<Ctx | null>(null)
let runId = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [runs, setRuns] = useState<Run[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Record<string, Proposal>>({})

  const say = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200)
  }, [])

  const log = useCallback((label: string, checks: Check[], err?: string) => {
    const run: Run = { id: ++runId, time: new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit' }), label, checks, ok: !err && checks.every((c) => c.ok), error: err }
    setRuns((r) => [run, ...r].slice(0, 30))
  }, [])

  const reload = useCallback(async () => {
    try {
      setSnap(await api.snapshot())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const guard = useCallback(async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true)
    try {
      return await fn()
    } catch (e) {
      const err = e as ApiError
      log(label, err.checks ?? [], err.message)
      say(err.message)
      if (err.status === 0) setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [log, say])

  const propose = useCallback(async (kind: string, params: Record<string, unknown> = {}) => {
    const p = await guard(`Propose · ${kind.replace(/_/g, ' ')}`, () => api.propose(kind, params))
    if (p) {
      setProposals((all) => ({ ...all, [p.id]: p }))
      log(`Proposed · ${p.title}`, [...p.checks, { layer: 'approve', name: 'Waiting for Mia to approve', ok: true, detail: 'Nothing changes until she does' }])
    }
    return p
  }, [guard, log])

  const approve = useCallback(async (id: string) => {
    const title = proposals[id]?.title ?? 'plan change'
    const r = await guard(`Approve · ${title}`, () => api.approve(id))
    if (!r) return false
    setSnap(r.snapshot)
    // Show the whole journey for this change: the proposal's checks, then the approval
    log(`Approved · ${title}`, [...(proposals[id]?.checks ?? []), ...r.checks])
    return true
  }, [guard, log, proposals])

  const act = useCallback(async (kind: string, params: Record<string, unknown> = {}, msg?: string) => {
    const r = await guard(kind.replace(/_/g, ' '), () => api.action(kind, params))
    if (!r) return false
    setSnap(r.snapshot)
    log(r.title, r.checks)
    if (msg) say(msg)
    return true
  }, [guard, log, say])

  const undo = useCallback(async (id: string) => {
    const r = await guard('Undo', () => api.undo(id))
    if (r) {
      setSnap(r.snapshot)
      log('Undo', r.checks)
      say('Change undone')
    }
  }, [guard, log, say])

  const reset = useCallback(async () => {
    const r = await guard('Reset demo', () => api.reset())
    if (r) {
      setSnap(r.snapshot)
      setRuns([])
      setProposals({})
      say('Demo reset to the start of the story')
    }
  }, [guard, say])

  return (
    <AppCtx.Provider value={{ snap, error, busy, runs, toast, proposals, propose, approve, act, undo, reset, reload, say }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}

/** For screens: the snapshot is always loaded before screens render (see Shell). */
export function useSnap(): Snapshot {
  return useApp().snap!
}
