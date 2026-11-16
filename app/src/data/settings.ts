// App settings shared across screens. Kept in the browser (localStorage) so a refresh remembers them;
// if storage is blocked the app still works with the defaults.
import { useSyncExternalStore } from 'react'

const KEY = 'harbour.connectedReceipts'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

let connected = read() // Connected merchant receipts: OFF by default (opt-in)
const listeners = new Set<() => void>()

export function setConnectedReceipts(on: boolean) {
  connected = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // storage blocked: keep it for this session only
  }
  listeners.forEach((l) => l())
}

/** Whether itemised receipts arrive automatically from connected merchants. */
export function useConnectedReceipts(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => connected,
  )
}
