'use client'

import { useEffect, useState } from 'react'

export default function TargetsPage() {
  const [targets, setTargets] = useState<any[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchTargets = () => {
    fetch('/api/scrape-targets').then(r => r.json()).then(setTargets).finally(() => setLoading(false))
  }

  useEffect(() => { fetchTargets() }, [])

  const addTarget = async () => {
    if (!newUsername.trim()) return
    await fetch('/api/scrape-targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newUsername }) })
    setNewUsername('')
    fetchTargets()
  }

  const activeCount = targets.filter(t => t.isActive).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-white tracking-tight">Scrape Targets</h1>
        <p className="text-sm text-zinc-500 mt-1">X accounts to monitor for alpha calls</p>
      </div>

      {/* Summary */}
      {!loading && targets.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-zinc-600">{targets.length} targets</span>
          <span className="text-[11px] text-zinc-700">·</span>
          <span className="text-[11px] text-emerald-400">{activeCount} active</span>
          <span className="text-[11px] text-zinc-700">·</span>
          <span className="text-[11px] text-zinc-600">{targets.length - activeCount} paused</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-medium">@</span>
          <input type="text" placeholder="username" value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTarget()}
            className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#0a0e14] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30 transition-all"
          />
        </div>
        <button onClick={addTarget}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25">
          Add Target
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-[80px] card shimmer" />)}</div>
      ) : targets.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-5 text-4xl">🎯</div>
          <p className="text-zinc-400 font-semibold text-lg">No scrape targets yet</p>
          <p className="text-sm text-zinc-600 mt-2">Add X usernames to start tracking alpha</p>
        </div>
      ) : (
        <div className="space-y-3">
          {targets.map((target) => (
            <div key={target.id} className="card flex items-center justify-between p-5 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-500/15">
                  {target.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">@{target.username}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {target.lastScrapedAt ? `Last scraped: ${new Date(target.lastScrapedAt).toLocaleString('id-ID')}` : 'Never scraped'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold px-3.5 py-1.5 rounded-full ${target.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                  {target.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
