import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'

// Mock SST Resource before importing app
vi.mock('sst', () => ({
  Resource: {
    Cards: { name: 'test-cards-table' },
    Media: { name: 'test-media-bucket' },
  },
}))

// Mock presigned post
vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: vi.fn().mockResolvedValue({
    url: 'https://test-bucket.s3.amazonaws.com',
    fields: { key: 'test-key' },
  }),
}))

// Import app after mocking
const { default: app } = await import('../../index')

const ddbMock = mockClient(DynamoDBDocumentClient)
const s3Mock = mockClient(S3Client)

describe('POST /uploads/presign', () => {
  const mockCard = {
    id: 'test-card-id',
    editToken: 'test-edit-token',
    tournamentId: 'test-tournament',
    cardType: 'player',
    status: 'draft',
  }

  beforeEach(() => {
    ddbMock.reset()
    s3Mock.reset()
  })

  it('returns presigned URL for valid request', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        cardId: 'test-card-id',
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024, // 1MB
        kind: 'original',
      }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.uploadUrl).toBeDefined()
    expect(body.fields).toBeDefined()
    expect(body.key).toBeDefined()
  })

  it('rejects request without edit token', async () => {
    // Server fetches card first, then checks edit token
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: 'test-card-id',
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        kind: 'original',
      }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toContain('Edit token')
  })

  it('rejects invalid content type', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        cardId: 'test-card-id',
        contentType: 'application/pdf', // Not allowed
        contentLength: 1024 * 1024,
        kind: 'original',
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('contentType')
  })

  it('rejects file too large', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        cardId: 'test-card-id',
        contentType: 'image/jpeg',
        contentLength: 20 * 1024 * 1024, // 20MB - over limit
        kind: 'original',
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('too large')
  })

  it('rejects non-existent card', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        cardId: 'non-existent',
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        kind: 'original',
      }),
    })

    expect(response.status).toBe(404)
  })

  it('rejects wrong edit token', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'wrong-token',
      },
      body: JSON.stringify({
        cardId: 'test-card-id',
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        kind: 'original',
      }),
    })

    // Server returns 403 for invalid (but provided) edit token
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('edit token')
  })

  it('rejects presign for non-draft card', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { ...mockCard, status: 'submitted' },
    })

    const response = await app.request('/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        cardId: 'test-card-id',
        contentType: 'image/jpeg',
        contentLength: 1024 * 1024,
        kind: 'original',
      }),
    })

    // Server returns 409 Conflict for non-draft cards
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toContain('editable')
  })
})
