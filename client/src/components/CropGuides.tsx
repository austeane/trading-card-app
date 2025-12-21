import { GUIDE_PERCENTAGES } from 'shared'

type CropGuidesProps = {
  visible: boolean
  mode?: 'trim' | 'safe' | 'both'
  basis?: 'card' | 'trim'
}

const toInsetStyle = (values: typeof GUIDE_PERCENTAGES.trim) => ({
  left: `${values.left}%`,
  top: `${values.top}%`,
  right: `${values.right}%`,
  bottom: `${values.bottom}%`,
})

export default function CropGuides({
  visible,
  mode = 'both',
  basis = 'card',
}: CropGuidesProps) {
  if (!visible) return null

  // When basis="trim", the container edge IS the trim line, so showing the trim guide
  // would be redundant and incorrectly positioned (GUIDE_PERCENTAGES.trim is bleed-relative)
  const showTrim = (mode === 'trim' || mode === 'both') && basis !== 'trim'
  const showSafe = mode === 'safe' || mode === 'both'
  const safeGuide =
    basis === 'trim' ? GUIDE_PERCENTAGES.safeWithinTrim : GUIDE_PERCENTAGES.safe

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {showTrim ? (
        <div
          className="absolute rounded-xl border-2 border-rose-400/80"
          style={toInsetStyle(GUIDE_PERCENTAGES.trim)}
        />
      ) : null}
      {showSafe ? (
        <div
          className="absolute rounded-lg border-2 border-dashed border-sky-400/80"
          style={toInsetStyle(safeGuide)}
        />
      ) : null}
    </div>
  )
}
