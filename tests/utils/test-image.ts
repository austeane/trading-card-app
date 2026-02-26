/**
 * Utility functions for generating test images
 *
 * Uses minimal valid image data that doesn't require native canvas libraries.
 */

// Minimal valid 1x1 PNG (red pixel)
// This is a valid PNG file that can be used in tests
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

// Minimal valid 1x1 JPEG
const MINIMAL_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAA' +
  'AAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMB' +
  'AAIRAxEAPwCwAB//2Q=='

/**
 * Creates a minimal valid PNG buffer for testing
 */
export function createTestPngBuffer(): Buffer {
  return Buffer.from(MINIMAL_PNG_BASE64, 'base64')
}

/**
 * Creates a minimal valid JPEG buffer for testing
 */
export function createTestJpegBuffer(): Buffer {
  return Buffer.from(MINIMAL_JPEG_BASE64, 'base64')
}

/**
 * Creates a File object from a buffer (for client-side tests)
 */
export function createTestFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): File {
  const blob = new Blob([buffer], { type: mimeType })
  return new File([blob], filename, { type: mimeType })
}

/**
 * Creates test photo metadata
 */
export function createTestPhotoMeta(overrides?: {
  width?: number
  height?: number
  key?: string
}) {
  return {
    originalKey: overrides?.key ?? 'uploads/original/test-card-id/abc123.jpg',
    width: overrides?.width ?? 1200,
    height: overrides?.height ?? 1600,
    crop: {
      x: 0.1,
      y: 0.1,
      w: 0.8,
      h: 0.8,
      rotateDeg: 0 as const,
    },
  }
}

/**
 * Creates a mock card object for testing
 */
export function createTestCard(overrides?: Record<string, unknown>) {
  const now = new Date().toISOString()
  return {
    id: 'test-card-id',
    editToken: 'test-edit-token',
    tournamentId: 'test-tournament-2026',
    cardType: 'player' as const,
    status: 'draft' as const,
    firstName: 'Test',
    lastName: 'Player',
    teamId: 'team-alpha',
    teamName: 'Team Alpha',
    position: 'Chaser',
    jerseyNumber: '7',
    photographer: 'Test Photographer',
    photo: createTestPhotoMeta(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
