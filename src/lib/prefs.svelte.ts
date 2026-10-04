// Per-device preferences. The birth year never leaves this browser.
import { ADULT_AGE, MIN_JOIN_AGE } from '../config'

const KEY = 'vf:prefs'
interface Prefs {
  birthYear: number | null
  showNsfw: boolean
  autoplaySongs: boolean
  showAllNostr: boolean
}
function load(): Prefs {
  const d: Prefs = { birthYear: null, showNsfw: false, autoplaySongs: false, showAllNostr: false }
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return d
  }
}

export const prefs = $state<Prefs>(load())

export function savePrefs() {
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(prefs)))
  } catch {}
}

export function ageOf(birthYear: number | null) {
  return birthYear ? new Date().getFullYear() - birthYear : null
}
export const age = () => ageOf(prefs.birthYear)
export const isAdult = () => (age() ?? 0) >= ADULT_AGE
export const tooYoung = () => prefs.birthYear !== null && (age() ?? 0) < MIN_JOIN_AGE
export const canSeeNsfw = () => isAdult() && prefs.showNsfw
