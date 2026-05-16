'use client'

import { useEffect, useState } from 'react'
import CallerBadge from '@/components/CallerBadge'

export default function CallersPage() {
  const [callers, setCallers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/callers').then(r => r.json()).then(setCallers).finally(() => setLoading(false))
  }, [])

  const avgScore = callers.length > 0 ? Math.round(callers.reduce((a, c) => a + c.score, 0) / callers.length) : 0
  const totalCalls = callers.reduce((a, c) => a + (c.totalCalls || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-white tracking-tight">Callers</h1>
        <p className="text-sm text-zinc-500 mt-1">Alpha callers ranked by credibility score</p>
      </div>

      {/* Summary */}
      {!loading && callers.length > 0 && (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-600">Callers:</span>
            <span className="text-[12px] font-bold text-zinc-300">{callers.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-600">Avg Score:</span>
            <span className="text-[12px] font-bold text-cyan-400">{avgScore}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-600">Total Calls:</span>
            <span className="text-[12px] font-bold text-zinc-300">{totalCalls}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-[130px] card shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {callers.map((caller) => <CallerBadge key={caller.id} caller={caller} />)}
        </div>
      )}
    </div>
  )
}
