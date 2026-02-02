import type { FeedbackLogEntry } from 'shared'

const FEEDBACK_LOG_KEY = 'trading-card-feedback-log'
const FEEDBACK_SESSION_KEY = 'trading-card-feedback-session'
const MAX_ENTRIES = 60

const getStorage = () => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const getFeedbackSessionId = (): string => {
  if (typeof window === 'undefined') return 'unknown'

  const storage = getStorage()
  try {
    const existing = storage?.getItem(FEEDBACK_SESSION_KEY)
    if (existing) return existing

    const id =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`
    storage?.setItem(FEEDBACK_SESSION_KEY, id)
    return id
  } catch {
    return 'unknown'
  }
}

const readLog = (): FeedbackLogEntry[] => {
  try {
    const stored = localStorage.getItem(FEEDBACK_LOG_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry) => entry && typeof entry === 'object') as FeedbackLogEntry[]
  } catch {
    return []
  }
}

export const getFeedbackLog = (): FeedbackLogEntry[] => readLog()

export const recordFeedbackEvent = (event: string, data?: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return

  try {
    const next = readLog()
    next.push({
      at: new Date().toISOString(),
      event,
      data,
    })

    if (next.length > MAX_ENTRIES) {
      next.splice(0, next.length - MAX_ENTRIES)
    }

    localStorage.setItem(FEEDBACK_LOG_KEY, JSON.stringify(next))
  } catch {
    // Storage may be unavailable - fail silently.
  }
}

export const clearFeedbackLog = (): void => {
  try {
    localStorage.removeItem(FEEDBACK_LOG_KEY)
  } catch {
    // ignore
  }
}
