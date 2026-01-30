import { describe, it, expect } from 'vitest'
import { resolveTemplateId, findTemplate, DEFAULT_TEMPLATE_ID } from '../templates'
import type { TournamentConfig } from '../types'

const createMockConfig = (
  overrides?: Partial<TournamentConfig>
): TournamentConfig => ({
  id: 'test-tournament',
  name: 'Test Tournament',
  year: 2026,
  branding: {
    tournamentLogoKey: 'logo.png',
  },
  teams: [],
  cardTypes: [],
  templates: [
    { id: 'classic', label: 'Classic' },
    { id: 'noir', label: 'Noir' },
    { id: 'rare-special', label: 'Rare Special' },
  ],
  defaultTemplates: {
    fallback: 'classic',
    byCardType: {
      rare: 'rare-special',
    },
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('resolveTemplateId', () => {
  it('returns explicit templateId when provided', () => {
    const config = createMockConfig()
    const result = resolveTemplateId({ templateId: 'noir' }, config)
    expect(result).toBe('noir')
  })

  it('trims whitespace from templateId', () => {
    const config = createMockConfig()
    const result = resolveTemplateId({ templateId: '  noir  ' }, config)
    expect(result).toBe('noir')
  })

  it('ignores empty string templateId', () => {
    const config = createMockConfig()
    const result = resolveTemplateId({ templateId: '', cardType: 'player' }, config)
    expect(result).toBe('classic') // Falls back to fallback
  })

  it('uses byCardType when templateId is not provided', () => {
    const config = createMockConfig()
    const result = resolveTemplateId({ cardType: 'rare' }, config)
    expect(result).toBe('rare-special')
  })

  it('uses fallback when cardType has no specific mapping', () => {
    const config = createMockConfig()
    const result = resolveTemplateId({ cardType: 'player' }, config)
    expect(result).toBe('classic')
  })

  it('uses DEFAULT_TEMPLATE_ID when no config provided', () => {
    const result = resolveTemplateId({ cardType: 'player' }, null)
    expect(result).toBe(DEFAULT_TEMPLATE_ID)
  })

  it('uses DEFAULT_TEMPLATE_ID when config has no defaultTemplates', () => {
    const config = createMockConfig({ defaultTemplates: undefined })
    const result = resolveTemplateId({ cardType: 'player' }, config)
    expect(result).toBe(DEFAULT_TEMPLATE_ID)
  })

  it('prioritizes explicit templateId over cardType mapping', () => {
    const config = createMockConfig()
    // rare cardType would normally resolve to 'rare-special'
    const result = resolveTemplateId({ templateId: 'noir', cardType: 'rare' }, config)
    expect(result).toBe('noir')
  })

  it('handles null templateId', () => {
    const config = createMockConfig()
    const result = resolveTemplateId({ templateId: null, cardType: 'player' }, config)
    expect(result).toBe('classic')
  })
})

describe('findTemplate', () => {
  it('finds template by ID', () => {
    const config = createMockConfig()
    const result = findTemplate(config, 'noir')
    expect(result).toEqual({ id: 'noir', label: 'Noir' })
  })

  it('returns null for unknown template ID', () => {
    const config = createMockConfig()
    const result = findTemplate(config, 'unknown')
    expect(result).toBeNull()
  })

  it('returns null when config is null', () => {
    const result = findTemplate(null, 'classic')
    expect(result).toBeNull()
  })

  it('returns null when config is undefined', () => {
    const result = findTemplate(undefined, 'classic')
    expect(result).toBeNull()
  })

  it('returns null when templateId is null', () => {
    const config = createMockConfig()
    const result = findTemplate(config, null)
    expect(result).toBeNull()
  })

  it('returns null when templateId is undefined', () => {
    const config = createMockConfig()
    const result = findTemplate(config, undefined)
    expect(result).toBeNull()
  })

  it('returns null when config has no templates', () => {
    const config = createMockConfig({ templates: undefined })
    const result = findTemplate(config, 'classic')
    expect(result).toBeNull()
  })

  it('returns null when templates array is empty', () => {
    const config = createMockConfig({ templates: [] })
    const result = findTemplate(config, 'classic')
    expect(result).toBeNull()
  })
})
