# Auto-Render On Submit + Admin Edit/Re-Render Plan

Created: 2026-02-25T18:57:42Z  
Status: Active

## Goal

Remove manual repetitive rendering from admin by making submit produce a rendered card automatically (or queue it), while keeping admin controls to review, edit, and re-render individual cards.

## Current Problem

- Cards are `submitted` first and only become `rendered` after a manual admin render action.
- This creates operational backlog and repetitive manual work.
- Admin list query currently returns a limited subset and has no pagination UI, which can hide older submitted cards.

## Desired Outcome

1. User submit should result in one of:
   - `rendered` immediately (preferred fast path), or
   - `submitted` + queued for async render (fallback path).
2. Admin should open any rendered/submitted card, edit data/template, and click re-render.
3. Rendering failures should be observable and retryable without manual database intervention.

## Architecture Direction

### Submit-Time Render Paths

1. **Client fast path (existing renderer):**
   - Client renders PNG at submit time.
   - Uploads render via public edit-token protected presign endpoint.
   - Calls submit with `renderKey` + `renderMeta`.
   - Server marks card `rendered`.

2. **Server queue fallback path:**
   - If client render/upload fails, client still submits.
   - Server marks card `submitted` and enqueues render job.
   - Worker renders and commits card to `rendered`.

### Async Render Infrastructure

- New `RenderJobs` SQS queue + DLQ.
- New render worker Lambda.
- Worker flow:
  1. Fetch card + tournament config.
  2. Load source photo.
  3. Render PNG.
  4. Upload to `renders/<cardId>/<renderId>.png`.
  5. Commit `renderKey`, `renderMeta`, status `rendered`.
- Retry policy with capped attempts and DLQ on terminal failure.

## API Changes

1. Add `POST /cards/:id/renders/presign` (public, requires `X-Edit-Token`).
2. Update `POST /cards/:id/submit`:
   - If valid `renderKey` + `renderMeta` provided: set `status=rendered`.
   - Otherwise: set `status=submitted` and enqueue render job.
3. Expand admin patch endpoint to support practical edit fields (not just `templateId`) for re-render workflows.
4. Keep existing admin re-render endpoint behavior as explicit manual override.

## Data Model Additions

Add optional render workflow fields on card records:

- `renderState`: `pending | queued | rendering | rendered | failed`
- `renderAttempts`: number
- `lastRenderError`: string
- `renderQueuedAt`: ISO timestamp
- `renderedAt`: ISO timestamp (already in renderMeta; expose consistently)

## Admin UX Changes

1. Card tiles remain listable by status, but rendered preview becomes clickable.
2. Click opens card detail view (drawer/modal/page) with:
   - editable fields,
   - template selector,
   - render metadata,
   - `Re-render` action.
3. Show render state badges and failure reason.
4. Add list pagination/cursor support so all submitted cards are reachable.

## Observability

1. Structured logs:
   - submit render mode (`client_rendered` vs `queued_fallback`)
   - queue enqueue/dequeue
   - render success/failure reason
2. Metrics and alarms:
   - queue depth
   - worker error rate
   - DLQ message count
   - render latency percentiles

## Rollout Plan

1. **Phase 1: Backend foundations**
   - Add public render presign endpoint.
   - Update submit endpoint branching.
   - Add queue + worker + DLQ infra.
2. **Phase 2: Client submit flow**
   - Attempt client render/upload before submit.
   - Fallback to queued submit on failure.
3. **Phase 3: Admin UX**
   - Add card detail edit/rerender view.
   - Add pagination to card list.
4. **Phase 4: Backfill + verification**
   - One-time backfill job for any existing submitted cards without render.
   - Validate end-to-end with production-safe monitoring.

## Testing Strategy

1. Unit tests:
   - submit status transitions
   - renderMeta validation
   - queue enqueue conditions
2. Integration tests:
   - submit with render payload -> `rendered`
   - submit without render payload -> `submitted` + queued
   - worker success + retry + DLQ
3. UI tests:
   - submit fallback messaging
   - admin card detail edit + rerender
   - pagination/load more behavior

## Risks and Mitigations

1. **Worker complexity (canvas/font/image libs in Lambda)**  
   Mitigation: use container/image-compatible runtime or keep client fast path primary.
2. **Duplicate renders from retries**  
   Mitigation: idempotency checks on card status and render key before commit.
3. **Race conditions (manual re-render vs queued render)**  
   Mitigation: conditional updates with version/timestamp checks.
4. **Cost increase from automatic rendering**  
   Mitigation: track volume/cost metrics and tune queue concurrency.

## Definition of Done

1. Newly submitted cards no longer require manual admin render in normal flow.
2. Admin can open, edit, and re-render any card from the panel.
3. Render failures are visible and retryable.
4. No hidden submitted cards due to list truncation.
