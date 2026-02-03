import type {
  CardType,
  TemplateDefinition,
  TemplateLayout,
  TemplateLayoutOverride,
  TournamentConfig,
  Usqc26LayoutV1,
} from "./types"
import { USQC26_LAYOUT_V1 } from "./constants"

export const DEFAULT_TEMPLATE_ID = "classic"
export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = USQC26_LAYOUT_V1

export const resolveTemplateId = (
  input: { templateId?: string | null; cardType?: CardType },
  config?: TournamentConfig | null
) => {
  const direct = typeof input.templateId === "string" ? input.templateId.trim() : ""
  if (direct) return direct

  const cardType = input.cardType
  const byType = cardType ? config?.defaultTemplates?.byCardType?.[cardType] : undefined
  if (byType) return byType

  const fallback = config?.defaultTemplates?.fallback
  if (fallback) return fallback

  return DEFAULT_TEMPLATE_ID
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const mergeRecords = <T>(base: T, override?: Partial<T>): T => {
  if (!override) return deepClone(base)
  const result = deepClone(base) as Record<string, unknown>
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const baseValue = result[key]
    if (isRecord(baseValue) && isRecord(value)) {
      result[key] = mergeRecords(baseValue, value)
    } else {
      result[key] = value
    }
  }
  return result as T
}

const resolveUsqc26Layout = (override?: TemplateLayoutOverride | null): Usqc26LayoutV1 => {
  if (!override) return deepClone(USQC26_LAYOUT_V1)
  if (override.kind && override.kind !== "usqc26-v1") {
    return deepClone(USQC26_LAYOUT_V1)
  }
  const merged = mergeRecords(USQC26_LAYOUT_V1, override as Partial<Usqc26LayoutV1>)
  return { ...merged, kind: "usqc26-v1" }
}

export const resolveTemplateLayout = (template?: TemplateDefinition | null): TemplateLayout => {
  if (!template?.layout) return resolveUsqc26Layout()
  return resolveUsqc26Layout(template.layout)
}

export const findTemplate = (
  config: TournamentConfig | null | undefined,
  templateId: string | null | undefined
): TemplateDefinition | null => {
  if (!config?.templates || !templateId) return null
  return config.templates.find((template) => template.id === templateId) ?? null
}
