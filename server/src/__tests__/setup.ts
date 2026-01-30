/**
 * Server test setup
 * Configures mocks and global test utilities
 */

import { beforeAll, afterEach, afterAll } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// Create mock instances
export const s3Mock = mockClient(S3Client)
export const ddbMock = mockClient(DynamoDBDocumentClient)

beforeAll(() => {
  // Set consistent timezone for tests
  process.env.TZ = 'UTC'
})

afterEach(() => {
  // Reset mocks between tests
  s3Mock.reset()
  ddbMock.reset()
})

afterAll(() => {
  // Restore mocks after all tests
  s3Mock.restore()
  ddbMock.restore()
})
