import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CARD_ASPECT, type ApiResponse, type CardDesign, type CropRect } from 'shared'
import { renderCard } from './renderCard'

// In dev mode, use the Lambda URL directly. In production, use relative URLs (Router handles routing).
const API_BASE =
  import.meta.env.DEV && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') // Remove trailing slash
    : '/api'

// For media URLs (/u/*, /r/*), use Router URL in dev, relative in production
const MEDIA_BASE =
  import.meta.env.DEV && import.meta.env.VITE_ROUTER_URL
    ? import.meta.env.VITE_ROUTER_URL.replace(/\/$/, '')
    : ''

const api = (path: string) => `${API_BASE}${path}`
const media = (path: string) => `${MEDIA_BASE}${path}`

type FormState = {
  cardType: string
  team: string
  position: string
  jerseyNumber: string
  firstName: string
  lastName: string
  photographer: string
}

type PhotoState = {
  file: File
  localUrl: string
  width: number
  height: number
}

type UploadedPhoto = {
  key: string
  publicUrl: string
  width: number
  height: number
}

type SavePayload = {
  type?: string
  teamId?: string
  position?: string
  jerseyNumber?: string
  firstName?: string
  lastName?: string
  photographer?: string
  photo?: {
    originalKey?: string
    width?: number
    height?: number
    crop?: CropRect
  }
}

type Rotation = CropRect['rotateDeg']

type PresignResponse = {
  uploadUrl: string
  key: string
  publicUrl: string
  method: string
  headers: Record<string, string>
}

const initialForm: FormState = {
  cardType: '',
  team: '',
  position: '',
  jerseyNumber: '',
  firstName: '',
  lastName: '',
  photographer: '',
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

async function fetchHello(): Promise<ApiResponse> {
  const res = await fetch(api('/hello'))
  if (!res.ok) {
    throw new Error('API request failed')
  }
  return res.json()
}

async function createCard(payload: SavePayload): Promise<CardDesign> {
  const res = await fetch(api('/cards'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error('Could not create card')
  }

  return res.json()
}

async function updateCard(id: string, payload: SavePayload): Promise<CardDesign> {
  const res = await fetch(api(`/cards/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error('Could not update card')
  }

  return res.json()
}

async function requestPresign(
  cardId: string,
  file: File,
  kind: 'original' | 'crop' | 'render'
): Promise<PresignResponse> {
  const res = await fetch(api('/uploads/presign'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardId,
      contentType: file.type,
      contentLength: file.size,
      kind,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error ?? 'Could not get upload URL')
  }

  return res.json()
}

async function uploadToS3(presign: PresignResponse, file: File | Blob): Promise<void> {
  const res = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers: presign.headers,
    body: file,
  })

  if (!res.ok) {
    throw new Error('Upload failed')
  }
}

async function requestPresignForBlob(
  cardId: string,
  blob: Blob,
  kind: 'original' | 'crop' | 'render'
): Promise<PresignResponse> {
  const res = await fetch(api('/uploads/presign'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardId,
      contentType: blob.type,
      contentLength: blob.size,
      kind,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error ?? 'Could not get upload URL')
  }

  return res.json()
}

async function submitCard(id: string, renderKey: string): Promise<CardDesign> {
  const res = await fetch(api(`/cards/${id}/submit`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ renderKey }),
  })

  if (!res.ok) {
    throw new Error('Could not submit card')
  }

  return res.json()
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [photo, setPhoto] = useState<PhotoState | null>(null)
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState<Rotation>(0)
  const [normalizedCrop, setNormalizedCrop] = useState<CropRect | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [savedCard, setSavedCard] = useState<CardDesign | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [renderedCardUrl, setRenderedCardUrl] = useState<string | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'rendering' | 'uploading' | 'submitting' | 'done' | 'error'>('idle')

  const helloQuery = useQuery({
    queryKey: ['hello'],
    queryFn: fetchHello,
    enabled: false,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      setError(null)

      // Build base payload
      const payload: SavePayload = {
        type: form.cardType || undefined,
        teamId: form.team || undefined,
        position: form.position || undefined,
        jerseyNumber: form.jerseyNumber || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        photographer: form.photographer || undefined,
      }

      // Step 1: Create or get card ID
      let currentCardId = cardId
      if (!currentCardId) {
        const card = await createCard(payload)
        currentCardId = card.id
        setCardId(card.id)
      }

      // Step 2: Upload photo if we have a new one that hasn't been uploaded
      let photoPayload: SavePayload['photo'] = undefined

      if (photo && !uploadedPhoto) {
        setUploadStatus('uploading')

        try {
          const presign = await requestPresign(currentCardId, photo.file, 'original')
          await uploadToS3(presign, photo.file)

          const uploaded: UploadedPhoto = {
            key: presign.key,
            publicUrl: presign.publicUrl,
            width: photo.width,
            height: photo.height,
          }
          setUploadedPhoto(uploaded)
          setUploadStatus('uploaded')

          photoPayload = {
            originalKey: uploaded.key,
            width: uploaded.width,
            height: uploaded.height,
            crop: normalizedCrop ?? undefined,
          }
        } catch (err) {
          setUploadStatus('error')
          throw err
        }
      } else if (uploadedPhoto) {
        // Photo already uploaded, just update crop
        photoPayload = {
          originalKey: uploadedPhoto.key,
          width: uploadedPhoto.width,
          height: uploadedPhoto.height,
          crop: normalizedCrop ?? undefined,
        }
      } else if (normalizedCrop) {
        // Just crop, no photo
        photoPayload = { crop: normalizedCrop }
      }

      if (photoPayload) {
        payload.photo = photoPayload
      }

      // Step 3: Update card with all data
      const updatedCard = await updateCard(currentCardId, payload)
      return updatedCard
    },
    onSuccess: (data) => {
      setSavedCard(data)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!cardId || !uploadedPhoto || !normalizedCrop) {
        throw new Error('Please save draft with photo first')
      }

      setError(null)

      // Step 1: Render the card
      setSubmitStatus('rendering')
      const imageUrl = media(uploadedPhoto.publicUrl)
      const blob = await renderCard({
        imageUrl,
        crop: normalizedCrop,
        firstName: form.firstName,
        lastName: form.lastName,
        position: form.position,
        team: form.team,
        jerseyNumber: form.jerseyNumber,
        photographer: form.photographer,
      })

      // Step 2: Upload rendered PNG
      setSubmitStatus('uploading')
      const presign = await requestPresignForBlob(cardId, blob, 'render')
      await uploadToS3(presign, blob)

      // Step 3: Submit the card
      setSubmitStatus('submitting')
      const submitted = await submitCard(cardId, presign.key)

      // Store the rendered card URL for display
      setRenderedCardUrl(media(presign.publicUrl))
      setSubmitStatus('done')

      return submitted
    },
    onSuccess: (data) => {
      setSavedCard(data)
    },
    onError: (err) => {
      setSubmitStatus('error')
      setError(err instanceof Error ? err.message : 'Submission failed')
    },
  })

  const statusMessage = useMemo(() => {
    if (saveMutation.isPending) {
      if (uploadStatus === 'uploading') return 'Uploading photo...'
      return 'Saving draft...'
    }
    if (saveMutation.isSuccess) return 'Draft saved'
    return 'Not saved'
  }, [saveMutation.isPending, saveMutation.isSuccess, uploadStatus])

  const errorMessage = useMemo(() => {
    const err = error ?? (helloQuery.error instanceof Error ? helloQuery.error.message : null)
    return err
  }, [error, helloQuery.error])

  const handleFieldChange = (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const dimensions = await loadImageDimensions(file)
      const localUrl = URL.createObjectURL(file)

      setPhoto((prev) => {
        if (prev) URL.revokeObjectURL(prev.localUrl)
        return {
          file,
          localUrl,
          width: dimensions.width,
          height: dimensions.height,
        }
      })

      // Reset upload state when new photo is selected
      setUploadedPhoto(null)
      setUploadStatus('idle')

      // Reset crop
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setNormalizedCrop(null)
    } catch {
      setError('Failed to load image')
    }
  }, [])

  // react-easy-crop onCropComplete: (croppedArea, croppedAreaPixels)
  // 1st arg = percentages (0-100), 2nd arg = pixels
  const handleCropComplete = useCallback((croppedAreaPercent: Area) => {
    const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
    setNormalizedCrop({
      x: clamp01(Number((croppedAreaPercent.x / 100).toFixed(4))),
      y: clamp01(Number((croppedAreaPercent.y / 100).toFixed(4))),
      w: clamp01(Number((croppedAreaPercent.width / 100).toFixed(4))),
      h: clamp01(Number((croppedAreaPercent.height / 100).toFixed(4))),
      rotateDeg: rotation,
    })
  }, [rotation])

  const handleZoom = (delta: number) => {
    setZoom((prev) => clamp(Number((prev + delta).toFixed(2)), 1, 3))
  }

  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  const handleSaveDraft = () => {
    saveMutation.mutate()
  }

  const displayName = useMemo(() => {
    const full = `${form.firstName} ${form.lastName}`.trim()
    return full.length > 0 ? full : 'Player Name'
  }, [form.firstName, form.lastName])

  // Use S3 URL if uploaded, otherwise local blob URL
  const cropperImageUrl = uploadedPhoto ? media(uploadedPhoto.publicUrl) : photo?.localUrl ?? null

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Trading Card Studio
          </p>
          <div className="space-y-2">
            <h1 className="font-display text-4xl text-white md:text-5xl">
              Build your card from a single crop
            </h1>
            <p className="max-w-2xl text-base text-slate-300">
              Upload a photo, drag to frame the shot, and save a draft. This is the
              starting point for the full render pipeline.
            </p>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Card Details</h2>
                <p className="text-sm text-slate-400">
                  Draft ID: {cardId ?? 'Not created'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => helloQuery.refetch()}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition hover:border-white/40"
                >
                  Ping API
                </button>
                <span>
                  {helloQuery.data ? 'Connected' : 'Idle'}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Card Type
                <select
                  value={form.cardType}
                  onChange={handleFieldChange('cardType')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select type</option>
                  <option value="player">Player</option>
                  <option value="staff">Staff</option>
                  <option value="media">Media</option>
                  <option value="official">Official</option>
                </select>
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Team
                <input
                  value={form.team}
                  onChange={handleFieldChange('team')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  placeholder="Bay Area Breakers"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Position
                <input
                  value={form.position}
                  onChange={handleFieldChange('position')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  placeholder="Keeper"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Jersey Number
                <input
                  value={form.jerseyNumber}
                  onChange={handleFieldChange('jerseyNumber')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  placeholder="15"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                First Name
                <input
                  value={form.firstName}
                  onChange={handleFieldChange('firstName')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  placeholder="Brandon"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Last Name
                <input
                  value={form.lastName}
                  onChange={handleFieldChange('lastName')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  placeholder="Williams"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-400 sm:col-span-2">
                Photo Credit
                <input
                  value={form.photographer}
                  onChange={handleFieldChange('photographer')}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  placeholder="Paul Schiopu"
                />
              </label>
            </div>

            <div className="mt-6">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Player Photo
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white transition hover:border-white/40">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                    Upload
                  </label>
                  <span className="text-xs text-slate-400">
                    {photo ? photo.file.name : 'No file selected'}
                  </span>
                  {uploadedPhoto && (
                    <span className="text-xs text-emerald-400">Uploaded</span>
                  )}
                </div>
                {photo && (
                  <p className="mt-1 text-xs text-slate-500">
                    {photo.width} x {photo.height} px
                  </p>
                )}
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saveMutation.isPending}
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cardId ? 'Update Draft' : 'Create Draft'}
              </button>
              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={!cardId || !uploadedPhoto || submitMutation.isPending}
                className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Card'}
              </button>
              <span className="text-xs text-slate-400">{statusMessage}</span>
              {submitStatus !== 'idle' && submitStatus !== 'done' && submitStatus !== 'error' && (
                <span className="text-xs text-amber-400">
                  {submitStatus === 'rendering' && 'Rendering card...'}
                  {submitStatus === 'uploading' && 'Uploading render...'}
                  {submitStatus === 'submitting' && 'Submitting...'}
                </span>
              )}
              {submitStatus === 'done' && (
                <span className="text-xs text-emerald-400">Card submitted!</span>
              )}
              {errorMessage ? (
                <span className="text-xs text-rose-300">{errorMessage}</span>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold text-white">Live Crop</h2>
                <p className="text-sm text-slate-400">
                  Drag the image to frame it. Scroll or pinch to zoom.
                </p>
              </div>

              <div className="mt-5">
                {/* Aspect ratio matches CARD_ASPECT (825:1125) */}
                <div className="relative aspect-[825/1125] w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 shadow-[0_20px_60px_rgba(3,7,18,0.6)]">
                  {cropperImageUrl ? (
                    <Cropper
                      image={cropperImageUrl}
                      crop={crop}
                      zoom={zoom}
                      rotation={0}
                      aspect={CARD_ASPECT}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={handleCropComplete}
                      showGrid={false}
                      classes={{
                        containerClassName: 'cropper-container',
                        cropAreaClassName: 'cropper-area',
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                      Upload a photo to start cropping
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleZoom(0.2)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition hover:border-white/40"
                >
                  Zoom In
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(-0.2)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition hover:border-white/40"
                >
                  Zoom Out
                </button>
                {/* Rotation disabled for v1 - math needs fixing for 90°/270° */}
                <button
                  type="button"
                  onClick={handleResetCrop}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white transition hover:border-white/40"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Preview Meta
              </h3>
              <div className="mt-4 space-y-3">
                <div className="font-display text-2xl text-white">
                  {displayName}
                </div>
                <div className="text-sm text-slate-300">
                  {form.position || 'Position'} / {form.team || 'Team'}
                </div>
                <div className="text-xs text-slate-400">
                  Crop: {normalizedCrop ? `${normalizedCrop.w.toFixed(2)} x ${normalizedCrop.h.toFixed(2)}` : '-'}
                </div>
                {uploadedPhoto && (
                  <div className="text-xs text-slate-400">
                    Photo: <span className="text-emerald-400">{uploadedPhoto.key}</span>
                  </div>
                )}
                {savedCard ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                    Saved as <span className="text-white">{savedCard.id}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {renderedCardUrl && (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 backdrop-blur">
                <h3 className="text-sm uppercase tracking-[0.2em] text-emerald-400">
                  Rendered Card
                </h3>
                <div className="mt-4">
                  <img
                    src={renderedCardUrl}
                    alt="Rendered trading card"
                    className="w-full rounded-2xl shadow-lg"
                  />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <a
                    href={renderedCardUrl}
                    download="trading-card.png"
                    className="rounded-full border border-emerald-500/30 px-4 py-2 text-xs text-emerald-400 transition hover:border-emerald-500/60 hover:bg-emerald-500/10"
                  >
                    Download PNG
                  </a>
                  <span className="text-xs text-slate-400">
                    Status: {savedCard?.status ?? 'unknown'}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default App
