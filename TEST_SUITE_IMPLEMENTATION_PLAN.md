# Test Suite Implementation Plan

A focused plan to ensure real users can successfully submit trading cards end-to-end.

## Success Criteria

**Primary goal**: If all tests pass, a real user can complete:
1. Select tournament and card type
2. Upload and crop a photo
3. Fill out required fields (auto-saves in background)
4. Refresh the page and resume their draft
5. Submit the card

**Secondary goals**:
- Catch regressions in client/server contract
- Validate backend invariants (edit token, status transitions)
- Detect renderer output issues before production

## Critical Paths to Test

These are the invariants that, if broken, would prevent users from submitting cards:

| Path | What breaks if untested |
|------|------------------------|
| Card creation with edit token | User can't start a draft |
| Photo presign + S3 upload | User can't attach photo |
| Auto-save with edit token | User loses work on refresh |
| Draft resume from localStorage | User loses work on refresh |
| Photo restoration via signed URL | User sees broken image on resume |
| Form validation (client + server) | Invalid data submitted or valid data rejected |
| Status transition draft→submitted | Card stuck in draft state |
| Crop normalization (0-1 floats) | Photo renders incorrectly |

## Tooling

- **Unit/integration**: Vitest
- **React components**: React Testing Library
- **API mocking**: aws-sdk-client-mock (server), MSW (client)
- **E2E**: Playwright
- **CI**: Existing Turbo pipeline + new test jobs

## Phase 1: Foundation

**Goal**: Test infrastructure that all other tests build on.

### Tasks

1. **Configure Vitest** in each workspace:
   - `shared/vitest.config.ts`
   - `server/vitest.config.ts`
   - `client/vitest.config.ts`

2. **Add test scripts** to root `package.json`:
   ```json
   {
     "test": "turbo test",
     "test:unit": "turbo test:unit",
     "test:e2e": "playwright test"
   }
   ```

3. **Create test fixtures**:
   ```
   tests/fixtures/
   ├── photo-fixture.jpg      (small valid image, ~50KB)
   ├── tournament-config.json (minimal valid config)
   └── README.md              (explains fixture usage)
   ```

4. **Create AWS mock utilities** in `tests/setup/`:
   - `mock-s3.ts` - Stub presigned URLs and object operations
   - `mock-dynamodb.ts` - In-memory card storage

### Definition of Done
- `pnpm test` runs in each workspace without errors
- Fixtures are available and documented

---

## Phase 2: Unit Tests

**Goal**: Cover pure logic that doesn't require mocking external services.

### Server Unit Tests (`server/src/__tests__/`)

| Test file | What it covers |
|-----------|---------------|
| `crop.test.ts` | `pickCrop()` clamps x/y/w/h to 0-1, validates rotation to 0/90/180/270 |
| `validation.test.ts` | Field length limits, jersey pattern, card type validation |
| `helpers.test.ts` | `buildStatusCreatedAt()`, safe ID validation |

### Client Unit Tests (`client/src/__tests__/`)

| Test file | What it covers |
|-----------|---------------|
| `draftStorage.test.ts` | Serialization, rehydration, corrupted data handling |
| `validation.test.ts` | Required fields by card type, error message correctness |

### Shared Unit Tests (`shared/src/__tests__/`)

| Test file | What it covers |
|-----------|---------------|
| `templates.test.ts` | Template resolution fallbacks (explicit → byCardType → default) |
| `constants.test.ts` | Invariants (safe zones within card bounds, pattern validity) |

### Definition of Done
- ~20-30 unit tests covering highest-risk pure logic
- All tests pass in <30s locally

---

## Phase 3: API Integration Tests

**Goal**: Verify server endpoints work correctly with mocked AWS services.

### Setup

Refactor server for dependency injection:
```typescript
// server/src/app.ts
export function createApp(deps: { ddb, s3, nowIso, uuid }) {
  // ... existing Hono routes using injected deps
}
```

### Test Cases (`server/src/__tests__/api/`)

#### Card Lifecycle (`cards.test.ts`)

| Test | Endpoint | Assertion |
|------|----------|-----------|
| Creates draft with edit token | `POST /cards` | Returns `cardId`, `editToken`, status=`draft` |
| Rejects create without tournamentId | `POST /cards` | 400 error |
| Rejects create with invalid cardType | `POST /cards` | 400 error |
| Updates card with valid edit token | `PATCH /cards/:id` | 200, fields updated |
| Rejects update without edit token | `PATCH /cards/:id` | 401 error |
| Rejects update with wrong edit token | `PATCH /cards/:id` | 401 error |
| Rejects setting status via PATCH | `PATCH /cards/:id` | status field ignored |
| Submits card with photo | `POST /cards/:id/submit` | status=`submitted` |
| Rejects submit without photo | `POST /cards/:id/submit` | 400 error |
| Rejects submit of non-draft | `POST /cards/:id/submit` | 400 error |

#### Presign (`presign.test.ts`)

| Test | Assertion |
|------|-----------|
| Presign requires card to exist | 404 if card not found |
| Presign requires edit token | 401 if missing/wrong |
| Presign validates content type | 400 for invalid MIME types |
| Presign validates content length | 400 if > 15MB |
| Presign returns valid URL structure | URL matches expected S3 path |

#### Photo URL (`photo-url.test.ts`)

| Test | Assertion |
|------|-----------|
| Returns signed URL for draft owner | 200 with URL |
| Requires edit token | 401 if missing/wrong |
| Returns 404 if photo missing | 404 error |

#### Validation (`server-validation.test.ts`)

| Test | Assertion |
|------|-----------|
| Rejects firstName > MAX_NAME_LENGTH | 400 error |
| Rejects invalid jersey pattern | 400 error |
| Validates all field length limits | 400 for each violation |
| Validates required fields by cardType | Error message specifies missing field |

### Definition of Done
- ~40-50 integration tests covering all critical endpoints
- Tests are deterministic (no real AWS calls)
- Validates response structure matches expected types

---

## Phase 4: Client Integration Tests

**Goal**: Verify client-side logic handles API responses correctly.

### Setup

Add MSW handlers that simulate server responses:
```typescript
// tests/mocks/handlers.ts
export const handlers = [
  rest.post('/api/cards', ...),
  rest.patch('/api/cards/:id', ...),
  rest.post('/api/uploads/presign', ...),
  // etc.
]
```

### Test Cases (`client/src/__tests__/integration/`)

#### Auto-Save (`autosave.test.tsx`)

| Test | Assertion |
|------|-----------|
| Debounces 2.5s after last change | Only one PATCH after settling |
| Resets timer on new edits | No PATCH if user keeps typing |
| Shows saving/saved indicator | UI reflects save state |
| Retries on network error | Shows error banner, retries |

#### Resume Flow (`resume.test.tsx`)

| Test | Assertion |
|------|-----------|
| Shows resume modal on load with draft | Modal appears with correct info |
| Restores form fields from localStorage | All fields populated |
| Fetches photo via signed URL | Image loads from S3 |
| Clears draft when user declines | localStorage cleared |
| Handles missing photo gracefully | Shows error, allows re-upload |

#### Upload Flow (`upload.test.tsx`)

| Test | Assertion |
|------|-----------|
| Requests presign before S3 upload | Presign called first |
| Shows upload progress | Progress indicator updates |
| Handles presign failure | Error message shown |
| Handles S3 upload failure | Error message, allows retry |
| Validates file type client-side | Rejects non-images immediately |
| Validates file size client-side | Rejects > 15MB immediately |

#### Form Validation (`form-validation.test.tsx`)

| Test | Assertion |
|------|-----------|
| Shows errors only after interaction | No errors on fresh load |
| Shows required field errors | Correct error messages |
| Clears error when field is valid | Error disappears |
| Rare card uses title, not name | Correct fields shown |
| Player card requires team | Team error shown if missing |

### Definition of Done
- Critical client flows tested without real network
- Error UI prevents silent failures
- Tests run in <60s

---

## Phase 5: E2E Tests

**Goal**: Verify the complete user flow works in a real browser.

### Setup

```typescript
// e2e/playwright.config.ts
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true,
  },
})
```

### Test Cases (`e2e/tests/`)

#### Happy Path (`submit-card.spec.ts`)

Complete flow for a player card:
1. Select tournament (USQC 2026)
2. Select card type (Player)
3. Upload photo (fixture image)
4. Adjust crop
5. Fill required fields (firstName, lastName, team, position, photographer)
6. Wait for auto-save indicator
7. Submit card
8. Verify success state

#### Resume After Refresh (`resume-draft.spec.ts`)

1. Start a draft (steps 1-5 above)
2. Refresh the page
3. Verify resume modal appears
4. Click resume
5. Verify all fields restored
6. Verify photo visible
7. Submit card

#### Rare Card Flow (`rare-card.spec.ts`)

1. Select tournament
2. Select card type (Rare)
3. Upload photo
4. Fill title (not firstName/lastName)
5. Fill photographer
6. Submit card

#### Error Recovery (`error-recovery.spec.ts`)

1. Start a draft
2. Simulate server error on auto-save (MSW)
3. Verify error banner appears
4. Simulate recovery
5. Verify save succeeds

### Definition of Done
- 4 E2E tests covering main user flows
- Tests pass on Chromium
- Tests run in <3 minutes total

---

## Phase 6: Visual Regression (Optional)

**Goal**: Detect unintended changes to rendered card output.

This phase is lower priority than functional tests but valuable for a trading card app where visual output matters.

### Test Cases

| Template | Card type | What to verify |
|----------|-----------|----------------|
| Classic | Player | Name box position, team logo, jersey number |
| Noir | Player | Dark theme colors, text contrast |
| With overlay | Tournament-staff | Overlay positioned correctly |

### Approach

Use Playwright's `expect(page).toHaveScreenshot()` with:
- Fixed viewport (825x1125)
- Deterministic input data
- 1% pixel diff tolerance

### Definition of Done
- 3 visual snapshots as baselines
- CI fails on unexpected changes

---

## Edge Cases (Integrate Into Above Phases)

These should be added to the relevant test phase, not as a separate phase:

| Edge case | Test phase | What to verify |
|-----------|-----------|----------------|
| Large image (8000x8000) | Client integration | Image resized before upload |
| EXIF orientation | E2E | Image displays correctly |
| Photo deleted from S3 | Client integration | Resume shows error, allows re-upload |
| Two tabs editing same draft | E2E | Last write wins (no crash) |
| Autosave while offline | Client integration | Retry with error banner |
| Invalid jersey format | Unit | Validation rejects |
| Missing team after selection | E2E | Graceful error handling |

---

## CI Configuration

### PR Pipeline

```yaml
jobs:
  test:
    steps:
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:integration
      - run: pnpm test:e2e  # smoke subset
```

### Nightly Pipeline

```yaml
jobs:
  full-test:
    steps:
      - run: pnpm test  # all tests
      - run: pnpm test:visual  # if Phase 6 implemented
```

---

## Out of Scope

These are explicitly not covered in this plan:

- **Admin workflows**: Users don't interact with these directly
- **Staging smoke tests**: Good practice but not needed for initial confidence
- **Cross-browser testing**: Chromium-only initially
- **Performance/load testing**: Can be added later
- **Runtime Zod schemas**: App already works; adding runtime validation is extra infrastructure

---

## Implementation Order

1. **Phase 1**: Foundation (test configs, fixtures, mocks)
2. **Phase 2**: Unit tests (pure logic)
3. **Phase 3**: API integration tests (server endpoints)
4. **Phase 4**: Client integration tests (React components)
5. **Phase 5**: E2E tests (browser flows)
6. **Phase 6**: Visual regression (optional, after functional tests pass)

Each phase builds on the previous. Don't skip ahead—the mocking infrastructure from Phase 1 is required for Phases 3-4.

---

## What This Gives You

When all tests pass:

- **Card creation works**: Users can start drafts
- **Photo upload works**: Presign → S3 flow is intact
- **Auto-save works**: Users don't lose work
- **Resume works**: Refresh doesn't lose progress
- **Validation works**: Invalid data is caught, valid data is accepted
- **Submit works**: Cards transition to submitted state
- **Edit token enforced**: Only draft owner can modify

This is the minimum viable test suite for confidence that the happy path works.
