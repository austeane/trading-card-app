# Test Fixtures

This directory contains test fixtures used by the test suite.

## Files

### tournament-config.json

A minimal valid tournament configuration for testing. Includes:
- Two teams (Team Alpha, Team Beta)
- All card types enabled
- Two templates (classic, noir)
- Default template fallbacks

Use this for:
- Server API integration tests
- Client form validation tests
- E2E tests with mock tournament data

### Photo Generation

For tests requiring image data, use the `createTestImageBuffer()` utility from
`tests/utils/test-image.ts`. This generates a small valid JPEG buffer programmatically
without needing a static fixture file.

Example:
```typescript
import { createTestImageBuffer } from '../../tests/utils/test-image'

const imageBuffer = createTestImageBuffer(100, 100) // 100x100 JPEG
```

## Usage in Tests

### Server Tests

```typescript
import tournamentConfig from '../../tests/fixtures/tournament-config.json'

// Use in mocked S3 responses
s3Mock.on(GetObjectCommand).resolves({
  Body: stringToStream(JSON.stringify(tournamentConfig)),
})
```

### Client Tests (MSW)

```typescript
import tournamentConfig from '../../../tests/fixtures/tournament-config.json'

http.get('/api/tournaments/:id', () => {
  return HttpResponse.json(tournamentConfig)
})
```
