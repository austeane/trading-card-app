# Print Guide Decisions (Bleed-Canonical)

## Problem
The preview pipeline was stretching the safe-zone crop to fill the full card canvas (825x1125), which distorted the image because the safe/trim/full areas have different aspect ratios. We needed previews and guides that match what users should expect from the trimmed card, while still delivering full-bleed outputs for print.

## Requirements (from discussion)
- Full-bleed output remains 825x1125.
- Live preview for submitters should be trim-aspect with overlays rendered on top.
- Cropper shows the trim (red) guide for submitters.
- Admin template preview shows only the safe (blue) guide.
- Existing cards can be deleted (no migration required).

## Decisions

### Crop Storage: Bleed-Canonical
Stored crop data is interpreted as **bleed-aspect framing**. The persisted `photo.crop` rectangle maps directly to the full 825×1125 canvas. This means:
- The cropper interaction matches the final render exactly (1:1 mapping)
- No conversion math is needed between storage and rendering
- Zero risk of "not enough bleed" edge cases

### Preview: Trim-Cropped
Live previews are produced by:
1. Rendering the full 825×1125 card with all overlays
2. Cropping to the trim box (750×1050) for display

This shows users exactly what the trimmed card will look like.

### Output: Full Bleed
Final renders remain 825×1125 PNG for print. The printer receives the full bleed area.

### Guides: Role-Specific
- **Submitter cropper**: Shows trim (red) guide only, indicating where the card will be cut
- **Admin template preview**: Shows safe (blue) guide positioned inside the trim frame

### Text Positioning: Trim Zone
Core UI elements (card label, logo, photographer credit) are positioned in the **trim zone** (outside safe, inside trim). This is intentional:
- These elements will be visible on a well-cut card
- The safe zone (blue guide) is for **template overlay guidance only**
- Template designers should keep custom overlays inside safe zone

## Print Geometry (reference)
| Zone | Dimensions | Aspect Ratio | Inset from Bleed |
|------|------------|--------------|------------------|
| Bleed (full) | 825 × 1125 | 0.7333 | 0px |
| Trim (red) | 750 × 1050 | 0.7143 | 37.5px |
| Safe (blue) | 675 × 975 | 0.6923 | 75px |

## Implementation Notes

### Cropper Aspect
The react-easy-crop component uses `CARD_ASPECT` (825/1125), not `TRIM_ASPECT`. This ensures the stored crop maps directly to the bleed canvas.

### Border Positioning
Decorative borders are drawn inside the trim zone so they appear in previews and survive cutting.

### CropGuides Component
When `basis="trim"`, the component uses `safeWithinTrim` percentages calculated relative to the trim box dimensions. The trim guide itself is suppressed when `basis="trim"` since it would be redundant (the frame edge *is* the trim line).
