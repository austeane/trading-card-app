import { describe, it, expect } from 'vitest'
import {
  isRecord,
  isCardStatus,
  isSafeId,
  isCardType,
  toNumber,
  toRotateDeg,
  clamp,
  normalizeString,
  ensureMaxLength,
  buildStatusCreatedAt,
  pickCrop,
  isValidDimension,
  isValidCropRect,
  validatePhotoKeys,
  validateCardFields,
  getSubmitValidationError,
  CARD_TYPES,
} from '../helpers'
import type { Card } from 'shared'

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('returns false for arrays', () => {
    expect(isRecord([])).toBe(false)
    expect(isRecord([1, 2, 3])).toBe(false)
  })

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('returns false for primitives', () => {
    expect(isRecord('string')).toBe(false)
    expect(isRecord(123)).toBe(false)
    expect(isRecord(true)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
  })
})

describe('isCardStatus', () => {
  it('returns true for valid statuses', () => {
    expect(isCardStatus('draft')).toBe(true)
    expect(isCardStatus('submitted')).toBe(true)
    expect(isCardStatus('rendered')).toBe(true)
  })

  it('returns false for invalid statuses', () => {
    expect(isCardStatus('pending')).toBe(false)
    expect(isCardStatus('deleted')).toBe(false)
    expect(isCardStatus('')).toBe(false)
    expect(isCardStatus(null)).toBe(false)
  })
})

describe('isSafeId', () => {
  it('accepts valid IDs', () => {
    expect(isSafeId('abc')).toBe(true)
    expect(isSafeId('abc-123')).toBe(true)
    expect(isSafeId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true)
  })

  it('rejects short IDs', () => {
    expect(isSafeId('ab')).toBe(false)
    expect(isSafeId('a')).toBe(false)
    expect(isSafeId('')).toBe(false)
  })

  it('rejects IDs with uppercase', () => {
    expect(isSafeId('ABC')).toBe(false)
    expect(isSafeId('Abc')).toBe(false)
  })

  it('rejects IDs with special characters', () => {
    expect(isSafeId('abc/def')).toBe(false)
    expect(isSafeId('abc..def')).toBe(false)
    expect(isSafeId('abc_def')).toBe(false)
    expect(isSafeId('abc def')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isSafeId(123)).toBe(false)
    expect(isSafeId(null)).toBe(false)
    expect(isSafeId(undefined)).toBe(false)
  })
})

describe('isCardType', () => {
  it('accepts valid card types', () => {
    for (const type of CARD_TYPES) {
      expect(isCardType(type)).toBe(true)
    }
  })

  it('rejects invalid types', () => {
    expect(isCardType('unknown')).toBe(false)
    expect(isCardType('')).toBe(false)
    expect(isCardType(null)).toBe(false)
  })
})

describe('toNumber', () => {
  it('returns numbers as-is', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber(0)).toBe(0)
    expect(toNumber(-5)).toBe(-5)
    expect(toNumber(3.14)).toBe(3.14)
  })

  it('parses numeric strings', () => {
    expect(toNumber('42')).toBe(42)
    expect(toNumber('3.14')).toBe(3.14)
    expect(toNumber('-5')).toBe(-5)
  })

  it('returns undefined for non-numeric', () => {
    expect(toNumber('abc')).toBeUndefined()
    expect(toNumber('')).toBeUndefined()
    expect(toNumber('   ')).toBeUndefined()
    expect(toNumber(null)).toBeUndefined()
    expect(toNumber(undefined)).toBeUndefined()
    expect(toNumber({})).toBeUndefined()
  })

  it('returns undefined for Infinity/NaN', () => {
    expect(toNumber(Infinity)).toBeUndefined()
    expect(toNumber(-Infinity)).toBeUndefined()
    expect(toNumber(NaN)).toBeUndefined()
  })
})

describe('toRotateDeg', () => {
  it('returns valid rotation values', () => {
    expect(toRotateDeg(0)).toBe(0)
    expect(toRotateDeg(90)).toBe(90)
    expect(toRotateDeg(180)).toBe(180)
    expect(toRotateDeg(270)).toBe(270)
  })

  it('returns undefined for invalid rotations', () => {
    expect(toRotateDeg(45)).toBeUndefined()
    expect(toRotateDeg(360)).toBeUndefined()
    expect(toRotateDeg(-90)).toBeUndefined()
  })

  it('parses string rotations', () => {
    expect(toRotateDeg('90')).toBe(90)
    expect(toRotateDeg('180')).toBe(180)
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('normalizeString', () => {
  it('trims whitespace', () => {
    expect(normalizeString('  hello  ')).toBe('hello')
    expect(normalizeString('hello')).toBe('hello')
  })

  it('returns undefined for empty strings', () => {
    expect(normalizeString('')).toBeUndefined()
    expect(normalizeString('   ')).toBeUndefined()
  })

  it('returns undefined for non-strings', () => {
    expect(normalizeString(123)).toBeUndefined()
    expect(normalizeString(null)).toBeUndefined()
    expect(normalizeString(undefined)).toBeUndefined()
  })
})

describe('ensureMaxLength', () => {
  it('returns null for valid length', () => {
    expect(ensureMaxLength('hello', 10, 'field')).toBeNull()
    expect(ensureMaxLength('hello', 5, 'field')).toBeNull()
  })

  it('returns error for too long', () => {
    const result = ensureMaxLength('hello world', 5, 'name')
    expect(result).toBe('name must be 5 characters or fewer')
  })
})

describe('buildStatusCreatedAt', () => {
  it('builds composite key', () => {
    const result = buildStatusCreatedAt('draft', '2026-01-01T00:00:00.000Z')
    expect(result).toBe('draft#2026-01-01T00:00:00.000Z')
  })
})

describe('pickCrop', () => {
  it('returns undefined for non-objects', () => {
    expect(pickCrop(null)).toBeUndefined()
    expect(pickCrop('string')).toBeUndefined()
    expect(pickCrop(123)).toBeUndefined()
  })

  it('returns undefined for missing required fields', () => {
    expect(pickCrop({ x: 0, y: 0, w: 0.5 })).toBeUndefined()
    expect(pickCrop({ x: 0, y: 0, h: 0.5 })).toBeUndefined()
  })

  it('parses valid crop', () => {
    const result = pickCrop({ x: 0.1, y: 0.2, w: 0.5, h: 0.6 })
    expect(result).toEqual({ x: 0.1, y: 0.2, w: 0.5, h: 0.6, rotateDeg: 0 })
  })

  it('clamps x and y to [0, 1]', () => {
    expect(pickCrop({ x: -0.5, y: 1.5, w: 0.5, h: 0.5 })).toMatchObject({
      x: 0,
      y: 1,
    })
  })

  it('clamps w and h to [0.001, 1]', () => {
    expect(pickCrop({ x: 0, y: 0, w: 0, h: -0.5 })).toMatchObject({
      w: 0.001,
      h: 0.001,
    })
  })

  it('clamps crop to not exceed image bounds', () => {
    const result = pickCrop({ x: 0.8, y: 0.9, w: 0.5, h: 0.5 })
    expect(result?.w).toBeCloseTo(0.2, 10) // 1 - 0.8
    expect(result?.h).toBeCloseTo(0.1, 10) // 1 - 0.9
  })

  it('parses rotation', () => {
    expect(pickCrop({ x: 0, y: 0, w: 1, h: 1, rotateDeg: 90 })).toMatchObject({
      rotateDeg: 90,
    })
    expect(pickCrop({ x: 0, y: 0, w: 1, h: 1, rotateDeg: 270 })).toMatchObject({
      rotateDeg: 270,
    })
  })

  it('defaults rotation to 0', () => {
    expect(pickCrop({ x: 0, y: 0, w: 1, h: 1 })).toMatchObject({
      rotateDeg: 0,
    })
  })

  it('ignores invalid rotation', () => {
    expect(pickCrop({ x: 0, y: 0, w: 1, h: 1, rotateDeg: 45 })).toMatchObject({
      rotateDeg: 0,
    })
  })
})

describe('isValidDimension', () => {
  it('returns true for positive numbers', () => {
    expect(isValidDimension(100)).toBe(true)
    expect(isValidDimension(1)).toBe(true)
    expect(isValidDimension(0.5)).toBe(true)
  })

  it('returns false for zero or negative', () => {
    expect(isValidDimension(0)).toBe(false)
    expect(isValidDimension(-100)).toBe(false)
  })

  it('returns false for non-numbers', () => {
    expect(isValidDimension('100')).toBe(false)
    expect(isValidDimension(null)).toBe(false)
    expect(isValidDimension(Infinity)).toBe(false)
  })
})

describe('isValidCropRect', () => {
  const validCrop = { x: 0.1, y: 0.1, w: 0.8, h: 0.8, rotateDeg: 0 as const }

  it('returns true for valid crop', () => {
    expect(isValidCropRect(validCrop)).toBe(true)
  })

  it('returns false for undefined', () => {
    expect(isValidCropRect(undefined)).toBe(false)
  })

  it('returns false for invalid rotation', () => {
    expect(isValidCropRect({ ...validCrop, rotateDeg: 45 as unknown as 0 })).toBe(false)
  })

  it('returns false for negative x or y', () => {
    expect(isValidCropRect({ ...validCrop, x: -0.1 })).toBe(false)
    expect(isValidCropRect({ ...validCrop, y: -0.1 })).toBe(false)
  })

  it('returns false for x or y > 1', () => {
    expect(isValidCropRect({ ...validCrop, x: 1.1 })).toBe(false)
    expect(isValidCropRect({ ...validCrop, y: 1.1 })).toBe(false)
  })

  it('returns false for non-positive w or h', () => {
    expect(isValidCropRect({ ...validCrop, w: 0 })).toBe(false)
    expect(isValidCropRect({ ...validCrop, h: -0.1 })).toBe(false)
  })

  it('returns false for w or h > 1', () => {
    expect(isValidCropRect({ ...validCrop, w: 1.1 })).toBe(false)
    expect(isValidCropRect({ ...validCrop, h: 1.1 })).toBe(false)
  })

  it('returns false when crop extends beyond bounds', () => {
    expect(isValidCropRect({ x: 0.5, y: 0.5, w: 0.6, h: 0.5, rotateDeg: 0 })).toBe(false)
    expect(isValidCropRect({ x: 0.5, y: 0.5, w: 0.5, h: 0.6, rotateDeg: 0 })).toBe(false)
  })
})

describe('validatePhotoKeys', () => {
  it('returns null for no photo', () => {
    expect(validatePhotoKeys('card-123', undefined)).toBeNull()
  })

  it('returns null for valid keys', () => {
    expect(
      validatePhotoKeys('card-123', {
        originalKey: 'uploads/original/card-123/photo.jpg',
        cropKey: 'uploads/crop/card-123/crop.jpg',
      })
    ).toBeNull()
  })

  it('returns error for wrong originalKey prefix', () => {
    expect(
      validatePhotoKeys('card-123', {
        originalKey: 'uploads/original/other-card/photo.jpg',
      })
    ).toBe('originalKey must belong to this card')
  })

  it('returns error for wrong cropKey prefix', () => {
    expect(
      validatePhotoKeys('card-123', {
        cropKey: 'uploads/crop/other-card/crop.jpg',
      })
    ).toBe('cropKey must belong to this card')
  })
})

describe('validateCardFields', () => {
  it('returns null for valid fields', () => {
    expect(
      validateCardFields({
        firstName: 'John',
        lastName: 'Doe',
        position: 'Chaser',
        jerseyNumber: '7',
      })
    ).toBeNull()
  })

  it('returns error for firstName too long', () => {
    const result = validateCardFields({ firstName: 'a'.repeat(51) })
    expect(result).toContain('firstName')
    expect(result).toContain('50')
  })

  it('returns error for invalid jersey number', () => {
    expect(validateCardFields({ jerseyNumber: '100' })).toBe(
      'jerseyNumber must be 1-2 digits'
    )
    expect(validateCardFields({ jerseyNumber: 'abc' })).toBe(
      'jerseyNumber must be 1-2 digits'
    )
  })

  it('accepts valid jersey numbers', () => {
    expect(validateCardFields({ jerseyNumber: '7' })).toBeNull()
    expect(validateCardFields({ jerseyNumber: '00' })).toBeNull()
    expect(validateCardFields({ jerseyNumber: '99' })).toBeNull()
  })
})

describe('getSubmitValidationError', () => {
  const createValidCard = (overrides?: Partial<Card>): Card =>
    ({
      id: 'test-id',
      tournamentId: 'test-tournament',
      cardType: 'player',
      status: 'draft',
      firstName: 'John',
      lastName: 'Doe',
      teamId: 'team-1',
      teamName: 'Team One',
      position: 'Chaser',
      photographer: 'Test Photographer',
      photo: {
        originalKey: 'uploads/original/test-id/photo.jpg',
        width: 1200,
        height: 1600,
        crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8, rotateDeg: 0 },
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    }) as Card

  it('returns null for valid player card', () => {
    expect(getSubmitValidationError(createValidCard())).toBeNull()
  })

  it('returns error for missing tournamentId', () => {
    expect(getSubmitValidationError(createValidCard({ tournamentId: '' }))).toBe(
      'tournamentId is required before submitting'
    )
  })

  it('returns error for missing cardType', () => {
    expect(
      getSubmitValidationError(createValidCard({ cardType: '' as unknown as Card['cardType'] }))
    ).toBe('cardType is required before submitting')
  })

  it('returns error for missing photo', () => {
    expect(getSubmitValidationError(createValidCard({ photo: undefined }))).toBe(
      'photo is required before submitting'
    )
  })

  it('returns error for missing photo dimensions', () => {
    expect(
      getSubmitValidationError(
        createValidCard({
          photo: {
            originalKey: 'uploads/original/test-id/photo.jpg',
            width: undefined,
            height: 1600,
            crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8, rotateDeg: 0 },
          },
        })
      )
    ).toBe('photo dimensions are required before submitting')
  })

  it('returns error for rare card without title', () => {
    expect(
      getSubmitValidationError(
        createValidCard({
          cardType: 'rare',
          title: undefined,
        })
      )
    ).toBe('title is required before submitting')
  })

  it('returns null for valid rare card', () => {
    expect(
      getSubmitValidationError(
        createValidCard({
          cardType: 'rare',
          title: 'Rare Moment',
        })
      )
    ).toBeNull()
  })

  it('returns error for player without team', () => {
    expect(
      getSubmitValidationError(
        createValidCard({
          cardType: 'player',
          teamId: '',
          teamName: '',
        })
      )
    ).toBe('team is required before submitting')
  })
})
