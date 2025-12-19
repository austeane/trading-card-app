# Trading Card App Plan (Vite + Hono + SST + pnpm)

## Goals
- Provide a public trading-card builder with drag-and-drop crop (no sliders).
- Upload original photo (normalized), crop metadata (and optional cropped derivative), form responses, and final rendered card image.
- Eliminate CORS/black-download issues by serving web + uploads + renders from the same CloudFront domain.
- Keep the stack simple, maintainable, and easy to reskin yearly.

## Current Baseline
- Repo scaffolded from `bun create bhvr@latest` (client/server/shared + Turbo) and converted to pnpm.
- `sst.config.ts` is wired with Router + S3 bucket + Dynamo table + Lambda URL + StaticSite, and Lambda entrypoint is implemented in `server/src/lambda.ts`.
- Server: Hono API with presign + cards CRUD + submit endpoints; uses AWS SDK + `sst` Resource for S3/Dynamo; dev server on port 3000.
- Client: Vite + React with TanStack Router/Query + Tailwind; builder UI with `react-easy-crop`; env vars for API/Router URLs.
- Shared types include `CardDesign`/`CropRect` and related metadata.

## Completed Work

### Phase 0: Infra Skeleton ✅
- Lambda entrypoint (`hono/aws-lambda`)
- Vite + TanStack Router + Query wiring
- SST Router + S3 bucket + DynamoDB + Lambda URL + StaticSite

### Phase 1: Card Builder UI ✅
- Form with all card fields (type, team, position, jersey, name, photo credit)
- Crop UI with `react-easy-crop` (drag-to-pan, scroll-to-zoom)
- Live preview with player name, position/team, crop dimensions
- Zoom In/Out, Rotate 90°, Reset controls

### Phase 2: AWS Uploads ✅
- Presigned upload API (`POST /api/uploads/presign`)
- Client uploads original photo to S3 on draft create
- Versioned S3 keys (`uploads/original/<cardId>/<uploadId>.<ext>`)
- Photo dimensions stored in card record
- CORS configured on Lambda Function URL and S3 bucket

### Phase 3: Submission Pipeline ✅
- Canvas render (`renderCard.ts`) - 825x1125 full-bleed card
- Image covers entire card with gradient overlay at bottom
- Text overlaid on image (name, position/team, jersey number, photo credit)
- Presigned upload for renders (`renders/<cardId>/<renderId>.png`)
- Submit endpoint stores `renderKey` and sets `status=submitted`
- Download PNG link displayed after submission

### Dev Workflow ✅
- Two terminals: `AWS_PROFILE=prod npx sst dev` + `cd client && pnpm dev`
- Environment variables in `client/.env.development` (VITE_API_URL, VITE_ROUTER_URL)
- Frontend calls Lambda URL directly in dev (CORS enabled)
- Media URLs use Router URL in dev (S3 via CloudFront)

### Security ✅
- PATCH endpoint cannot set `status` or `renderKey` (server-controlled)
- Presigned uploads with content-type + size validation (POST policy)
- Max upload size: 15MB
- Allowed types: JPEG, PNG, WebP (renders must be PNG)

### API/Server Hardening ✅
- Presign requires card exists - Verifies card ID before issuing presigned URL
- Submit requires renderKey - Rejects if `renderKey` missing or doesn't match `renders/${id}/...png`
- Enforce status transitions - Only allows `draft → submitted` (idempotent submit)
- Conditional submit write - Uses DynamoDB condition on `status = draft`
- Validate upload keys belong to card - Reject cross-card key updates
- Presigned POST upload policy - Enforces size/type via POST conditions
- Server-side crop validation - Clamps crop values to valid ranges

### Developer Experience ✅
- Pre-commit hooks with husky + lint-staged
- ESLint configured for all packages (client, server, shared)
- Type checking runs on every commit
- Root eslint.config.js for monorepo-wide linting

## Known Issues (Fixed)

### 1. Crop Values Are Wrong ✅ FIXED
**File:** `client/src/App.tsx:413`

Fixed `handleCropComplete` to use 1st argument (percentages) instead of 2nd (pixels), with clamping to 0-1 range.

### 2. Cropper Aspect Ratio Doesn't Match Render ✅ FIXED
**Files:** `shared/src/constants.ts`, `client/src/App.tsx`, `client/src/renderCard.ts`

Created shared constants (`CARD_WIDTH`, `CARD_HEIGHT`, `CARD_ASPECT`) and updated both cropper and render to use them. Container aspect ratio also updated from `aspect-[3/4]` to `aspect-[825/1125]`.

### 3. Rotation Rendering Is Broken for 90°/270° ✅ DISABLED FOR V1
**File:** `client/src/App.tsx`

Rotation UI controls removed and rotation hardcoded to 0. Rotation math needs proper safe-area implementation - deferred to future version.

### 4. Production URLs Bypass Router (Same-Origin Broken) ✅ FIXED
**File:** `client/src/App.tsx:7-17`

Now gates on `import.meta.env.DEV` so production uses relative `/api` and media paths, ensuring same-origin routing via CloudFront Router.

### 5. S3 CORS Missing Production Origin ✅ FIXED
**File:** `sst.config.ts:20`

Changed to `allowOrigins: ["*"]` since bucket is private and only accessible via short-lived presigned URLs.

### 6. Canvas letterSpacing breaks TS builds ✅ FIXED
**File:** `client/src/renderCard.ts`

Replaced `ctx.letterSpacing` with a manual letter-spacing helper.

### 7. type-check hook was a no-op ✅ FIXED
**Files:** `client/package.json`, `server/package.json`, `shared/package.json`

Added per-package `type-check` scripts so Turbo runs TypeScript checks.

### 8. Submit enabled without crop ✅ FIXED
**File:** `client/src/App.tsx`

Submit now requires required fields, a photo, and a valid crop; inline validation added.

### 9. PATCH UpdateCommand ExpressionAttributeNames bug ✅ FIXED
**File:** `server/src/index.ts`

Fixed placeholder mapping so PATCH no longer 500s with invalid ExpressionAttributeNames.

---

## Next Steps (Phase 4+)

### Hardening
- [x] Error handling - Better error messages, retry logic for failed uploads
- [x] Basic form validation - Required fields + file size/type checks
- [x] Form validation - Jersey number format, name length limits
- [x] Loading states - Skeleton loaders, progress indicators during render
- [x] S3 lifecycle rules - Auto-delete orphaned uploads after 14 days
- [x] Submit requires complete card - Client gating for photo + crop (auto-saves on submit)
- [x] Server-side submit completeness validation - Enforce `photo.originalKey` + dimensions + crop before allowing submit
- [x] Presigned POST for strict size enforcement - Enforces size/type via POST policy
- [x] Validate upload keys belong to card - Reject cross-card key updates
- [x] Conditional submit writes - Idempotent submit with DynamoDB condition

### Code Cleanup
- [x] Merge duplicate presign functions - `requestPresignFor` now handles File/Blob
- [x] Align naming - `teamName` replaces `teamId`
- [x] Keep cropper on local URL - Avoids CORS flicker mid-session
- [x] Disable Submit unless crop exists - Gated on required fields, photo, and crop
- [x] Font loading for canvas - Uses `document.fonts.ready` before render
- [x] Canvas image quality - `imageSmoothingEnabled` + `imageSmoothingQuality = 'high'`
- [x] Handle long names - Shrink-to-fit text sizing in render

### UX Upgrades
- [x] Photo upload prominence - Larger drop zone, drag-and-drop support, clearer empty state
- [x] Live card preview - Show real-time preview of final card layout (not just crop), reuse `renderCard` logic
- [x] Button state feedback - Show "Saving..." / "Creating..." on buttons during mutations, not just status text
- [x] Submit enablement hint - Helper text when required fields are missing
- [x] Status consolidation - Single status indicator instead of multiple inline messages
- [x] Field validation UI - Inline error messages + required field indicators
- [x] Jersey number format hint - Add a format helper for jersey numbers
- [x] Rendered card panel - Move rendered preview to top of right column
- [x] Submit flow clarity - Auto-save draft on submit
- [x] Page title - Change from "BHVR" to "Trading Card Studio"
- [x] Upload progress - Show progress bar during photo upload (especially for large files)
- [x] Success celebration - Brief animation or visual feedback when card is submitted successfully
- [x] Keyboard navigation - Tab order, Enter to submit form sections

### Admin/Management
- [x] Admin list endpoint - Query cards by status using GSI (`byStatus`)
- [x] Card gallery - View all submitted cards
- [x] Status management - Mark cards as `rendered`, delete drafts

### Polish
- [x] Card templates - Different designs/themes
- [x] Font loading - Custom fonts for card text (Sora/Fraunces)
- [x] Image optimization - Resize before upload, WebP support
- [x] Mobile UX - Touch-friendly cropping

### Production
- [ ] Auth - Pending new security approach (WRITE_SECRET removed)
- [x] Rate limiting - Prevent abuse
- [x] Cost monitoring - handled manually via account-level budgets (no in-app kill switch)
- [x] Monitoring - Sentry client error tracking (logs via Sentry) and CloudWatch logs
- [x] CI/CD - GitHub Actions deploy on push to main (OIDC role + SST stage vars required)

## Key Decisions & Considerations
- **Frontend:** Vite + React + Tailwind + TanStack Router + TanStack Query.
- **Backend:** Hono on AWS Lambda (via `hono/aws-lambda`).
- **Infra:** SST v3 with a Router and a media bucket; same-origin routing for `/api/*`, `/u/*`, `/r/*`, and the web app.
- **Rendering:** Browser canvas for final image generation (deterministic, no html2canvas).
- **Crop UX:** Drag-and-drop crop with `react-easy-crop`, persist crop as normalized rectangle + rotation.
- **Storage:** S3 for uploads and renders, DynamoDB for metadata.
- **Security:** Presigned uploads, private buckets with CloudFront OAC access; minimal public exposure.

## Dev Mode Strategy (SST + Vite)
- **Two terminals:** `AWS_PROFILE=prod npx sst dev` + `cd client && pnpm dev`
- SST runs Lambda with `Resource.*` bindings, deploys infra to AWS
- Vite runs locally on `:5173` (or `:5174`) with env vars from `.env.development`
- Frontend calls Lambda URL directly in dev (CORS enabled on Lambda)
- Media URLs use Router URL in dev (S3 only accessible via CloudFront)
- **Production:** Same-origin routing via Router (`/api/*`, `/u/*`, `/r/*`)
- **Dev:** Direct Lambda calls + Router for media

## S3 Key Versioning Strategy
- **Versioned keys:** each upload gets a unique ID to avoid cache invalidation issues
- Key format:
  - `uploads/original/<cardId>/<uploadId>.<ext>`
  - `uploads/crop/<cardId>/<uploadId>.<ext>`
  - `renders/<cardId>/<renderId>.png`
- The returned `key` or `publicUrl` is stored in the card record
- Client always uses the stored key; no assumptions about "current" key
- CloudFront can cache aggressively since keys never collide

## Public vs Admin API Boundaries
- **Public routes (no auth):**
  - `POST /api/uploads/presign` – get presigned URL for upload
  - `POST /api/cards` – create draft
  - `GET /api/cards/:id` – fetch own draft (by ID only, no listing)
  - `PATCH /api/cards/:id` – update draft (cannot set `status` or `renderKey`)
  - `POST /api/cards/:id/submit` – submit card (sets `status=submitted`)
- **Admin routes (future, requires auth):**
  - `GET /api/cards` – list cards by status (uses GSI)
  - `PATCH /api/cards/:id/render` – mark as rendered, set `renderKey` (worker or admin)
- **Server-controlled fields:** `status`, `renderKey`, `createdAt`, `updatedAt`

## Architecture Overview
- **CloudFront (SST Router)**
  - `/` and `/assets/*` → Vite static site bucket
  - `/api/*` → Hono Lambda URL
  - `/u/*` → media bucket `uploads/` prefix
  - `/r/*` → media bucket `renders/` prefix
- **S3**
  - `media` bucket (private, CloudFront access only)
  - `uploads/` and `renders/` prefixes
  - lifecycle for `uploads/` (expire after 14 days)
  - CORS for direct browser uploads (prod origin + localhost for dev)
- **DynamoDB**
  - table `Cards` for draft/submitted metadata
  - GSI: `status` (PK) + `createdAt` (SK) for admin listing

## Repo Structure
- `client/` (Vite + React + TanStack Router/Query)
- `server/` (Hono Lambda app)
- `shared/` (types + Zod schemas)
- `sst.config.ts` (infra and routing)

## Data Model (in `shared/`)
- `CardDesign`
  - `id`, `templateId`, `type`, `teamName`, `position`, `jerseyNumber`, `firstName`, `lastName`, `photographer`
  - `photo`:
    - `originalKey`, `width`, `height`
    - `crop`: `x`, `y`, `w`, `h` (normalized 0..1), `rotateDeg` (0/90/180/270)
    - `cropKey?` (optional cropped derivative)
  - `status`: `draft | submitted | rendered`
  - `renderKey`, `createdAt`, `updatedAt`

## API Surface (Hono)
- `POST /api/uploads/presign`
  - input: `{ cardId, contentType, contentLength, kind: "original" | "crop" | "render" }`
  - validates size + content type (jpeg/png/webp, render must be png)
  - output: `{ uploadUrl, key, publicUrl, method, fields }` (POST policy for direct S3 uploads)
- `POST /api/cards` – create draft
- `GET /api/cards/:id` – fetch draft
- `PATCH /api/cards/:id` – update draft + crop metadata
- `POST /api/cards/:id/submit` – mark submitted with `renderKey`

## Upload & Render Flow
1. Client creates draft (or submit auto-creates) → gets card ID
2. Client requests presign for original upload (`kind=original`)
3. Client uploads to S3 directly, stores `originalKey` in draft via PATCH
4. Client stores crop metadata (and optionally uploads cropped derivative)
5. Client renders final card to canvas (825x1125 full-bleed)
6. Client uploads render via presign (`kind=render`)
7. Client calls `submit` with `renderKey`
8. Server sets `status=submitted` and stores `renderKey`

## Canvas Render Details (`renderCard.ts`)
- Card dimensions: 825x1125 pixels
- Full-bleed image covering entire card (high-quality smoothing)
- Gradient overlay at bottom (350px) for text readability
- Text elements:
  - "TRADING CARD" label (top left)
  - Jersey number watermark (top right, semi-transparent)
  - Player name (bottom, over gradient, shrink-to-fit)
  - Position / Team (below name)
  - Jersey number badge (below position)
  - Photo credit (bottom right)
- Border decorations (subtle white lines)
- Fonts: Sora (sans) + Fraunces (display)

## Crop UX Details
- `react-easy-crop` with drag/pinch/scroll for crop and zoom
- Controls: Zoom In, Zoom Out, Reset (rotation disabled for v1)
- Crop rectangle stored as normalized coordinates (0..1)
- Default crop initializes on media load
- Card aspect ratio: 825:1125 (approx 0.73:1)
- Shared constants in `shared/src/constants.ts` (CARD_WIDTH, CARD_HEIGHT, CARD_ASPECT)

## Suggested Next Milestone (Tight & Realistic)

**Goal:** Fix correctness bugs, make production deployable

1. **Fix crop correctness** ✅ DONE
   - [x] Correct `onCropComplete` argument usage (use 1st arg, not 2nd)
   - [x] Unify crop aspect with render aspect (825:1125 = 0.7333)
   - [x] Disable rotation for v1 (rotation math needs safe-area implementation)

2. **Make production truly same-origin** ✅ DONE
   - [x] Use relative `/api`, `/u`, `/r` in production build (gate on `import.meta.env.DEV`)
   - [x] Allow all origins for S3 CORS (bucket is private, URLs are short-lived)

3. **API hardening** ✅ DONE
   - [x] Presign requires card exists
   - [x] Submit requires renderKey + correct status + validates format
   - [x] Clamp crop values on server

4. **Admin/review screen (optional but valuable)**
   - [x] List `submitted` cards via GSI (`byStatus`)
   - [x] Display final render + metadata for quick approval

---

## Milestones
1. **Phase 0: Infra Skeleton** ✅
2. **Phase 1: Card Builder UI** ✅
3. **Phase 2: AWS Uploads** ✅
4. **Phase 3: Submission Pipeline** ✅
5. **Phase 3b: Critical Bug Fixes** ✅
6. **Phase 4: API/Server Hardening** ✅
7. **Phase 4b: Developer Experience** ✅ (eslint, pre-commit hooks)
8. **Phase 5: Remaining Hardening** ⚠️ **← Current Priority** (error handling, validation polish, loading states)
9. **Phase 6: UX Upgrades** - Planned
10. **Phase 7: Admin/Management** - Planned
11. **Phase 8: Polish** - Planned
12. **Phase 9: Production** - Planned

## Open Questions
- Retention period for `renders/`? (`uploads/` expires after 14 days)

## Answered Questions
- **Rotation support** - Disabled for v1. The rotation math needs proper safe-area canvas implementation which is complex. Will revisit in a future version if needed.
- **Admin interface** - Yes, needed for tournament organizers to configure tournaments, teams, and card types.
- **Custom fonts** - Already implemented (Sora + Fraunces).
- **Store cropped derivative?** - Optional but recommended for admin review/proofing. Add crop upload step.
- **PATCH semantics** - Move to `UpdateCommand` with update expressions, or add optimistic concurrency (`version` field).

---

# Pre-Phase 5: Critical Fixes Before Scaling

Before adding tournament support and 6 card types, fix these "don't regret later" items. With admin portal + more card types + CSV imports, bad data paths multiply.

## 1. Server-Side Validation (Currently Too Trusting)

The client validates, but the server must be the gatekeeper. Add:

| Field | Validation |
|-------|------------|
| `firstName`, `lastName` | max 24 chars, non-empty for submit |
| `title` (rare) | max 48 chars, non-empty for submit |
| `caption` (rare) | max 120 chars |
| `photographer` | max 48 chars |
| `jerseyNumber` | regex `^[0-9]{1,2}$` (1-2 digits only) |
| `teamName` | max 64 chars |
| `position` | max 32 chars |
| `crop` | already validated (x, y, w, h in 0-1 range) ✅ |

**Why:** With admin portal, CSV imports, and tournament configs, you'll accept more "foreign" input. Server must reject invalid data.

## 2. PATCH Endpoint: Fix "Last Write Wins"

Current: `Get → merge → Put` overwrites concurrent edits.

**Fix options (pick one):**
- **Option A:** Move to `UpdateCommand` with update expressions (granular field updates)
- **Option B:** Add `version` field for optimistic concurrency (reject if version mismatch)

**Recommendation:** Option A is cleaner. Use `SET` for fields, `REMOVE` for nulls.

## 3. Auth / Abuse Controls (Currently Wide Open)

Current state: `POST /uploads/presign` + open CORS + no auth = anyone can use your bucket as free upload relay.

**MVP fixes (implement at least one now):**

| Option | Complexity | Protection |
|--------|------------|------------|
| Stage secret header | Low | `Authorization: Bearer <secret>` on write endpoints *(removed)* |
| IP rate limiting | Low | In-memory limiter (crude but filters bursts) |
| CloudFront/WAF | Medium | Proper rate limiting + geo blocking |

**Recommendation:** Replace with the new auth plan (WRITE_SECRET removed).

## 4. Crop Derivative Upload (Optional but Recommended)

Current: Upload original + store crop metadata + render final. The cropped original is never persisted.

**Benefit of storing crop derivative:**
- Fast admin previews (no re-cropping needed)
- Proofing workflow (review cropped image before final render)
- Audit trail (what the user actually saw)

**Implementation:** Add optional step after crop to upload `uploads/crop/<cardId>/<uploadId>.png`.

---

# Phase 5: Tournament Support & Multi-Card-Type System

## Overview

Transform the app into a tournament-aware platform:

1. User selects a **Tournament** first (dropdown)
2. Tournament selection drives:
   - Available card types
   - Team list + team logos
   - Position dropdowns per card type
   - Branding (tournament/org logos, colors)
3. Tournament organizers configure tournaments via **Admin Portal**
4. Seed **USQC 2025** to fully replicate old app behavior

## Goals

- Support multiple tournaments (starting with USQC 2025)
- Support all 6 card types:
  - Player
  - Team Staff
  - Media
  - Officials
  - Tournament Staff
  - Rare
- Per-card-type schemas (Rare uses title/caption instead of name)
- Team dropdown driven by config + show logos
- Position dropdowns driven by config + differ per card type
- Admin portal MVP for organizers:
  - Create/edit tournament
  - Bulk import teams (CSV)
  - Upload logos
  - Configure card types + positions
- Keep cards dynamic + queryable in DynamoDB

---

## Data Model

### Shared Types (Discriminated Union)

The key design decision: use a **discriminated union** by `cardType`. Drafts allow missing fields; `submit` validates completeness per type.

```typescript
// shared/src/types/index.ts

export type CardType =
  | "player"
  | "team-staff"
  | "media"
  | "official"
  | "tournament-staff"
  | "rare";

export type CardStatus = "draft" | "submitted" | "rendered";

export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotateDeg: 0 | 90 | 180 | 270;
};

export type CardPhoto = {
  originalKey?: string;
  width?: number;
  height?: number;
  crop?: CropRect;
  cropKey?: string;     // optional "cropped original"
};

// Base fields all cards share
export type CardBase = {
  id: string;
  tournamentId: string;
  cardType: CardType;
  status: CardStatus;
  photographer?: string;
  photo?: CardPhoto;
  renderKey?: string;
  createdAt: string;
  updatedAt: string;
};

// Standard card (Player, Team Staff, Media, Official, Tournament Staff)
export type StandardCard = CardBase & {
  cardType: Exclude<CardType, "rare">;
  firstName?: string;
  lastName?: string;
  teamId?: string;        // reference to team in tournament config
  teamName?: string;      // denormalized for printing
  position?: string;
  jerseyNumber?: string;  // only meaningful for player
};

// Rare card (special layout)
export type RareCard = CardBase & {
  cardType: "rare";
  title?: string;
  caption?: string;
};

export type Card = StandardCard | RareCard;
```

### Card Type Field Rules (USQC 2025)

| Card Type | Team | Position | Jersey | Name Fields | Special Fields |
|-----------|------|----------|--------|-------------|----------------|
| Player | ✅ dropdown | ✅ dropdown | ✅ | firstName, lastName | - |
| Team Staff | ✅ dropdown | ✅ dropdown | ❌ | firstName, lastName | - |
| Media | ❌ | ✅ dropdown | ❌ | firstName, lastName | - |
| Official | ❌ | ✅ dropdown | ❌ | firstName, lastName | - |
| Tournament Staff | ❌ | ✅ dropdown | ❌ | firstName, lastName | - |
| Rare | ❌ | ❌ | ❌ | ❌ | title, caption |

### DynamoDB Updates

Add fields to Cards table:
- `tournamentId` (string, required)
- `cardType` (string, required)

Add GSI for tournament queries:
- **GSI:** `byTournamentStatus`
  - PK: `tournamentId`
  - SK: `status#createdAt`

(Keep existing `byStatus` GSI for global admin views.)

### Tournament Configuration (S3 JSON)

Store tournament "content packs" in S3 with **published vs draft** structure for future admin workflow:

```
config/
  tournaments.json                         # List: [{id, name, year, published}]
  tournaments/
    usqc-2025/
      published/
        config.json                        # Live config users see
      draft/
        config.json                        # Admin preview (optional)
      logos/
        tournament.png                     # Tournament logo
        org.png                            # Org logo (USQ)
      teams/
        arizona-state.png                  # Team logos
        boston-red-pandas.png
        ...
uploads/                                   # (existing)
renders/                                   # (existing)
```

### TournamentConfig Type

```typescript
export type CardType = "player" | "team-staff" | "media" | "official" | "tournament-staff" | "rare";

export interface TournamentConfig {
  id: string;             // "usqc-2025"
  name: string;           // "US Quadball Cup 2025"
  year: number;
  branding: {
    tournamentLogoKey: string;
    orgLogoKey?: string;
    primaryColor?: string;
  };
  teams: Array<{
    id: string;
    name: string;
    logoKey: string;
  }>;
  cardTypes: Array<{
    type: CardType;
    enabled: boolean;
    label: string;
    showTeamField: boolean;
    showJerseyNumber: boolean;
    positions?: string[];
    logoOverrideKey?: string;  // e.g. org logo for officials/media
  }>;
  createdAt: string;
  updatedAt: string;
}
```

---

## API Changes

### Public Endpoints

```
GET  /api/tournaments              # List tournaments [{id, name, year}]
GET  /api/tournaments/:id          # Get TournamentConfig (from S3)
GET  /api/tournaments/:id/teams    # Optional: just teams (or embedded in config)
```

### Card Endpoints (Updated)

```
POST  /api/cards                   # Requires { tournamentId, cardType } at minimum
GET   /api/cards/:id               # Returns card with tournament context
PATCH /api/cards/:id               # Validates fields against cardType schema
                                   # Disallow changing tournamentId/cardType after create
POST  /api/cards/:id/submit        # Validates "complete enough" for cardType
                                   # HEAD render in S3 before accepting renderKey
```

### Admin Endpoints (Currently Unauthenticated)

Auth is pending the new security approach (WRITE_SECRET removed).

```
POST   /api/admin/tournaments                    # Create tournament
PUT    /api/admin/tournaments/:id                # Update config
POST   /api/admin/tournaments/:id/teams/import   # CSV upload
POST   /api/admin/tournaments/:id/assets/presign # Logo upload presign
POST   /api/admin/tournaments/:id/publish        # Publish draft → published
```

---

## Submit Validation Rules (Per Card Type)

| Card Type | Required Fields |
|-----------|-----------------|
| Player | firstName, lastName, teamId, position, photo.originalKey, photo.crop |
| Team Staff | firstName, lastName, teamId, position, photo.originalKey, photo.crop |
| Media | firstName, lastName, position, photo.originalKey, photo.crop |
| Official | firstName, lastName, position, photo.originalKey, photo.crop |
| Tournament Staff | firstName, lastName, position, photo.originalKey, photo.crop |
| Rare | title, photo.originalKey, photo.crop |

**All types:** `renderKey` must exist and match `renders/${cardId}/...png`

---

## Client UI Flow

### 1. Tournament Selection (First Step)

```
┌─────────────────────────────────────────┐
│  Select Tournament                       │
│  ┌─────────────────────────────────┐    │
│  │ US Quadball Cup 2025         ▼  │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [Continue →]                            │
└─────────────────────────────────────────┘
```

On select: fetch config + cache in TanStack Query.

### 2. Card Builder (Dynamic Form)

- **Card type dropdown:** Filtered by `config.cardTypes.filter(t => t.enabled)`
- **Team dropdown:** Only if `cardType.showTeamField`, options from `config.teams`
- **Position dropdown:** Options from `cardType.positions`
- **Jersey number:** Only if `cardType.showJerseyNumber`
- **Rare card:** Shows `title` + `caption` fields instead of name/team/position

### 3. Save Draft vs Submit

- **Save Draft:** Allows partial fields (incremental saving)
- **Submit:** Enforces required fields per card type

---

## Rendering Updates

### Per-Card-Type Rendering

```typescript
async function renderCard(card: Card, config: TournamentConfig): Promise<Blob> {
  switch (card.cardType) {
    case "player":
    case "team-staff":
      return renderTeamCard(card, config);      // Shows team logo
    case "media":
    case "official":
      return renderOrgCard(card, config);       // Shows org logo (USQ)
    case "tournament-staff":
      return renderTournamentCard(card, config); // Shows tournament logo
    case "rare":
      return renderRareCard(card, config);      // Different layout entirely
  }
}
```

### Logo Loading

- Load logos from S3 via CloudFront (same-origin to avoid canvas taint)
- Use `crossOrigin="anonymous"` on image elements
- Cache loaded images in memory

### Rare Card Layout

```
┌───────────────────────────────────────┐
│ [USQC Logo]             "Rare Card"   │
│                                        │
│             [PHOTO]                    │
│                                        │
│      ══════════════════════════        │
│         CHAMPIONSHIP MVP               │ ← Large centered title
│      ══════════════════════════        │
│    Awarded to the tournament MVP       │ ← Caption below
│                                        │
│ 📷 Photographer           ★ rare      │
└───────────────────────────────────────┘
```

---

## Implementation Phases (Recommended Order)

The "least painful" path to a working upgrade:

### Phase 5a: Card Type Union + Per-Type Submit Validation

**Goal:** Support all 6 types with proper schemas. No tournament config yet.

- [x] Add discriminated union card types in `shared/src/types/index.ts`
- [x] Update server to accept `cardType` on create
- [x] Add per-cardType submit validation rules
- [x] Disallow changing `cardType` after creation
- [x] Update client form to show different fields per card type
- [x] Client validation matches server rules

### Phase 5b: Introduce Tournament ID + Hard-Coded USQC 2025

**Goal:** Add tournament concept with single hard-coded config.

- [x] Add `tournamentId` field to Card schema
- [x] Require `tournamentId` on card creation
- [x] Hard-code USQC 2025 config in client (no S3 yet) *(partial team list; needs full data)*
- [x] Tournament dropdown exists but only has one item
- [x] Team dropdown populated from hard-coded config *(partial list pending full data)*
- [x] Position dropdown populated from hard-coded config

### Phase 5c: Move Config to S3 + Public Endpoints

**Goal:** Organizers can change teams/positions/logos without redeploy.

- [x] Define TournamentConfig type in `shared`
- [x] Set up S3 config path conventions (`config/tournaments/...`)
- [x] Implement `GET /api/tournaments` (list)
- [x] Implement `GET /api/tournaments/:id` (fetch from S3)
- [x] Seed USQC 2025 config JSON to S3
- [x] Upload 66 team logos to S3
- [x] Client fetches config from API instead of hard-coded
- [x] Add GSI for tournament/status queries

### Phase 5d: Multi-Card-Type Rendering

**Goal:** All 6 card types render correctly with proper logos.

- [x] Refactor `renderCard.ts` to handle all card types
- [x] Implement team logo rendering (Player/Team Staff)
- [x] Implement org logo rendering (Media/Official)
- [x] Implement tournament logo rendering (Tournament Staff)
- [x] Implement rare card layout (title/caption centered)
- [x] Validate visual parity with old USQC 2025 app *(no longer required)*

### Phase 5e: Admin Portal MVP

**Goal:** Tournament organizers can configure without developer help.

- [x] `/admin` route in client with shared-secret auth
- [x] Tournament editor form (name, year, logo) *(JSON editor + logo uploader)*
- [x] Card type enable/disable + position editing *(via JSON editor)*
- [x] CSV team import (id, name, logo_url columns)
- [x] Team logo upload (individual presigned URLs)
- [x] Config preview before publish
- [x] Export config as JSON backup

### Phase 5f: Admin Bulk Operations

**Goal:** Streamline admin workflows for bulk asset management.

- [x] **Download All Cards (ZIP)** - Download all rendered cards from current filter as a zip file
  - Uses JSZip to create zip client-side
  - Fetches card images via presigned S3 URLs (avoids CORS)
  - Files named `{name}-{cardId}.png`
  - Zip named `cards-{status}-{date}.zip`
- [x] **Upload Team Logos (ZIP)** - Bulk upload team logos via zip file
  - `POST /admin/tournaments/:id/logos-zip`
  - Accepts zip with `{team-id}.png` files at root
  - Validates team IDs against tournament config
  - Reports uploaded, skipped (invalid team), and missing logos
- [x] **Tournament Bundle Export** - Export complete tournament as zip
  - `GET /admin/tournaments/:id/bundle`
  - Includes: `config.json`, `tournament-logo.png`, `org-logo.png`, `teams/*.png`
  - Enables backup and transfer between environments
- [x] **Tournament Bundle Import** - Import tournament from zip
  - `POST /admin/tournaments/import-bundle`
  - Creates/updates tournament from `config.json`
  - Uploads all included assets to correct S3 paths
  - Auto-updates tournament list
- [x] **Presigned Download URLs** - Server endpoint for CORS-free downloads
  - `GET /admin/cards/:id/download-url`
  - Returns presigned S3 URL with `Content-Disposition: attachment`
  - Enables client-side zip creation without CORS issues

---

## USQC 2025 Seed Data

### Teams (66 total)

Full list extracted from old app's `teams.js`:

```json
[
  { "id": "arizona-state", "name": "Arizona State University", "logoKey": "teams/arizona-state.png" },
  { "id": "atlantic-dragons", "name": "Atlantic Dragons Quadball", "logoKey": "teams/atlantic-dragons.png" },
  { "id": "ball-state", "name": "Ball State Cardinals", "logoKey": "teams/ball-state.png" },
  { "id": "bay-area-breakers", "name": "Bay Area Breakers", "logoKey": "teams/bay-area-breakers.png" },
  { "id": "baylor", "name": "Baylor QC", "logoKey": "teams/baylor.png" },
  ...
]
```

### Card Types Configuration

```json
{
  "cardTypes": [
    {
      "type": "player",
      "enabled": true,
      "label": "Player",
      "showTeamField": true,
      "showJerseyNumber": true,
      "positions": ["Beater", "Chaser", "Keeper", "Seeker", "Utility"]
    },
    {
      "type": "team-staff",
      "enabled": true,
      "label": "Team Staff",
      "showTeamField": true,
      "showJerseyNumber": false,
      "positions": ["Captain", "Coach", "Manager", "Mascot", "Team Staff"]
    },
    {
      "type": "media",
      "enabled": true,
      "label": "Media",
      "showTeamField": false,
      "showJerseyNumber": false,
      "logoOverrideKey": "logos/org.png",
      "positions": ["Commentator", "Livestream", "Photographer", "Videographer", "Media"]
    },
    {
      "type": "official",
      "enabled": true,
      "label": "Official",
      "showTeamField": false,
      "showJerseyNumber": false,
      "logoOverrideKey": "logos/org.png",
      "positions": ["Flag Runner", "Head Referee", "Referee"]
    },
    {
      "type": "tournament-staff",
      "enabled": true,
      "label": "Tournament Staff",
      "showTeamField": false,
      "showJerseyNumber": false,
      "positions": ["Gameplay", "Tournament Staff", "Volunteer"]
    },
    {
      "type": "rare",
      "enabled": true,
      "label": "Rare Card",
      "showTeamField": false,
      "showJerseyNumber": false,
      "positions": []
    }
  ]
}
```

---

## Technical Decisions

### Why Discriminated Union for Card Types?

- Type-safe field access based on `cardType`
- Compile-time validation of required fields
- Clear documentation of what fields each type has
- Easy to add new card types in the future
- Drafts can have optional fields; submit enforces completeness

### Why S3 for Tournament Config?

- Tournament config is mostly static (changes rarely)
- Easy to cache via CloudFront (fast global access)
- Simple to version and backup (published vs draft)
- Admin writes JSON, client reads JSON
- No complex queries needed

### Why Keep Cards in DynamoDB?

- Cards are dynamic (created/updated frequently)
- Need status queries for admin views
- Conditional writes for idempotent submit
- GSI for efficient listing by tournament/status

### Why Published vs Draft Config?

- Admin can preview changes before going live
- Rollback if config breaks something
- Future: scheduled publishing, A/B testing

---

## Migration Notes

### Backward Compatibility

Options:
1. Migrate existing cards to a "legacy" tournament with `tournamentId: "legacy"`
2. Require `tournamentId` on all new cards, archive old cards (cleaner)

**Recommendation:** Option 2. Clear the deck before tournament support goes live.

### URL Structure

Consider adding tournament to URL for shareability:
- `/tournament/usqc-2025/card/new`
- `/tournament/usqc-2025/card/:id`

Benefits:
- Links preserve tournament context
- Bookmarkable tournament landing pages
- SEO for future public galleries

---

## Updated Milestones

1. **Phase 0: Infra Skeleton** ✅
2. **Phase 1: Card Builder UI** ✅
3. **Phase 2: AWS Uploads** ✅
4. **Phase 3: Submission Pipeline** ✅
5. **Phase 3b: Critical Bug Fixes** ✅
6. **Phase 4: API/Server Hardening** ✅
7. **Phase 4b: Developer Experience** ✅
8. **Pre-Phase 5: Critical Fixes** ← **DO FIRST**
   - Server-side validation (max lengths, patterns)
   - PATCH → UpdateCommand (or optimistic concurrency)
   - Auth/abuse controls (pending new security approach)
9. **Phase 5: Tournament Support** ✅
   - 5a: Card Type Union + Per-Type Validation ✅
   - 5b: Tournament ID + Hard-Coded USQC 2025 ✅
   - 5c: S3 Config + Public Endpoints ✅
   - 5d: Multi-Card-Type Rendering ✅
   - 5e: Admin Portal MVP ✅
   - 5f: Admin Bulk Operations ✅
10. **Phase 6: UX Upgrades** - Planned
11. **Phase 7: Polish** - Planned
12. **Phase 8: Production** - Planned (rate limiting, monitoring, CI/CD)
