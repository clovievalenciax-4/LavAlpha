'use client'

import { useEffect, useState } from 'react'

interface NFTProject {
  name: string
  x_handle: string | null
  x_url: string | null
  chain: string
  x_followers: number | null
  kol_followers: string[]
  kol_count: number
  smart_money_following: boolean
  floor_price: number | null
  floor_currency: string | null
  total_supply: number | null
  has_website: boolean
  has_discord: boolean
  has_twitter: boolean
  social_score: number
  scam_score: number
  early_score: number
  image: string | null
  description: string | null
  website: string | null
  discord: string | null
  url: string | null
  source: string
}

export default function NFTIntelPage() {
  const [projects, setProjects] = useState<NFTProject[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState('')
  const [analyzeResult, setAnalyzeResult] = useState<NFTProject | null>(null)
  const [handleInput, setHandleInput] = useState('')

  useEffect(() => {
    fetch('/api/nft-intel/discover?limit=20')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .finally(() => setLoading(false))
  }, [])

  const handleAnalyze = async () => {
    if (!handleInput.trim()) return
    setAnalyzing(handleInput)
    setAnalyzeResult(null)
    try {
      const resp = await fetch(`/api/nft-intel/analyze/${handleInput.replace('@', '')}`)
      const data = await resp.json()
      setAnalyzeResult(data)
    } finally {
      setAnalyzing('')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400'
    if (score >= 40) return 'text-cyan-400'
    return 'text-amber-400'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-white tracking-tight">NFT Intel</h1>
        <p className="text-sm text-zinc-500 mt-1">NFT project discovery with X social analysis + KOL tracking</p>
      </div>

      {/* Analyze by handle */}
      <div className="card p-5">
        <h2 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-wider mb-4">Analyze Project</h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
            <input type="text" placeholder="NFT project X handle" value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#0a0e14] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30 transition-all"
            />
          </div>
          <button onClick={handleAnalyze} disabled={!!analyzing}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/15 disabled:opacity-50">
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Analyze result */}
        {analyzeResult && (
          <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white font-bold">
                {(analyzeResult.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-bold text-white">{analyzeResult.name}</p>
                {analyzeResult.x_handle && (
                  <a href={analyzeResult.x_url || '#'} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] text-cyan-400 hover:text-cyan-300">@{analyzeResult.x_handle}</a>
                )}
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="text-center">
                  <p className={`text-xl font-black ${getScoreColor(analyzeResult.social_score)}`}>{analyzeResult.social_score.toFixed(0)}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Social</p>
                </div>
                <div className="text-center">
                  <p className={`text-xl font-black ${getScoreColor(100 - analyzeResult.scam_score)}`}>{(100 - analyzeResult.scam_score).toFixed(0)}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Trust</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              {analyzeResult.has_twitter && <span className="text-emerald-400">✓ Twitter</span>}
              {analyzeResult.has_discord && <span className="text-emerald-400">✓ Discord</span>}
              {analyzeResult.has_website && <span className="text-emerald-400">✓ Website</span>}
              {analyzeResult.kol_count > 0 && <span className="text-cyan-400">✓ {analyzeResult.kol_count} KOL following</span>}
            </div>
          </div>
        )}
      </div>

      {/* Discovered projects */}
      <div>
        <h2 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-wider mb-5">Discovered Projects</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-[200px] card shimmer" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-5 text-4xl">🖼️</div>
            <p className="text-zinc-400 font-semibold text-lg">No NFT projects discovered yet</p>
            <p className="text-sm text-zinc-600 mt-2">Projects will appear as KOLs mention them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => (
              <div key={`${p.x_handle}-${i}`} className="card p-5 transition-all duration-300 group">
                <div className="flex items-start gap-3 mb-3">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white font-bold">
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-white">{p.name}</p>
                    {p.x_handle && (
                      <a href={p.x_url || "#"} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-cyan-400 hover:text-cyan-300">@{p.x_handle}</a>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${getScoreColor(p.social_score)}`}>{p.social_score.toFixed(0)}</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Score</p>
                  </div>
                </div>

                {p.description && (
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mb-3">{p.description}</p>
                )}

                {/* KOL following */}
                {p.kol_count > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">KOL Following ({p.kol_count})</p>
                    <div className="flex flex-wrap gap-1">
                      {p.kol_followers.slice(0, 5).map(kol => (
                        <span key={kol} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                          @{kol}
                        </span>
                      ))}
                      {p.kol_followers.length > 5 && (
                        <span className="text-[10px] text-zinc-600">+{p.kol_followers.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Market data */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {p.floor_price !== null && (
                    <div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Floor</p>
                      <p className="text-[12px] font-bold text-white">{p.floor_price.toFixed(2)} {p.floor_currency}</p>
                    </div>
                  )}
                  {p.total_supply && (
                    <div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Supply</p>
                      <p className="text-[12px] font-bold text-white">{p.total_supply.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Signals */}
                <div className="flex items-center gap-2 flex-wrap">
                  {p.has_twitter && <span className="text-[9px] text-emerald-400">𝕏</span>}
                  {p.has_discord && <span className="text-[9px] text-emerald-400">Discord</span>}
                  {p.has_website && <span className="text-[9px] text-emerald-400">Web</span>}
                  {p.smart_money_following && <span className="text-[9px] text-amber-400">🐋 Smart $</span>}
                  {p.kol_count >= 3 && <span className="text-[9px] text-cyan-400">🔥 Hot</span>}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${p.chain === 'solana' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {p.chain}
                  </span>
                </div>

                {p.url && (
                  <a href={p.url || '#'} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors font-medium mt-3">
                    View Collection →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
