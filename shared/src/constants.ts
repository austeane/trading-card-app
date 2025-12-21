// Card render dimensions - single source of truth
export const CARD_WIDTH = 825
export const CARD_HEIGHT = 1125
export const CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT // ~0.7333

// Print geometry at 300 DPI (1/8" = 37.5px)
export const TRIM_INSET_PX = 37.5
export const SAFE_INSET_PX = 75

export const TRIM_BOX = { x: 37.5, y: 37.5, w: 750, h: 1050 }
export const SAFE_BOX = { x: 75, y: 75, w: 675, h: 975 }
export const TRIM_WIDTH = TRIM_BOX.w
export const TRIM_HEIGHT = TRIM_BOX.h
export const TRIM_ASPECT = TRIM_WIDTH / TRIM_HEIGHT // ~0.7143

const toGuidePercent = (value: number, total: number) =>
  Math.round((((value / total) * 100) + Number.EPSILON) * 1000) / 1000

// Percentages for responsive overlay
export const GUIDE_PERCENTAGES = {
  trim: { left: 4.545, top: 3.333, right: 4.545, bottom: 3.333 },
  safe: { left: 9.091, top: 6.667, right: 9.091, bottom: 6.667 },
  safeWithinTrim: {
    left: toGuidePercent(SAFE_BOX.x - TRIM_BOX.x, TRIM_BOX.w),
    top: toGuidePercent(SAFE_BOX.y - TRIM_BOX.y, TRIM_BOX.h),
    right: toGuidePercent(SAFE_BOX.x - TRIM_BOX.x, TRIM_BOX.w),
    bottom: toGuidePercent(SAFE_BOX.y - TRIM_BOX.y, TRIM_BOX.h),
  },
}
