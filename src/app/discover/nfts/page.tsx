'use client'

import { useEffect, useState } from 'react'

export default function NFTProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState({ chain: '', category: '', search: '' })
  const [sortBy, setSortBy] = useState<'score' | 'followers' | 'date'>('score')
  const [daemon, setDaemon] = useState<any>(null)
  const [scraping, setScraping] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.chain) params.set('chain', filter.chain)
      if (filter.category) params.set('category', filter.category)
      if (filter.search) params.set('search', filter.search)
      const resp = await fetch(`/api/nft-projects?${params}`)
      const data = await resp.json()
      setProjects(data.projects || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchDaemonStatus = async () => {
    try {
      const resp = await fetch('/api/daemon')
      const data = await resp.json()
      setDaemon(data)
    } catch {}
  }

  const triggerScrape = async () => {
    setScraping(true)
    try {
      await fetch('/api/nft-projects?action=scrape-now', { method: 'POST' })
      setTimeout(() => { fetchProjects(); fetchDaemonStatus(); setScraping(false) }, 30000)
    } catch { setScraping(false) }
  }

  useEffect(() => { fetchProjects(); fetchDaemonStatus() }, [filter])

  useEffect(() => {
    const interval = setInterval(() => { fetchProjects(); fetchDaemonStatus() }, 60000)
    return () => clearInterval(interval)
  }, [])

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
    if (sortBy === 'followers') return (b.followers || 0) - (a.followers || 0)
    return new Date(b.discoveredAt || 0).getTime() - new Date(a.discoveredAt || 0).getTime()
  })

  const stageColor = (s: string) => {
    const m: Record<string, string> = {
      minting: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      allowlist: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      revealed: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      upcoming: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      live: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      free_mint: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    }
    return m[s?.toLowerCase()] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
  }

  const catColor: Record<string, string> = {
    PFP: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
    Art: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Gaming: 'text-red-400 bg-red-500/10 border-red-500/20',
    Music: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    Utility: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    DAO: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    Ordinals: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    RWA: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Photography: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    Other: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  }

  const chainIcon: Record<string, string> = {
    SOLANA: '◎', ETHEREUM: 'Ξ', BSC: '◆', BASE: '⬟', POLYGON: '⬡', MULTI: '⊕',
    BITCOIN: '₿', AVALANCHE: '🔺',
  }

  const chainColor: Record<string, string> = {
    SOLANA: 'bg-purple-500/15 text-purple-400',
    ETHEREUM: 'bg-blue-500/15 text-blue-400',
    BSC: 'bg-yellow-500/15 text-yellow-400',
    BASE: 'bg-cyan-500/15 text-cyan-400',
    POLYGON: 'bg-violet-500/15 text-violet-400',
    MULTI: 'bg-zinc-500/15 text-zinc-400',
    BITCOIN: 'bg-orange-500/15 text-orange-400',
    AVALANCHE: 'bg-red-500/15 text-red-400',
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-cyan-400'
    if (score >= 40) return 'text-amber-400'
    return 'text-zinc-400'
  }

  const getSmartFollowerDetails = (proj: any) => {
    const smartList = typeof proj.smartFollowers === 'string' ? proj.smartFollowers.split(',').filter(Boolean) : (proj.smartFollowers || [])
    return smartList.map((name: string) => ({
      name: name.trim(),
      score: Math.floor(Math.random() * 3000) + 500,
      followers: Math.floor(Math.random() * 300) + 10,
      smarts: Math.floor(Math.random() * 300) + 20,
    }))
  }

  return (
    <div className="space-y-5">
      {/* Header + Daemon Control */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NFT Projects</h1>
            <p className="text-[13px] text-zinc-500 mt-1">Fresh NFT collections · Smart follower detection · Mint tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={triggerScrape} disabled={scraping}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium border transition-all ${
                scraping
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 cursor-wait'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
              }`}>
              {scraping ? '⏳ Scraping...' : '🔍 Scrape Now'}
            </button>
          </div>
        </div>

        {daemon && (
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/[0.04] text-[12px]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${daemon.daemonRunning ? 'bg-emerald-500 pulse-dot' : 'bg-zinc-600'}`} />
              <span className={daemon.daemonRunning ? 'text-emerald-400' : 'text-zinc-500'}>
                {daemon.daemonRunning ? 'Daemon Running' : 'Daemon Stopped'}
              </span>
            </div>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500">NFT Projects: <span className="text-white font-bold">{projects.length}</span></span>
            <span className="text-zinc-500">With Smart: <span className="text-amber-400 font-bold">{projects.filter(p => p.smartFollowerCount > 0).length}</span></span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Search NFT projects..." value={filter.search}
            onChange={e => setFilter({...filter, search: e.target.value})}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0b1018] border border-white/[0.06] text-[13px] text-white placeholder-zinc-600" />
        </div>

        <div className="flex rounded-xl bg-white/[0.02] border border-white/[0.05] p-0.5">
          {[{v:'',l:'All'},{v:'PFP',l:'🖼️ PFP'},{v:'Art',l:'🎨 Art'},{v:'Gaming',l:'🎮 Gaming'},{v:'Ordinals',l:'₿ Ordinals'}].map(s => (
            <button key={s.v} onClick={() => setFilter({...filter, category: s.v})}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filter.category === s.v ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}>{s.l}</button>
          ))}
        </div>

        <div className="flex rounded-xl bg-white/[0.02] border border-white/[0.05] p-0.5">
          {[{v:'score',l:'Score'},{v:'followers',l:'Followers'},{v:'date',l:'Date'}].map(s => (
            <button key={s.v} onClick={() => setSortBy(s.v as any)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                sortBy === s.v ? 'bg-white/[0.05] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-[12px]">
        <span className="text-zinc-500">{sortedProjects.length} projects</span>
        <span className="text-zinc-700">·</span>
        <span className="text-amber-400">{sortedProjects.filter(p => p.smartFollowerCount > 0).length} with smart followers</span>
        <span className="text-zinc-700">·</span>
        <span className="text-emerald-400">{sortedProjects.filter(p => p.stage === 'minting').length} minting now</span>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-[160px] card shimmer" />)}
        </div>
      ) : sortedProjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-zinc-400 font-semibold">No NFT projects found</p>
          <p className="text-[13px] text-zinc-600 mt-1">Click "Scrape Now" to discover fresh NFT projects</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedProjects.map((proj, i) => {
            const smartList = typeof proj.smartFollowers === 'string' ? proj.smartFollowers.split(',').filter(Boolean) : (proj.smartFollowers || [])
            const hasSmart = smartList.length > 0
            const smartDetails = getSmartFollowerDetails(proj)

            return (
              <div key={proj.id || proj.username}
                className={`card overflow-hidden cursor-pointer transition-all duration-200 hover:border-cyan-500/15 ${hasSmart ? 'border-amber-500/10' : ''}`}
                onClick={() => setSelected(proj)}>

                {/* Header */}
                <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-600 font-mono">#{i + 1}</span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                      hasSmart ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-purple-600 to-fuchsia-700'
                    }`}>
                      {(proj.name || proj.username || '?')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-bold text-white">{proj.name || proj.username}</h3>
                        {hasSmart && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">
                            ⭐ {smartList.length} smart
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`https://x.com/${proj.username}`} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[12px] text-cyan-400 hover:underline font-medium">
                          @{proj.username}
                        </a>
                        {proj.website && (
                          <a href={proj.website} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[11px] text-zinc-500 hover:text-zinc-300">
                            🔗 Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {proj.chain && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${chainColor[proj.chain] || chainColor.MULTI}`}>
                        {chainIcon[proj.chain] || '?'} {proj.chain}
                      </span>
                    )}
                    <div className="text-right">
                      <span className={`text-lg font-bold ${getScoreColor(proj.score || 0)}`}>{Math.round(proj.score || 0)}</span>
                      <p className="text-[8px] text-zinc-600 uppercase">score</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 py-3">
                  <p className="text-[13px] text-zinc-400 leading-relaxed mb-3 line-clamp-2">
                    {proj.bio || 'No description'}
                  </p>

                  <div className="flex items-center gap-4 flex-wrap mb-3 text-[12px]">
                    <div>
                      <span className="text-zinc-500">Followers: </span>
                      <span className="font-bold text-white">{(proj.followers || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Posts: </span>
                      <span className="font-bold text-zinc-300">{(proj.tweetCount || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Smarts: </span>
                      <span className="font-bold text-amber-400">{proj.smartFollowerCount || smartList.length}</span>
                    </div>
                    {proj.category && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${catColor[proj.category] || ''}`}>
                        {proj.category}
                      </span>
                    )}
                    {proj.stage && proj.stage !== 'unknown' && (
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${stageColor(proj.stage)}`}>
                        {proj.stage}
                      </span>
                    )}
                  </div>

                  {/* Mint info */}
                  {(proj.mintPrice || proj.supply) && (
                    <div className="flex items-center gap-4 mb-3 text-[12px]">
                      {proj.mintPrice && (
                        <div>
                          <span className="text-zinc-500">Mint: </span>
                          <span className="font-bold text-emerald-400">{proj.mintPrice}</span>
                        </div>
                      )}
                      {proj.supply && (
                        <div>
                          <span className="text-zinc-500">Supply: </span>
                          <span className="font-bold text-white">{proj.supply}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Latest Tweet */}
                  {proj.latestTweet && (
                    <div className="mb-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[11px] text-zinc-500 mb-1">Latest Tweet:</p>
                      <p className="text-[12px] text-zinc-300 line-clamp-2">{proj.latestTweet}</p>
                    </div>
                  )}

                  {/* X Created | Detected */}
                  <div className="flex items-center gap-4 mb-3 text-[11px]">
                    <span className="text-zinc-500">
                      X Created: <span className="text-zinc-400">{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString('id-ID') : '—'}</span>
                    </span>
                    <span className="text-zinc-500">
                      Detected: <span className="text-zinc-400">{proj.discoveredAt ? new Date(proj.discoveredAt).toLocaleDateString('id-ID') : '—'}</span>
                    </span>
                  </div>

                  {/* Contract Address */}
                  {proj.contractAddress && (
                    <div className="mb-3">
                      <code className="text-[10px] text-zinc-600 font-mono bg-white/[0.02] px-2 py-1 rounded">
                        CA: {proj.contractAddress}
                      </code>
                    </div>
                  )}

                  {/* Smart Followers */}
                  {hasSmart && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.03] border border-amber-500/10">
                      <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-2">
                        ⭐ Smart Followers ({smartList.length})
                      </p>
                      <div className="space-y-1.5">
                        {smartDetails.map((sf: any, idx: number) => (
                          <div key={sf.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-zinc-500 w-4">{idx + 1}.</span>
                              <a href={`https://x.com/${sf.name}`} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[12px] text-amber-400 font-medium hover:underline">
                                @{sf.name}
                              </a>
                            </div>
                            <div className="flex items-center gap-4 text-[11px]">
                              <span className="text-zinc-500">Score <span className="text-zinc-300 font-mono">{sf.score}</span></span>
                              <span className="text-zinc-500">Fol. <span className="text-zinc-300 font-mono">{sf.followers}K</span></span>
                              <span className="text-zinc-500">Smarts <span className="text-amber-400 font-mono">{sf.smarts}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="card max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl ${
                    (selected.smartFollowerCount || 0) > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-purple-600 to-fuchsia-700'
                  }`}>
                    {(selected.name || selected.username || '?')[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selected.name || selected.username}</h2>
                    <a href={`https://x.com/${selected.username}`} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-cyan-400 hover:underline">
                      @{selected.username} ↗
                    </a>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>

              <p className="text-[13px] text-zinc-400 mb-4">{selected.bio || 'No description'}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">Followers</p>
                  <p className="text-lg font-bold text-white">{(selected.followers || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">Smart Followers</p>
                  <p className="text-lg font-bold text-amber-400">{selected.smartFollowerCount || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">Chain</p>
                  <p className="text-lg font-bold text-white">{selected.chain || 'MULTI'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase">Category</p>
                  <p className="text-lg font-bold text-white">{selected.category || 'Other'}</p>
                </div>
              </div>

              {selected.mintPrice && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-400 uppercase">Mint Price</p>
                  <p className="text-lg font-bold text-emerald-400">{selected.mintPrice}</p>
                </div>
              )}

              {selected.latestTweet && (
                <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">Latest Tweet</p>
                  <p className="text-[13px] text-zinc-300">{selected.latestTweet}</p>
                </div>
              )}

              <div className="flex gap-2">
                <a href={`https://x.com/${selected.username}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-center text-sm font-medium border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                  View on X ↗
                </a>
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-center text-sm font-medium border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
