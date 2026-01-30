/**
 * Pure helper functions extracted for testing.
 * These have no external dependencies and can be unit tested.
 */

import type { Card, CardStatus, CardType, CropRect } from 'shared'
import {
  JERSEY_PATTERN,
  MAX_CAPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHOTOGRAPHER_LENGTH,
  MAX_POSITION_LENGTH,
  MAX_TEAM_LENGTH,
  MAX_TITLE_LENGTH,
} from 'shared'

const MAX_TEMPLATE_LENGTH = 32

export const CARD_TYPES: CardType[] = [
  'player',
  'team-staff',
  'media',
  'official',
  'tournament-staff',
  'rare',
]

// Safe ID pattern for S3 paths
export const SAFE_ID_PATTERN = /^[a-z0-9-]{3,64}$/

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isCardStatus = (value: unknown): value is CardStatus =>
  value === 'draft' || value === 'submitted' || value === 'rendered'

export const isSafeId = (value: unknown): value is string =>
  typeof value === 'string' && SAFE_ID_PATTERN.test(value)

export const isCardType = (value: unknown): value is CardType =>
  typeof value === 'string' && CARD_TYPES.includes(value as CardType)

export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export const toRotateDeg = (value: unknown): CropRect['rotateDeg'] | undefined => {
  const numeric = toNumber(value)

  if (numeric === 0 || numeric === 90 || numeric === 180 || numeric === 270) {
    return numeric
  }

  return undefined
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max)

export const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const ensureMaxLength = (value: string, max: number, label: string) => {
  if (value.length > max) {
    return `${label} must be ${max} characters or fewer`
  }
  return null
}

export const buildStatusCreatedAt = (status: CardStatus, createdAt: string) =>
  `${status}#${createdAt}`

/**
 * Parse and normalize crop rectangle from input
 * - Clamps x, y to [0, 1]
 * - Clamps w, h to [0.001, 1]
 * - Ensures crop doesn't extend beyond image bounds
 * - Validates rotation to 0, 90, 180, 270
 */
export const pickCrop = (value: unknown): CropRect | undefined => {
  if (!isRecord(value)) return undefined

  const rawX = toNumber(value.x)
  const rawY = toNumber(value.y)
  const rawW = toNumber(value.w)
  const rawH = toNumber(value.h)

  if (
    rawX === undefined ||
    rawY === undefined ||
    rawW === undefined ||
    rawH === undefined
  ) {
    return undefined
  }

  // Clamp values to valid ranges
  // x, y: 0 to 1
  // w, h: > 0 to 1
  const x = clamp(rawX, 0, 1)
  const y = clamp(rawY, 0, 1)
  const w = clamp(rawW, 0.001, 1) // minimum 0.1% width
  const h = clamp(rawH, 0.001, 1) // minimum 0.1% height

  // Ensure crop doesn't extend beyond image bounds
  const clampedW = Math.min(w, 1 - x)
  const clampedH = Math.min(h, 1 - y)

  const rotateDeg = toRotateDeg(value.rotateDeg) ?? 0

  return { x, y, w: clampedW, h: clampedH, rotateDeg }
}

export const isValidDimension = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

export const isValidCropRect = (crop?: CropRect) => {
  if (!crop) return false

  const { x, y, w, h, rotateDeg } = crop

  if (
    ![x, y, w, h].every(
      (value) => typeof value === 'number' && Number.isFinite(value)
    )
  ) {
    return false
  }

  const rotateOk =
    rotateDeg === 0 || rotateDeg === 90 || rotateDeg === 180 || rotateDeg === 270
  if (!rotateOk) return false

  if (x < 0 || y < 0 || x > 1 || y > 1) return false
  if (w <= 0 || h <= 0 || w > 1 || h > 1) return false
  if (x + w > 1 || y + h > 1) return false

  return true
}

export const validatePhotoKeys = (cardId: string, photo?: Card['photo']) => {
  if (!photo) return null

  if (
    photo.originalKey &&
    !photo.originalKey.startsWith(`uploads/original/${cardId}/`)
  ) {
    return 'originalKey must belong to this card'
  }

  if (photo.cropKey && !photo.cropKey.startsWith(`uploads/crop/${cardId}/`)) {
    return 'cropKey must belong to this card'
  }

  return null
}

export type CardInput = Partial<Card> & {
  firstName?: string
  lastName?: string
  title?: string
  caption?: string
  teamId?: string
  teamName?: string
  position?: string
  jerseyNumber?: string
  templateId?: string
}

export const validateCardFields = (card: CardInput) => {
  if (card.firstName) {
    const error = ensureMaxLength(card.firstName, MAX_NAME_LENGTH, 'firstName')
    if (error) return error
  }
  if (card.lastName) {
    const error = ensureMaxLength(card.lastName, MAX_NAME_LENGTH, 'lastName')
    if (error) return error
  }
  if (card.title) {
    const error = ensureMaxLength(card.title, MAX_TITLE_LENGTH, 'title')
    if (error) return error
  }
  if (card.caption) {
    const error = ensureMaxLength(card.caption, MAX_CAPTION_LENGTH, 'caption')
    if (error) return error
  }
  if (card.photographer) {
    const error = ensureMaxLength(
      card.photographer,
      MAX_PHOTOGRAPHER_LENGTH,
      'photographer'
    )
    if (error) return error
  }
  if (card.teamName) {
    const error = ensureMaxLength(card.teamName, MAX_TEAM_LENGTH, 'teamName')
    if (error) return error
  }
  if (card.teamId) {
    const error = ensureMaxLength(card.teamId, MAX_TEAM_LENGTH, 'teamId')
    if (error) return error
  }
  if (card.position) {
    const error = ensureMaxLength(card.position, MAX_POSITION_LENGTH, 'position')
    if (error) return error
  }
  if (card.templateId) {
    const error = ensureMaxLength(
      card.templateId,
      MAX_TEMPLATE_LENGTH,
      'templateId'
    )
    if (error) return error
  }
  if (card.jerseyNumber && !JERSEY_PATTERN.test(card.jerseyNumber)) {
    return 'jerseyNumber must be 1-2 digits'
  }

  return null
}

export const getSubmitValidationError = (card: Card) => {
  if (!card.tournamentId) return 'tournamentId is required before submitting'
  if (!card.cardType || !isCardType(card.cardType)) {
    return 'cardType is required before submitting'
  }

  const fieldError = validateCardFields(card)
  if (fieldError) return fieldError

  const photo = card.photo
  if (!photo) return 'photo is required before submitting'
  if (!photo.originalKey) return 'photo.originalKey is required before submitting'
  if (!isValidDimension(photo.width) || !isValidDimension(photo.height)) {
    return 'photo dimensions are required before submitting'
  }
  if (!isValidCropRect(photo.crop)) return 'photo.crop is required before submitting'

  switch (card.cardType) {
    case 'rare':
      if (!card.title) return 'title is required before submitting'
      break
    case 'super-rare':
      // Super-rare uses firstName/lastName from RareCard type
      if (!card.firstName) return 'firstName is required before submitting'
      if (!card.lastName) return 'lastName is required before submitting'
      break
    default:
      // Standard cards (player, team-staff, media, official, tournament-staff, national-team)
      if ('firstName' in card && !card.firstName)
        return 'firstName is required before submitting'
      if ('lastName' in card && !card.lastName)
        return 'lastName is required before submitting'
      // Position is optional for some card types
      break
  }

  if (
    card.cardType === 'player' ||
    card.cardType === 'team-staff' ||
    card.cardType === 'national-team'
  ) {
    if (!('teamId' in card) && !('teamName' in card)) {
      return 'team is required before submitting'
    }
    if (
      'teamId' in card &&
      !card.teamId &&
      'teamName' in card &&
      !card.teamName
    ) {
      return 'team is required before submitting'
    }
  }

  return null
}
