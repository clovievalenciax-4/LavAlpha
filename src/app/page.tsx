'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()).catch(() => null),
      fetch('/api/projects').then(r => r.json()).catch(() => ({ projects: [] })),
      fetch('/api/alpha-calls?limit=8').then(r => r.json()).catch(() => ({ calls: [] })),
    ]).then(([statsData, projData, callsData]) => {
      setStats(statsData)
      setProjects(projData.projects || [])
      setCalls(callsData.calls || [])
      setLoading(false)
    })
  }, [])

  const stageColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'testnet': return 'text-sky-400 bg-sky-500/10 border-sky-500/20'
      case 'mainnet': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'building': return 'text-teal-400 bg-teal-500/10 border-teal-500/20'
      case 'launch': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'stealth': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
    }
  }

  const categoryColor: Record<string, string> = {
    AI: 'text-fuchsia-400 bg-fuchsia-500/10',
    DeFi: 'text-emerald-400 bg-emerald-500/10',
    NFT: 'text-amber-400 bg-amber-500/10',
    Gaming: 'text-red-400 bg-red-500/10',
    Infrastructure: 'text-blue-400 bg-blue-500/10',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-[100px] card shimmer" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-[200px] card shimmer" />)}
        </div>
      </div>
    )
  }

  const freshProjects = projects.filter(p => p.source === 'fresh')
  const kolProjects = projects.filter(p => p.source === 'kol')
  const topProjects = [...projects].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Alpha Dashboard</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Early crypto projects · Smart follower signals · Real-time tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-cyan card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Fresh Projects</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{freshProjects.length}</p>
          <p className="text-[11px] text-zinc-600 mt-1">New from X search</p>
        </div>
        <div className="stat-emerald card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">KOL Signals</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{kolProjects.length}</p>
          <p className="text-[11px] text-zinc-600 mt-1">From KOL tweets</p>
        </div>
        <div className="stat-amber card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">With Smart Followers</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{freshProjects.filter(p => p.smartFollowerCount > 0).length}</p>
          <p className="text-[11px] text-zinc-600 mt-1">KOL backed projects</p>
        </div>
        <div className="stat-rose card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Token Calls</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{calls.length}</p>
          <p className="text-[11px] text-zinc-600 mt-1">From DEXScreener</p>
        </div>
      </div>

      {/* Main Content - Alpha Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left: Top Alpha Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">🔥 Top Alpha Projects</h2>
            <Link href="/projects" className="text-[12px] text-cyan-400 hover:text-cyan-300 transition-colors">
              View all →
            </Link>
          </div>

          {topProjects.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-zinc-500">No projects yet. Run the scraper to discover fresh projects.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topProjects.map(proj => (
                <Link key={proj.id || proj.username} href="/projects"
                  className="card p-4 hover:border-cyan-500/20 transition-all group">
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                        {(proj.name || proj.username || '?')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-[14px] font-bold text-white">{proj.name || proj.username}</h3>
                          {proj.source === 'fresh' && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">FRESH</span>
                          )}
                        </div>
                        {proj.username && <p className="text-[11px] text-zinc-500">@{proj.username}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[14px] font-bold text-cyan-400">{Math.round(proj.score || 0)}</span>
                    </div>
                  </div>

                  <p className="text-[12px] text-zinc-400 leading-relaxed mb-2 line-clamp-2">
                    {proj.bio || proj.description || ''}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {proj.category && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${categoryColor[proj.category] || 'text-zinc-400 bg-zinc-500/10'}`}>
                        {proj.category}
                      </span>
                    )}
                    {proj.stage && proj.stage !== 'unknown' && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${stageColor(proj.stage)}`}>
                        {proj.stage}
                      </span>
                    )}
                    {proj.followers !== undefined && (
                      <span className="text-[9px] text-zinc-500">
                        {proj.followers.toLocaleString()} followers
                      </span>
                    )}
                  </div>

                  {/* Smart Followers */}
                  {proj.smartFollowers && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-amber-400 font-bold">⭐</span>
                      {(typeof proj.smartFollowers === 'string' ? proj.smartFollowers.split(',') : proj.smartFollowers).slice(0, 3).map((sf: string) => (
                        <span key={sf} className="text-[9px] text-amber-400/70">
                          @{sf.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Latest KOL Signals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">🎯 KOL Signals</h2>
            <Link href="/alpha-calls" className="text-[12px] text-cyan-400 hover:text-cyan-300 transition-colors">
              View all →
            </Link>
          </div>

          <div className="space-y-2">
            {calls.slice(0, 8).map(call => {
              const tags = call.tags ? call.tags.split(',') : []
              const pctMatch = call.content?.match(/\+?(-?[\d.]+)%/)
              const pct = pctMatch ? parseFloat(pctMatch[1]) : null
              
              return (
                <Link key={call.id} href="/alpha-calls"
                  className="card p-3 hover:border-cyan-500/10 transition-all flex items-center gap-3">
                  
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                    {(call.tokenName || '?')[0]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-white">${call.tokenName}</span>
                      {call.chain && (
                        <span className="text-[9px] text-zinc-500">{call.chain}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">
                      @{call.caller?.username || 'unknown'}
                    </p>
                  </div>

                  {pct !== null && (
                    <span className={`text-[12px] font-bold font-mono ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/projects" className="card p-4 hover:border-cyan-500/20 transition-all text-center">
          <p className="text-2xl mb-1">🔍</p>
          <p className="text-[13px] font-medium text-white">Discover Projects</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Find fresh alpha</p>
        </Link>
        <Link href="/discover/tokens" className="card p-4 hover:border-cyan-500/20 transition-all text-center">
          <p className="text-2xl mb-1">📊</p>
          <p className="text-[13px] font-medium text-white">Token Scanner</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">DEXScreener + scam check</p>
        </Link>
        <Link href="/discover/nfts" className="card p-4 hover:border-cyan-500/20 transition-all text-center">
          <p className="text-2xl mb-1">🖼️</p>
          <p className="text-[13px] font-medium text-white">NFT Intel</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Magic Eden + OpenSea</p>
        </Link>
        <Link href="/callers" className="card p-4 hover:border-cyan-500/20 transition-all text-center">
          <p className="text-2xl mb-1">👤</p>
          <p className="text-[13px] font-medium text-white">KOL Rankings</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Track alpha callers</p>
        </Link>
      </div>
    </div>
  )
}
