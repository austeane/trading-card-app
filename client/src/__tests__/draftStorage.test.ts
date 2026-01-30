import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveDraft, loadDraft, clearDraft, type SavedDraft } from '../draftStorage'

const createValidDraft = (overrides?: Partial<SavedDraft>): SavedDraft => ({
  cardId: 'test-card-id',
  editToken: 'test-edit-token',
  tournamentId: 'test-tournament',
  cardType: 'player',
  form: {
    teamId: 'team-alpha',
    position: 'Chaser',
    jerseyNumber: '7',
    firstName: 'Test',
    lastName: 'Player',
    title: '',
    caption: '',
    photographer: 'Test Photographer',
    templateId: 'classic',
  },
  savedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('saveDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves draft to localStorage', () => {
    const draft = createValidDraft()
    saveDraft(draft)

    const stored = localStorage.getItem('trading-card-draft')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toEqual(draft)
  })

  it('overwrites existing draft', () => {
    const draft1 = createValidDraft({ cardId: 'card-1' })
    const draft2 = createValidDraft({ cardId: 'card-2' })

    saveDraft(draft1)
    saveDraft(draft2)

    const stored = localStorage.getItem('trading-card-draft')
    expect(JSON.parse(stored!).cardId).toBe('card-2')
  })

  it('handles localStorage errors silently', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    setItemSpy.mockImplementation(() => {
      throw new Error('Storage full')
    })

    const draft = createValidDraft()
    // Should not throw
    expect(() => saveDraft(draft)).not.toThrow()

    setItemSpy.mockRestore()
  })
})

describe('loadDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no draft exists', () => {
    const result = loadDraft()
    expect(result).toBeNull()
  })

  it('loads valid draft from localStorage', () => {
    const draft = createValidDraft()
    localStorage.setItem('trading-card-draft', JSON.stringify(draft))

    const result = loadDraft()
    expect(result).toEqual(draft)
  })

  it('loads draft with photo metadata', () => {
    const draft = createValidDraft({
      photo: {
        key: 'uploads/original/test-card-id/abc123.jpg',
        width: 1200,
        height: 1600,
        crop: {
          x: 0.1,
          y: 0.1,
          w: 0.8,
          h: 0.8,
          rotateDeg: 0,
        },
      },
    })
    localStorage.setItem('trading-card-draft', JSON.stringify(draft))

    const result = loadDraft()
    expect(result?.photo).toEqual(draft.photo)
  })

  it('returns null and clears for invalid JSON', () => {
    localStorage.setItem('trading-card-draft', 'not valid json{')

    const result = loadDraft()
    expect(result).toBeNull()
    expect(localStorage.getItem('trading-card-draft')).toBeNull()
  })

  it('returns null and clears for missing cardId', () => {
    const draft = createValidDraft()
    // @ts-expect-error Testing invalid data
    delete draft.cardId
    localStorage.setItem('trading-card-draft', JSON.stringify(draft))

    const result = loadDraft()
    expect(result).toBeNull()
    expect(localStorage.getItem('trading-card-draft')).toBeNull()
  })

  it('returns null and clears for missing editToken', () => {
    const draft = createValidDraft()
    // @ts-expect-error Testing invalid data
    delete draft.editToken
    localStorage.setItem('trading-card-draft', JSON.stringify(draft))

    const result = loadDraft()
    expect(result).toBeNull()
    expect(localStorage.getItem('trading-card-draft')).toBeNull()
  })

  it('returns null and clears for missing tournamentId', () => {
    const draft = createValidDraft()
    // @ts-expect-error Testing invalid data
    delete draft.tournamentId
    localStorage.setItem('trading-card-draft', JSON.stringify(draft))

    const result = loadDraft()
    expect(result).toBeNull()
    expect(localStorage.getItem('trading-card-draft')).toBeNull()
  })

  it('handles localStorage errors silently', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    getItemSpy.mockImplementation(() => {
      throw new Error('Access denied')
    })

    const result = loadDraft()
    expect(result).toBeNull()

    getItemSpy.mockRestore()
  })
})

describe('clearDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes draft from localStorage', () => {
    const draft = createValidDraft()
    localStorage.setItem('trading-card-draft', JSON.stringify(draft))

    clearDraft()
    expect(localStorage.getItem('trading-card-draft')).toBeNull()
  })

  it('does nothing when no draft exists', () => {
    // Should not throw
    expect(() => clearDraft()).not.toThrow()
  })

  it('handles localStorage errors silently', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
    removeItemSpy.mockImplementation(() => {
      throw new Error('Access denied')
    })

    // Should not throw
    expect(() => clearDraft()).not.toThrow()

    removeItemSpy.mockRestore()
  })
})

describe('draft roundtrip', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save and load preserves all fields', () => {
    const draft = createValidDraft({
      photo: {
        key: 'uploads/original/test-card-id/abc123.jpg',
        width: 2400,
        height: 3200,
        crop: {
          x: 0.15,
          y: 0.2,
          w: 0.7,
          h: 0.6,
          rotateDeg: 90,
        },
      },
    })

    saveDraft(draft)
    const loaded = loadDraft()

    expect(loaded).toEqual(draft)
  })

  it('clear removes saved draft', () => {
    const draft = createValidDraft()

    saveDraft(draft)
    expect(loadDraft()).not.toBeNull()

    clearDraft()
    expect(loadDraft()).toBeNull()
  })
})
