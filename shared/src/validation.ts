import { z } from 'zod'

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const ALLOWED_RENDER_TYPES = ['image/png'] as const

export const MAX_NAME_LENGTH = 50
export const MAX_TITLE_LENGTH = 50
export const MAX_CAPTION_LENGTH = 100
export const MAX_PHOTOGRAPHER_LENGTH = 48
export const MAX_TEAM_LENGTH = 64
export const MAX_POSITION_LENGTH = 32
export const MAX_JERSEY_LENGTH = 2

export const JERSEY_PATTERN = /^\d{1,2}$/

// Zod schemas for TemplateLayout validation

export const LayoutColorPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  white: z.string(),
  numberOverlay: z.string(),
})

export const LayoutTypographySchema = z.object({
  fontFamily: z.string(),
})

export const FrameLayoutSchema = z.object({
  outerRadius: z.number(),
  innerX: z.number(),
  innerY: z.number(),
  innerWidth: z.number(),
  innerHeight: z.number(),
  innerRadius: z.number(),
})

export const NameBoxSchema = z.object({
  width: z.number(),
  height: z.number(),
  borderWidth: z.number(),
  strokeWidth: z.number(),
})

export const NameLayoutSchema = z.object({
  rotation: z.number(),
  maxWidth: z.number(),
  firstNameBox: NameBoxSchema,
  lastNameBox: NameBoxSchema,
  anchorX: z.number(),
  anchorY: z.number(),
  firstNameSize: z.number(),
  lastNameSize: z.number(),
  letterSpacing: z.object({
    firstName: z.number(),
    lastName: z.number(),
  }),
  leftPadding: z.number(),
  rightPadding: z.number(),
  boxExtension: z.number(),
  textYOffset: z.number(),
  boxOffsets: z.object({
    firstName: z.number(),
    lastName: z.number(),
  }),
  textOffsets: z.object({
    firstName: z.number(),
    lastName: z.number(),
  }),
})

export const EventBadgeLayoutSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  borderRadius: z.number(),
  borderWidth: z.number(),
  fontSize: z.number(),
  textYOffset: z.number(),
})

export const PositionNumberLayoutSchema = z.object({
  centerX: z.number(),
  topY: z.number(),
  positionFontSize: z.number(),
  numberFontSize: z.number(),
  positionLetterSpacing: z.number(),
  numberLetterSpacing: z.number(),
  positionStrokeWidth: z.number(),
  numberStrokeWidth: z.number(),
  numberXOffset: z.number(),
})

export const TeamLogoLayoutSchema = z.object({
  x: z.number(),
  y: z.number(),
  maxWidth: z.number(),
  maxHeight: z.number(),
  strokeWidth: z.number(),
  strokeColor: z.string(),
})

export const CameraIconLayoutSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

export const BottomBarLayoutSchema = z.object({
  y: z.number(),
  height: z.number(),
  textYOffset: z.number(),
  cameraIcon: CameraIconLayoutSchema,
  photographerX: z.number(),
  rarityX: z.number(),
  raritySize: z.number(),
  rarityGap: z.number(),
  teamNameX: z.number(),
  fontSize: z.number(),
  letterSpacing: z.object({
    photographer: z.number(),
    teamName: z.number(),
  }),
})

export const RareCardLayoutSchema = z.object({
  rotation: z.number(),
  anchorX: z.number(),
  anchorY: z.number(),
  maxWidth: z.number(),
  titleTextOffsetX: z.number(),
  captionTextOffsetX: z.number(),
  titleLetterSpacing: z.number(),
  captionLetterSpacing: z.number(),
})

export const SuperRareLayoutSchema = z.object({
  centerX: z.number(),
  firstNameY: z.number(),
  lastNameY: z.number(),
  firstNameSize: z.number(),
  lastNameSize: z.number(),
})

export const NationalTeamLogoSchema = z.object({
  x: z.number(),
  y: z.number(),
  maxWidth: z.number(),
  maxHeight: z.number(),
})

export const NationalTeamLayoutSchema = z.object({
  rotation: z.number(),
  anchorX: z.number(),
  anchorY: z.number(),
  boxWidth: z.number(),
  boxHeight: z.number(),
  boxBorderWidth: z.number(),
  textPaddingX: z.number(),
  nameFontSize: z.number(),
  logo: NationalTeamLogoSchema,
})

export const Usqc26LayoutV1Schema = z.object({
  kind: z.literal('usqc26-v1'),
  palette: LayoutColorPaletteSchema,
  typography: LayoutTypographySchema,
  frame: FrameLayoutSchema,
  name: NameLayoutSchema,
  eventBadge: EventBadgeLayoutSchema,
  positionNumber: PositionNumberLayoutSchema,
  teamLogo: TeamLogoLayoutSchema,
  bottomBar: BottomBarLayoutSchema,
  rareCard: RareCardLayoutSchema,
  superRare: SuperRareLayoutSchema,
  nationalTeam: NationalTeamLayoutSchema,
})

export const TemplateLayoutSchema = Usqc26LayoutV1Schema

// Template theme and flags schemas for RenderMeta validation
export const TemplateThemeSchema = z.object({
  gradientStart: z.string(),
  gradientEnd: z.string(),
  border: z.string(),
  accent: z.string(),
  label: z.string(),
  nameColor: z.string(),
  meta: z.string(),
  watermark: z.string(),
})

export const TemplateFlagsSchema = z.object({
  showGradient: z.boolean(),
  showBorders: z.boolean(),
  showWatermarkJersey: z.boolean(),
})

export const TemplateSnapshotSchema = z.object({
  overlayKey: z.string().optional(),
  theme: TemplateThemeSchema,
  flags: TemplateFlagsSchema,
  overlayPlacement: z.enum(['belowText', 'aboveText']),
  layout: TemplateLayoutSchema,
})

export const RenderMetaSchema = z.object({
  key: z.string(),
  templateId: z.string(),
  renderedAt: z.string(),
  templateSnapshot: TemplateSnapshotSchema,
})

// Type exports for convenience
export type LayoutColorPaletteInput = z.input<typeof LayoutColorPaletteSchema>
export type LayoutTypographyInput = z.input<typeof LayoutTypographySchema>
export type Usqc26LayoutV1Input = z.input<typeof Usqc26LayoutV1Schema>
export type TemplateLayoutInput = z.input<typeof TemplateLayoutSchema>
export type RenderMetaInput = z.input<typeof RenderMetaSchema>
