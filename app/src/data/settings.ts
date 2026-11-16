// Connected merchant receipts (Idea 10). It's a consent switch, off by default (opt-in), saved in the plan
// state on the backend, so it goes through the input guardrails, shows on the consent screen and resets with
// "Reset demo".
import { useApp, useSnap } from '../store'

/** Whether itemised receipts arrive automatically from connected merchants. */
export function useConnectedReceipts(): boolean {
  return useSnap().consent.connected_receipts ?? false
}

/** Returns a function that turns connected receipts on or off. */
export function useSetConnectedReceipts() {
  const { act } = useApp()
  return (on: boolean) =>
    act('consent', { key: 'connected_receipts', on }, on ? 'Connected receipts on' : 'Connected receipts off')
}
