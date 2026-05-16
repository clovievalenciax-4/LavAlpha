'use client'

import Link from 'next/link'

interface CallerBadgeProps {
  caller: {
    id: string
    username: string
    name?: string | null
    avatarUrl?: string | null
    score: number
    totalCalls?: number
    correctCalls?: number
    alphaCalls?: any[]
  }
  compact?: boolean
}

export default function CallerBadge({ caller, compact }: CallerBadgeProps) {
  const getScoreStyle = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', ring: 'ring-emerald-500/25', bar: 'bg-emerald-500' }
    if (score >= 60) return { text: 'text-cyan-400', ring: 'ring-cyan-500/25', bar: 'bg-cyan-500' }
    if (score >= 40) return { text: 'text-amber-400', ring: 'ring-amber-500/25', bar: 'bg-amber-500' }
    return { text: 'text-red-400', ring: 'ring-red-500/25', bar: 'bg-red-500' }
  }
  const s = getScoreStyle(caller.score)

  if (compact) {
    return (
      <Link href={`/callers/${caller.id}`} className="flex items-center gap-3 group/link">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-[11px] text-white font-bold shadow-md shadow-cyan-500/15">
          {caller.username[0].toUpperCase()}
        </div>
        <span className="text-[13px] font-medium text-zinc-400 group-hover/link:text-white transition-colors">@{caller.username}</span>
      </Link>
    )
  }

  const recentCalls = caller.alphaCalls?.slice(0, 3) || []
  const winRate = caller.totalCalls && caller.totalCalls > 0 ? Math.round(((caller.correctCalls || 0) / caller.totalCalls) * 100) : 0

  return (
    <Link href={`/callers/${caller.id}`} className="card block p-5 transition-all duration-300 group">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-lg text-white font-bold shadow-lg shadow-cyan-500/15">
          {caller.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{caller.name || `@${caller.username}`}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">@{caller.username}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${s.text}`}>{caller.score.toFixed(0)}</p>
          <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] font-semibold mt-1">Score</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-600">Win Rate</span>
            <span className="text-[10px] text-zinc-500 font-mono">{winRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className={`h-full rounded-full ${s.bar} bar-animate`} style={{ width: `${winRate}%` }} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold text-zinc-300">{caller.totalCalls || 0}</p>
          <p className="text-[9px] text-zinc-600">calls</p>
        </div>
      </div>

      {/* Recent tokens */}
      {recentCalls.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-zinc-700 uppercase tracking-wider">Recent:</span>
          {recentCalls.map((c: any) => c.tokenName && (
            <span key={c.id} className="text-[10px] font-mono font-bold text-cyan-400/70">${c.tokenName}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
