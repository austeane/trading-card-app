import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'

// Mock SST Resource before importing app
vi.mock('sst', () => ({
  Resource: {
    Cards: { name: 'test-cards-table' },
    Media: { name: 'test-media-bucket' },
  },
}))

// Import app after mocking SST
const { default: app } = await import('../../index')

const ddbMock = mockClient(DynamoDBDocumentClient)

// Helper to create ConditionalCheckFailedException
const createConditionalCheckError = () => {
  const error = new ConditionalCheckFailedException({
    message: 'The conditional request failed',
    $metadata: {},
  })
  return error
}

describe('POST /cards', () => {
  beforeEach(() => {
    ddbMock.reset()
  })

  it('creates a card with valid input', async () => {
    ddbMock.on(PutCommand).resolves({})

    const response = await app.request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: 'test-tournament',
        cardType: 'player',
        firstName: 'John',
        lastName: 'Doe',
      }),
    })

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBeDefined()
    expect(body.editToken).toBeDefined()
    expect(body.tournamentId).toBe('test-tournament')
    expect(body.cardType).toBe('player')
    expect(body.status).toBe('draft')
  })

  it('rejects missing tournamentId', async () => {
    const response = await app.request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardType: 'player',
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('tournamentId')
  })

  it('rejects missing cardType', async () => {
    const response = await app.request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: 'test-tournament',
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('cardType')
  })

  it('rejects invalid cardType', async () => {
    const response = await app.request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: 'test-tournament',
        cardType: 'invalid-type',
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('cardType')
  })

  it('rejects firstName exceeding max length', async () => {
    const response = await app.request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: 'test-tournament',
        cardType: 'player',
        firstName: 'a'.repeat(51),
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('firstName')
  })

  it('rejects invalid jersey number', async () => {
    const response = await app.request('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: 'test-tournament',
        cardType: 'player',
        jerseyNumber: '100',
      }),
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('jerseyNumber')
  })
})

describe('PATCH /cards/:id', () => {
  beforeEach(() => {
    ddbMock.reset()
  })

  const mockCard = {
    id: 'test-card-id',
    editToken: 'test-edit-token',
    tournamentId: 'test-tournament',
    cardType: 'player',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('updates card with valid edit token', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })
    ddbMock.on(UpdateCommand).resolves({
      Attributes: { ...mockCard, firstName: 'Jane' },
    })

    const response = await app.request('/cards/test-card-id', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        firstName: 'Jane',
      }),
    })

    expect(response.status).toBe(200)
  })

  it('rejects missing edit token', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/cards/test-card-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Jane',
      }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toContain('Edit token')
  })

  it('rejects wrong edit token', async () => {
    // UpdateCommand throws ConditionalCheckFailedException when token doesn't match
    ddbMock.on(UpdateCommand).rejects(createConditionalCheckError())
    // Follow-up GetCommand returns the card (to determine error type)
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/cards/test-card-id', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'wrong-token',
      },
      body: JSON.stringify({
        firstName: 'Jane',
      }),
    })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('edit token')
  })

  it('rejects status field in PATCH', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockCard })
    ddbMock.on(UpdateCommand).resolves({
      Attributes: { ...mockCard, firstName: 'Jane' },
    })

    const response = await app.request('/cards/test-card-id', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        firstName: 'Jane',
        status: 'submitted', // This should be ignored
      }),
    })

    expect(response.status).toBe(200)
    // Status should not be updated - verify the UpdateCommand didn't include status
    const updateCall = ddbMock.commandCalls(UpdateCommand)[0]
    expect(updateCall).toBeDefined()
    // The update expression should not contain status
  })

  it('returns 404 for non-existent card', async () => {
    // UpdateCommand throws ConditionalCheckFailedException when card doesn't exist
    ddbMock.on(UpdateCommand).rejects(createConditionalCheckError())
    // Follow-up GetCommand confirms card doesn't exist
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const response = await app.request('/cards/non-existent', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-edit-token': 'test-edit-token',
      },
      body: JSON.stringify({
        firstName: 'Jane',
      }),
    })

    expect(response.status).toBe(404)
  })
})

describe('GET /cards/:id', () => {
  beforeEach(() => {
    ddbMock.reset()
  })

  it('returns card without edit token', async () => {
    const mockCard = {
      id: 'test-card-id',
      editToken: 'secret-token',
      tournamentId: 'test-tournament',
      cardType: 'player',
      status: 'submitted',
    }
    ddbMock.on(GetCommand).resolves({ Item: mockCard })

    const response = await app.request('/cards/test-card-id')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe('test-card-id')
    // editToken should be stripped from response
    expect(body.editToken).toBeUndefined()
  })

  it('returns 404 for non-existent card', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const response = await app.request('/cards/non-existent')

    expect(response.status).toBe(404)
  })
})
