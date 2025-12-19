import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, TournamentConfig, TournamentListEntry } from 'shared'
import { api, assetUrlForKey } from './api'

type LogosZipResult = {
  uploaded: string[]
  skipped: Array<{ filename: string; reason: string }>
  missingLogos: string[]
}

type BundleImportResult = {
  tournament: TournamentConfig
  results: {
    configSaved: boolean
    assetsUploaded: string[]
    assetsSkipped: string[]
  }
}

const cardDisplayName = (card: Card) => {
  if (card.cardType === 'rare') {
    return card.title ?? 'Untitled rare card'
  }
  const fullName = [card.firstName, card.lastName].filter(Boolean).join(' ')
  return fullName || 'Unnamed card'
}

const fetchJson = async <T,>(path: string) => {
  const res = await fetch(api(path))
  if (!res.ok) {
    throw new Error('Request failed')
  }
  return res.json() as Promise<T>
}

const postJson = async <T,>(path: string, body: unknown) => {
  const res = await fetch(api(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

const putJson = async <T,>(path: string, body: unknown) => {
  const res = await fetch(api(path), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export default function Admin() {
  const queryClient = useQueryClient()
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [configDraft, setConfigDraft] = useState('')
  const [statusFilter, setStatusFilter] = useState('submitted')
  const [logosZipFile, setLogosZipFile] = useState<File | null>(null)
  const [logosZipResult, setLogosZipResult] = useState<LogosZipResult | null>(null)
  const [bundleFile, setBundleFile] = useState<File | null>(null)
  const [bundleResult, setBundleResult] = useState<BundleImportResult | null>(null)

  const tournamentsQuery = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => fetchJson<TournamentListEntry[]>('/admin/tournaments'),
  })

  useEffect(() => {
    if (!activeTournamentId && tournamentsQuery.data?.length) {
      setActiveTournamentId(tournamentsQuery.data[0].id)
    }
  }, [activeTournamentId, tournamentsQuery.data])

  const configQuery = useQuery({
    queryKey: ['admin-config', activeTournamentId],
    queryFn: () => fetchJson<TournamentConfig>(`/admin/tournaments/${activeTournamentId}`),
    enabled: Boolean(activeTournamentId),
  })

  useEffect(() => {
    if (configQuery.data) {
      setConfigDraft(JSON.stringify(configQuery.data, null, 2))
    }
  }, [configQuery.data])

  const cardsQuery = useQuery({
    queryKey: ['admin-cards', statusFilter, activeTournamentId],
    queryFn: () =>
      fetchJson<Card[]>(
        `/cards?status=${encodeURIComponent(statusFilter)}${
          activeTournamentId ? `&tournamentId=${encodeURIComponent(activeTournamentId)}` : ''
        }`
      ),
  })

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(configDraft) as TournamentConfig
      return putJson<TournamentConfig>(`/admin/tournaments/${activeTournamentId}`, parsed)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', activeTournamentId] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => postJson(`/admin/tournaments/${activeTournamentId}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
    },
  })

  const logosZipMutation = useMutation({
    mutationFn: async () => {
      if (!logosZipFile) throw new Error('Select a ZIP file')
      const res = await fetch(api(`/admin/tournaments/${activeTournamentId}/logos-zip`), {
        method: 'POST',
        body: logosZipFile,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Upload failed')
      }
      return res.json() as Promise<LogosZipResult>
    },
    onSuccess: (data) => {
      setLogosZipResult(data)
      setLogosZipFile(null)
    },
  })

  const bundleImportMutation = useMutation({
    mutationFn: async () => {
      if (!bundleFile) throw new Error('Select a ZIP file')
      const res = await fetch(api('/admin/tournaments/import-bundle'), {
        method: 'POST',
        body: bundleFile,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Import failed')
      }
      return res.json() as Promise<BundleImportResult>
    },
    onSuccess: (data) => {
      setBundleResult(data)
      setBundleFile(null)
      setActiveTournamentId(data.tournament.id)
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
    },
  })

  const renderMutation = useMutation({
    mutationFn: async (id: string) => postJson(`/admin/cards/${id}/render`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards', statusFilter, activeTournamentId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      fetch(api(`/admin/cards/${id}`), {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cards', statusFilter, activeTournamentId] })
    },
  })

  const configParsed = useMemo(() => {
    try {
      return JSON.parse(configDraft) as TournamentConfig
    } catch {
      return null
    }
  }, [configDraft])

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <header>
          <h1 className="font-display text-4xl text-white">Admin Console</h1>
          <p className="text-sm text-slate-400">
            Manage tournaments, upload assets, and review submissions.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Tournament Config</h2>
              <select
                value={activeTournamentId}
                onChange={(event) => setActiveTournamentId(event.target.value)}
                className="rounded-full border border-white/20 bg-slate-950/50 px-3 py-1 text-xs text-white"
              >
                {tournamentsQuery.data?.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={configDraft}
              onChange={(event) => setConfigDraft(event.target.value)}
              className="mt-4 h-72 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-200"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => saveConfigMutation.mutate()}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs text-emerald-300"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!configParsed) return
                  const blob = new Blob([JSON.stringify(configParsed, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `${activeTournamentId}-config.json`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white"
              >
                Download JSON
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Upload Team Logos</h3>
              <p className="mt-2 text-xs text-slate-400">
                Upload a ZIP file containing team logos. Each PNG file should be named with the team ID
                (e.g., <code className="text-emerald-400">boston-kraken.png</code>).
              </p>
              <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500 mb-2">Expected structure:</p>
                <pre className="text-xs text-slate-400 font-mono">
{`logos.zip
├── team-id-1.png
├── team-id-2.png
└── ...`}
                </pre>
              </div>
              <input
                type="file"
                accept=".zip"
                className="mt-4 text-xs text-slate-300"
                onChange={(event) => {
                  setLogosZipFile(event.target.files?.[0] ?? null)
                  setLogosZipResult(null)
                }}
              />
              <button
                type="button"
                onClick={() => logosZipMutation.mutate()}
                disabled={!logosZipFile || logosZipMutation.isPending}
                className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50"
              >
                {logosZipMutation.isPending ? 'Uploading...' : 'Upload Logos ZIP'}
              </button>
              {logosZipMutation.isError && (
                <p className="mt-2 text-xs text-rose-400">
                  {logosZipMutation.error instanceof Error ? logosZipMutation.error.message : 'Upload failed'}
                </p>
              )}
              {logosZipResult && (
                <div className="mt-4 space-y-2 text-xs">
                  <p className="text-emerald-400">
                    Uploaded: {logosZipResult.uploaded.length} logos
                  </p>
                  {logosZipResult.skipped.length > 0 && (
                    <div className="text-amber-400">
                      <p>Skipped {logosZipResult.skipped.length} files:</p>
                      <ul className="mt-1 ml-4 list-disc text-slate-400">
                        {logosZipResult.skipped.slice(0, 5).map((s, i) => (
                          <li key={i}>{s.filename}: {s.reason}</li>
                        ))}
                        {logosZipResult.skipped.length > 5 && (
                          <li>...and {logosZipResult.skipped.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {logosZipResult.missingLogos.length > 0 && (
                    <div className="text-rose-400">
                      <p>Teams still missing logos: {logosZipResult.missingLogos.length}</p>
                      <ul className="mt-1 ml-4 list-disc text-slate-400">
                        {logosZipResult.missingLogos.slice(0, 5).map((id) => (
                          <li key={id}>{id}</li>
                        ))}
                        {logosZipResult.missingLogos.length > 5 && (
                          <li>...and {logosZipResult.missingLogos.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Tournament Bundle</h3>
              <p className="mt-2 text-xs text-slate-400">
                Import or export a complete tournament as a ZIP bundle including config and all assets.
              </p>
              <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500 mb-2">Bundle structure:</p>
                <pre className="text-xs text-slate-400 font-mono">
{`tournament.zip
├── config.json          (required)
├── tournament-logo.png  (optional)
├── org-logo.png         (optional)
└── teams/               (optional)
    ├── team-id-1.png
    └── ...`}
                </pre>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={api(`/admin/tournaments/${activeTournamentId}/bundle`)}
                  download
                  className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                >
                  Export Bundle
                </a>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs text-slate-500 mb-2">Import a new tournament:</p>
                <input
                  type="file"
                  accept=".zip"
                  className="text-xs text-slate-300"
                  onChange={(event) => {
                    setBundleFile(event.target.files?.[0] ?? null)
                    setBundleResult(null)
                  }}
                />
                <button
                  type="button"
                  onClick={() => bundleImportMutation.mutate()}
                  disabled={!bundleFile || bundleImportMutation.isPending}
                  className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50"
                >
                  {bundleImportMutation.isPending ? 'Importing...' : 'Import Bundle'}
                </button>
                {bundleImportMutation.isError && (
                  <p className="mt-2 text-xs text-rose-400">
                    {bundleImportMutation.error instanceof Error ? bundleImportMutation.error.message : 'Import failed'}
                  </p>
                )}
                {bundleResult && (
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="text-emerald-400">
                      Imported tournament: {bundleResult.tournament.name}
                    </p>
                    <p className="text-slate-400">
                      Assets uploaded: {bundleResult.results.assetsUploaded.length}
                    </p>
                    {bundleResult.results.assetsSkipped.length > 0 && (
                      <p className="text-amber-400">
                        Skipped: {bundleResult.results.assetsSkipped.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Card Review</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  const cardsWithRenders = cardsQuery.data?.filter((c) => c.renderKey) ?? []
                  if (cardsWithRenders.length === 0) return

                  const zip = new JSZip()

                  for (const card of cardsWithRenders) {
                    const name = card.cardType === 'rare'
                      ? (card.title ?? 'rare-card')
                      : [card.firstName, card.lastName].filter(Boolean).join('-') || 'card'
                    const filename = `${name}-${card.id.slice(0, 8)}.png`

                    // Use presigned download URL from API to avoid CORS issues
                    const res = await fetch(api(`/admin/cards/${card.id}/download-url`))
                    if (res.ok) {
                      const { url: downloadUrl } = await res.json()
                      const imageRes = await fetch(downloadUrl)
                      if (imageRes.ok) {
                        const blob = await imageRes.blob()
                        zip.file(filename, blob)
                      }
                    }
                  }

                  const zipBlob = await zip.generateAsync({ type: 'blob' })
                  const url = URL.createObjectURL(zipBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `cards-${statusFilter}-${new Date().toISOString().slice(0, 10)}.zip`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
                disabled={!cardsQuery.data?.some((c) => c.renderKey)}
                className="cursor-pointer rounded-full border border-white/20 px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download All
              </button>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-full border border-white/20 bg-slate-950/50 px-3 py-1 text-xs text-white"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="rendered">Rendered</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cardsQuery.data?.map((card) => (
              <div key={card.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                <div className="space-y-1">
                  <div className="text-sm text-white">{card.cardType}</div>
                  <div>{card.id}</div>
                  <div>{cardDisplayName(card)}</div>
                </div>
                {card.renderKey ? (
                  <img
                    src={assetUrlForKey(card.renderKey)}
                    alt="Rendered card"
                    className="mt-3 w-full rounded-xl"
                  />
                ) : (
                  <div className="mt-3 flex aspect-[825/1125] items-center justify-center rounded-xl border border-dashed border-white/10 text-[11px] text-slate-500">
                    No render
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.status === 'submitted' ? (
                    <button
                      type="button"
                      onClick={() => renderMutation.mutate(card.id)}
                      className="rounded-full border border-emerald-500/40 px-3 py-1 text-[11px] text-emerald-300"
                    >
                      Mark Rendered
                    </button>
                  ) : null}
                  {card.status === 'draft' ? (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(card.id)}
                      className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300"
                    >
                      Delete Draft
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
