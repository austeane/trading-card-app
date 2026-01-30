import { describe, it, expect } from 'vitest'
import {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_TYPES,
  ALLOWED_RENDER_TYPES,
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_CAPTION_LENGTH,
  MAX_PHOTOGRAPHER_LENGTH,
  MAX_TEAM_LENGTH,
  MAX_POSITION_LENGTH,
  JERSEY_PATTERN,
} from '../validation'

describe('Upload constraints', () => {
  it('MAX_UPLOAD_BYTES is 15MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(15 * 1024 * 1024)
  })

  it('ALLOWED_UPLOAD_TYPES includes common image formats', () => {
    expect(ALLOWED_UPLOAD_TYPES).toContain('image/jpeg')
    expect(ALLOWED_UPLOAD_TYPES).toContain('image/png')
    expect(ALLOWED_UPLOAD_TYPES).toContain('image/webp')
  })

  it('ALLOWED_RENDER_TYPES is PNG only', () => {
    expect(ALLOWED_RENDER_TYPES).toEqual(['image/png'])
  })
})

describe('Field length constraints', () => {
  it('name length is reasonable', () => {
    expect(MAX_NAME_LENGTH).toBeGreaterThanOrEqual(20)
    expect(MAX_NAME_LENGTH).toBeLessThanOrEqual(100)
  })

  it('title length is reasonable', () => {
    expect(MAX_TITLE_LENGTH).toBeGreaterThanOrEqual(20)
    expect(MAX_TITLE_LENGTH).toBeLessThanOrEqual(100)
  })

  it('caption length is larger than title', () => {
    expect(MAX_CAPTION_LENGTH).toBeGreaterThan(MAX_TITLE_LENGTH)
  })

  it('photographer length allows reasonable credits', () => {
    expect(MAX_PHOTOGRAPHER_LENGTH).toBeGreaterThanOrEqual(20)
  })

  it('team length allows long team names', () => {
    expect(MAX_TEAM_LENGTH).toBeGreaterThanOrEqual(32)
  })

  it('position length is reasonable', () => {
    expect(MAX_POSITION_LENGTH).toBeGreaterThanOrEqual(16)
  })
})

describe('JERSEY_PATTERN', () => {
  it('accepts single digit', () => {
    expect(JERSEY_PATTERN.test('0')).toBe(true)
    expect(JERSEY_PATTERN.test('1')).toBe(true)
    expect(JERSEY_PATTERN.test('9')).toBe(true)
  })

  it('accepts double digits', () => {
    expect(JERSEY_PATTERN.test('00')).toBe(true)
    expect(JERSEY_PATTERN.test('10')).toBe(true)
    expect(JERSEY_PATTERN.test('42')).toBe(true)
    expect(JERSEY_PATTERN.test('99')).toBe(true)
  })

  it('rejects three digits', () => {
    expect(JERSEY_PATTERN.test('100')).toBe(false)
    expect(JERSEY_PATTERN.test('999')).toBe(false)
  })

  it('rejects non-numeric', () => {
    expect(JERSEY_PATTERN.test('ab')).toBe(false)
    expect(JERSEY_PATTERN.test('1a')).toBe(false)
    expect(JERSEY_PATTERN.test('a1')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(JERSEY_PATTERN.test('')).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(JERSEY_PATTERN.test('-1')).toBe(false)
    expect(JERSEY_PATTERN.test('-10')).toBe(false)
  })

  it('rejects decimal numbers', () => {
    expect(JERSEY_PATTERN.test('1.5')).toBe(false)
    expect(JERSEY_PATTERN.test('0.1')).toBe(false)
  })

  it('rejects whitespace', () => {
    expect(JERSEY_PATTERN.test(' 1')).toBe(false)
    expect(JERSEY_PATTERN.test('1 ')).toBe(false)
    expect(JERSEY_PATTERN.test(' 1 ')).toBe(false)
  })
})
