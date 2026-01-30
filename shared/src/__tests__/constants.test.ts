import { describe, it, expect } from 'vitest'
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_ASPECT,
  TRIM_INSET_PX,
  SAFE_INSET_PX,
  TRIM_BOX,
  SAFE_BOX,
  GUIDE_PERCENTAGES,
} from '../constants'

describe('Card dimensions', () => {
  it('has correct card dimensions', () => {
    expect(CARD_WIDTH).toBe(825)
    expect(CARD_HEIGHT).toBe(1125)
  })

  it('has correct aspect ratio', () => {
    expect(CARD_ASPECT).toBeCloseTo(CARD_WIDTH / CARD_HEIGHT)
  })
})

describe('Print geometry', () => {
  it('has positive insets', () => {
    expect(TRIM_INSET_PX).toBeGreaterThan(0)
    expect(SAFE_INSET_PX).toBeGreaterThan(0)
  })

  it('safe inset is larger than trim inset', () => {
    expect(SAFE_INSET_PX).toBeGreaterThan(TRIM_INSET_PX)
  })
})

describe('TRIM_BOX', () => {
  it('is within card bounds', () => {
    expect(TRIM_BOX.x).toBeGreaterThanOrEqual(0)
    expect(TRIM_BOX.y).toBeGreaterThanOrEqual(0)
    expect(TRIM_BOX.x + TRIM_BOX.w).toBeLessThanOrEqual(CARD_WIDTH)
    expect(TRIM_BOX.y + TRIM_BOX.h).toBeLessThanOrEqual(CARD_HEIGHT)
  })

  it('has positive dimensions', () => {
    expect(TRIM_BOX.w).toBeGreaterThan(0)
    expect(TRIM_BOX.h).toBeGreaterThan(0)
  })

  it('is derived from TRIM_INSET_PX', () => {
    expect(TRIM_BOX.x).toBe(TRIM_INSET_PX)
    expect(TRIM_BOX.y).toBe(TRIM_INSET_PX)
    expect(TRIM_BOX.w).toBe(CARD_WIDTH - 2 * TRIM_INSET_PX)
    expect(TRIM_BOX.h).toBe(CARD_HEIGHT - 2 * TRIM_INSET_PX)
  })
})

describe('SAFE_BOX', () => {
  it('is within card bounds', () => {
    expect(SAFE_BOX.x).toBeGreaterThanOrEqual(0)
    expect(SAFE_BOX.y).toBeGreaterThanOrEqual(0)
    expect(SAFE_BOX.x + SAFE_BOX.w).toBeLessThanOrEqual(CARD_WIDTH)
    expect(SAFE_BOX.y + SAFE_BOX.h).toBeLessThanOrEqual(CARD_HEIGHT)
  })

  it('is within trim box', () => {
    expect(SAFE_BOX.x).toBeGreaterThanOrEqual(TRIM_BOX.x)
    expect(SAFE_BOX.y).toBeGreaterThanOrEqual(TRIM_BOX.y)
    expect(SAFE_BOX.x + SAFE_BOX.w).toBeLessThanOrEqual(TRIM_BOX.x + TRIM_BOX.w)
    expect(SAFE_BOX.y + SAFE_BOX.h).toBeLessThanOrEqual(TRIM_BOX.y + TRIM_BOX.h)
  })

  it('has positive dimensions', () => {
    expect(SAFE_BOX.w).toBeGreaterThan(0)
    expect(SAFE_BOX.h).toBeGreaterThan(0)
  })

  it('is derived from SAFE_INSET_PX', () => {
    expect(SAFE_BOX.x).toBe(SAFE_INSET_PX)
    expect(SAFE_BOX.y).toBe(SAFE_INSET_PX)
    expect(SAFE_BOX.w).toBe(CARD_WIDTH - 2 * SAFE_INSET_PX)
    expect(SAFE_BOX.h).toBe(CARD_HEIGHT - 2 * SAFE_INSET_PX)
  })
})

describe('GUIDE_PERCENTAGES', () => {
  it('has valid trim percentages', () => {
    const { trim } = GUIDE_PERCENTAGES
    expect(trim.left).toBeGreaterThanOrEqual(0)
    expect(trim.top).toBeGreaterThanOrEqual(0)
    expect(trim.right).toBeGreaterThanOrEqual(0)
    expect(trim.bottom).toBeGreaterThanOrEqual(0)
    expect(trim.left + trim.right).toBeLessThan(100)
    expect(trim.top + trim.bottom).toBeLessThan(100)
  })

  it('has valid safe percentages', () => {
    const { safe } = GUIDE_PERCENTAGES
    expect(safe.left).toBeGreaterThanOrEqual(0)
    expect(safe.top).toBeGreaterThanOrEqual(0)
    expect(safe.right).toBeGreaterThanOrEqual(0)
    expect(safe.bottom).toBeGreaterThanOrEqual(0)
    expect(safe.left + safe.right).toBeLessThan(100)
    expect(safe.top + safe.bottom).toBeLessThan(100)
  })

  it('safe percentages are larger than trim percentages', () => {
    const { trim, safe } = GUIDE_PERCENTAGES
    expect(safe.left).toBeGreaterThan(trim.left)
    expect(safe.top).toBeGreaterThan(trim.top)
    expect(safe.right).toBeGreaterThan(trim.right)
    expect(safe.bottom).toBeGreaterThan(trim.bottom)
  })
})
