'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AlphaCallCard from '@/components/AlphaCallCard'
import Link from 'next/link'

export default function CallerDetailPage() {
  const params = useParams()
  const [caller, setCaller] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/callers/${params.id}`).then(r => r.json()).then(setCaller).finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="space-y-6"><div className="h-48 card shimmer" /><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-56 card shimmer" />)}</div></div>
  if (!caller) return <p className="text-zinc-500">Caller not found</p>

  const getScoreColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-cyan-400' : s >= 40 ? 'text-amber-400' : 'text-red-400'
  const winRate = caller.totalCalls > 0 ? Math.round((caller.correctCalls / caller.totalCalls) * 100) : 0
  const calls = caller.alphaCalls || []
  const tokens = [...new Set(calls.map((c: any) => c.tokenName).filter(Boolean))] as string[]
  const chains = [...new Set(calls.map((c: any) => c.chain).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">
      <Link href="/callers" className="inline-flex items-center gap-2 text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors font-medium">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        Back to Callers
      </Link>

      {/* Profile */}
      <div className="card p-7">
        <div className="flex items-center gap-6">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-[28px] text-white font-black shadow-xl shadow-cyan-500/15">
            {caller.username[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{caller.name || `@${caller.username}`}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">@{caller.username}</p>
            {caller.bio && <p className="text-sm text-zinc-400 mt-2">{caller.bio}</p>}
            {/* Token tags */}
            {tokens.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[9px] text-zinc-700 uppercase tracking-wider">Tokens:</span>
                {tokens.slice(0, 8).map(t => (
                  <span key={t} className="text-[10px] font-mono font-bold text-cyan-400/70 px-2 py-0.5 rounded-md bg-cyan-500/[0.06]">${t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className={`text-[48px] font-black leading-none ${getScoreColor(caller.score)}`}>{caller.score.toFixed(0)}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-semibold mt-2">Credibility</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-10 mt-7 pt-6 border-t border-white/[0.04]">
          {[{ val: calls.length, label: 'Total Calls' }, { val: caller.correctCalls || 0, label: 'Correct' }, { val: `${winRate}%`, label: 'Win Rate' }, { val: chains.length, label: 'Chains' }, { val: tokens.length, label: 'Tokens' }].map(s => (
            <div key={s.label}>
              <p className="text-xl font-bold text-white">{s.val}</p>
              <p className="text-[11px] text-zinc-600 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calls */}
      <div>
        <h2 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-wider mb-5">All Alpha Calls ({calls.length})</h2>
        {calls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calls.map((call: any) => <AlphaCallCard key={call.id} call={call} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-600"><p className="text-4xl mb-3">📭</p><p>No alpha calls yet</p></div>
        )}
      </div>
    </div>
  )
}
