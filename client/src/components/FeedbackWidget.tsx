import { useCallback, useMemo, useState } from 'react'
import type { FeedbackContext, FeedbackPayload } from 'shared'
import { api, writeHeaders } from '../api'
import { loadDraft } from '../draftStorage'
import { getFeedbackLog, getFeedbackSessionId, recordFeedbackEvent } from '../feedbackLog'

const MAX_MESSAGE_LENGTH = 2000

const IconMessage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
)

const buildContext = (): FeedbackContext => {
  const draft = loadDraft()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return {
    sessionId: getFeedbackSessionId(),
    url: window.location.href,
    path: window.location.pathname,
    app: {
      env: import.meta.env.MODE,
      basePath: import.meta.env.VITE_BASE_PATH ?? '',
      apiBase: api(''),
    },
    device: {
      userAgent: navigator.userAgent,
      platform: navigator.platform || undefined,
      language: navigator.language,
      languages: navigator.languages ?? undefined,
      timezone,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      online: navigator.onLine,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? undefined,
      hardwareConcurrency: navigator.hardwareConcurrency ?? undefined,
    },
    draft: draft
      ? {
          cardId: draft.cardId,
          tournamentId: draft.tournamentId,
          cardType: draft.cardType,
          hasPhoto: Boolean(draft.photo),
          savedAt: draft.savedAt,
        }
      : undefined,
    logs: getFeedbackLog(),
  }
}

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [includeContext, setIncludeContext] = useState(true)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const logCount = useMemo(() => getFeedbackLog().length, [isOpen])

  const openModal = () => {
    setIsOpen(true)
    setStatus('idle')
    setError(null)
    recordFeedbackEvent('feedback_opened')
  }

  const closeModal = () => {
    setIsOpen(false)
    setStatus('idle')
    setError(null)
  }

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed) {
      setError('Please add a short description before sending.')
      return
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Feedback must be ${MAX_MESSAGE_LENGTH} characters or fewer.`)
      return
    }

    setStatus('sending')
    setError(null)

    const payload: FeedbackPayload = {
      message: trimmed,
      context: includeContext ? buildContext() : undefined,
    }

    try {
      const res = await fetch(api('/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...writeHeaders },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to send feedback.')
      }

      setStatus('sent')
      recordFeedbackEvent('feedback_sent', { includeContext, length: trimmed.length })
      setMessage('')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to send feedback.')
      recordFeedbackEvent('feedback_failed', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [includeContext, message])

  return (
    <>
      <button type="button" className="studio-btn feedback-fab" onClick={openModal}>
        <IconMessage />
        Give feedback
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-content feedback-modal">
            <div className="feedback-header">
              <div>
                <div className="modal-title">Send feedback</div>
                <p className="modal-description">
                  Share what happened or what you expected. We will include device/browser details and recent
                  in-app actions (no photos or form text).
                </p>
              </div>
              <button type="button" className="studio-btn studio-btn-ghost studio-btn-sm" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="divider" />

            <label className="studio-label" htmlFor="feedback-message">
              What should we know?
              <span className="studio-label-required">*</span>
            </label>
            <textarea
              id="feedback-message"
              className="studio-input feedback-textarea"
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Describe the issue or suggestion..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="feedback-meta">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </div>

            <label className="feedback-checkbox">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(event) => setIncludeContext(event.target.checked)}
              />
              Include technical details (device info + {logCount} recent actions)
            </label>

            {error ? <div className="studio-error">{error}</div> : null}
            {status === 'sent' ? (
              <div className="feedback-success">Thanks! Your feedback was sent.</div>
            ) : null}

            <div className="feedback-actions">
              <button type="button" className="studio-btn studio-btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="studio-btn studio-btn-primary"
                onClick={handleSubmit}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default FeedbackWidget
