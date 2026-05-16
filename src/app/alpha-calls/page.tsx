'use client'

import { useEffect, useState } from 'react'

export default function AlphaCallsPage() {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ chain: '', sentiment: '', search: '' })
  const [selected, setSelected] = useState<any>(null)
  const [security, setSecurity] = useState<any>(null)
  const [secLoading, setSecLoading] = useState(false)

  const fetchCalls = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filter.chain) p.set('chain', filter.chain)
    if (filter.sentiment) p.set('sentiment', filter.sentiment)
    if (filter.search) p.set('search', filter.search)
    fetch(`/api/alpha-calls?${p}`).then(r => r.json()).then(d => setCalls(d.calls || [])).finally(() => setLoading(false))
  }

  useEffect(() => { fetchCalls() }, [filter])

  const openDetail = async (call: any) => {
    setSelected(call)
    setSecurity(null)
    if (call.contractAddress && call.chain) {
      setSecLoading(true)
      try {
        const r = await fetch(`/api/security/check?chain=${call.chain.toLowerCase()}&address=${call.contractAddress}`)
        setSecurity(await r.json())
      } catch {}
      setSecLoading(false)
    }
  }

  const fmt = (n: number | null) => {
    if (!n) return '—'
    if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`
    return `$${n.toFixed(0)}`
  }

  const pctColor = (v: number | null) => {
    if (!v) return 'text-zinc-500'
    return v >= 0 ? 'text-emerald-400' : 'text-red-400'
  }

  const scamColor = (s: number) => {
    if (s <= 15) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (s <= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  const chainIcon: Record<string, string> = {
    SOLANA: '◎', ETHEREUM: 'Ξ', BSC: '◆', BASE: '⬟', ARBITRUM: '◈', AVALANCHE: '▲',
  }

  const chainColor: Record<string, string> = {
    SOLANA: 'text-purple-400 bg-purple-500/10',
    ETHEREUM: 'text-blue-400 bg-blue-500/10',
    BSC: 'text-yellow-400 bg-yellow-500/10',
    BASE: 'text-cyan-400 bg-cyan-500/10',
    ARBITRUM: 'text-sky-400 bg-sky-500/10',
    AVALANCHE: 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alpha Calls</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Real-time token signals · Auto-sync every 5 min</p>
        </div>
        <button onClick={fetchCalls} className="px-4 py-2 rounded-xl bg-cyan-500/8 text-cyan-400 text-[13px] font-medium border border-cyan-500/15 hover:bg-cyan-500/15 transition-all self-start sm:self-auto">
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Search token, chain..." value={filter.search}
            onChange={e => setFilter({...filter, search: e.target.value})}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b1018] border border-white/[0.06] text-[13px] text-white placeholder-zinc-600" />
        </div>
        {['','SOLANA','ETHEREUM','BSC','BASE'].map(ch => (
          <button key={ch} onClick={() => setFilter({...filter, chain: ch})}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-medium border transition-all ${
              filter.chain === ch
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : 'bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300'
            }`}>
            {ch || 'All'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {calls.length > 0 && (
        <div className="flex items-center gap-6 text-[12px]">
          <span className="text-zinc-500">{calls.length} tokens</span>
          <span className="text-zinc-700">·</span>
          <span className="text-emerald-400">{calls.filter(c => c.sentiment === 'bullish').length} bullish</span>
          <span className="text-zinc-700">·</span>
          <span className="text-red-400">{calls.filter(c => c.sentiment === 'bearish').length} bearish</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">{[...new Set(calls.map(c => c.chain))].length} chains</span>
        </div>
      )}

      {/* Token Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-14 card shimmer" />)}
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-zinc-400 font-medium">No tokens found</p>
          <p className="text-[13px] text-zinc-600 mt-1">Data auto-syncs every 5 minutes</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-white/[0.04]">
            <div className="col-span-3">Token</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">MCap</div>
            <div className="col-span-1 text-right">Liq</div>
            <div className="col-span-1 text-right">Vol 24h</div>
            <div className="col-span-1 text-right">24h %</div>
            <div className="col-span-1 text-center">Sentiment</div>
            <div className="col-span-1 text-center">Chain</div>
          </div>

          {/* Table rows */}
          {calls.map((call, i) => {
            const tags = call.tags ? call.tags.split(',') : []
            const isPump = tags.includes('new')
            const isMicro = tags.includes('micro-cap')
            
            return (
              <div key={call.id}
                className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors border-b border-white/[0.02] last:border-0 items-center"
                onClick={() => openDetail(call)}>
                
                {/* Token */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0">
                    {(call.tokenName || '?')[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-white truncate">${call.tokenName}</span>
                      {isPump && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold">NEW</span>}
                      {isMicro && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">MICRO</span>}
                    </div>
                    {call.contractAddress && (
                      <p className="text-[10px] text-zinc-600 font-mono truncate">{call.contractAddress.slice(0, 8)}...{call.contractAddress.slice(-6)}</p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-2 text-right">
                  <span className="text-[13px] font-mono text-zinc-300">
                    {call.content?.match(/Price: \$?([\d,.]+)/)?.[1] || '—'}
                  </span>
                </div>

                {/* MCap */}
                <div className="col-span-2 text-right">
                  <span className="text-[13px] font-mono text-zinc-300">
                    {call.content?.match(/MCap: \$?([\d,.]+[KMB]?)/)?.[1] || '—'}
                  </span>
                </div>

                {/* Liquidity */}
                <div className="col-span-1 text-right">
                  <span className="text-[12px] font-mono text-zinc-400">
                    {call.content?.match(/Liq: \$?([\d,.]+[KMB]?)/)?.[1] || '—'}
                  </span>
                </div>

                {/* Volume */}
                <div className="col-span-1 text-right">
                  <span className="text-[12px] font-mono text-zinc-400">
                    {call.content?.match(/Vol24h: \$?([\d,.]+[KMB]?)/)?.[1] || '—'}
                  </span>
                </div>

                {/* 24h % */}
                <div className="col-span-1 text-right">
                  {(() => {
                    const match = call.content?.match(/\+?(-?[\d.]+)%/)
                    const val = match ? parseFloat(match[1]) : null
                    return val !== null ? (
                      <span className={`text-[13px] font-bold font-mono ${pctColor(val)}`}>
                        {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                      </span>
                    ) : <span className="text-[12px] text-zinc-600">—</span>
                  })()}
                </div>

                {/* Sentiment */}
                <div className="col-span-1 text-center">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    call.sentiment === 'bullish' ? 'text-emerald-400 bg-emerald-500/10' :
                    call.sentiment === 'bearish' ? 'text-red-400 bg-red-500/10' :
                    'text-zinc-500 bg-zinc-500/10'
                  }`}>
                    {call.sentiment === 'bullish' ? '▲' : call.sentiment === 'bearish' ? '▼' : '—'}
                  </span>
                </div>

                {/* Chain */}
                <div className="col-span-1 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold ${chainColor[call.chain] || 'text-zinc-400 bg-zinc-500/10'}`}>
                    {chainIcon[call.chain] || '?'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl rounded-b-none max-h-[85vh] overflow-y-auto p-5 sm:p-6" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white font-bold">
                  {(selected.tokenName || '?')[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">${selected.tokenName}</h2>
                  <p className="text-[12px] text-zinc-500">{selected.chain}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <p className="text-[13px] text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap">{selected.content}</p>

            {/* Contract */}
            {selected.contractAddress && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Contract</p>
                <code className="text-[12px] text-zinc-400 font-mono break-all">{selected.contractAddress}</code>
              </div>
            )}

            {/* Security */}
            {selected.contractAddress && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Security Check</p>
                {secLoading ? (
                  <div className="flex items-center gap-2 text-[13px] text-zinc-500">
                    <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                    Scanning contract...
                  </div>
                ) : security ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-zinc-400">Risk Score</span>
                      <span className={`text-[13px] font-bold px-2.5 py-0.5 rounded-lg border ${scamColor(security.scam_score || 0)}`}>
                        {security.scam_score || 0}/100
                      </span>
                    </div>
                    {security.scam_reasons?.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {security.scam_reasons.map((r: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[12px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-red-400/80">{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {selected.contractAddress && selected.chain && (
                <a href={`https://dexscreener.com/${selected.chain.toLowerCase()}/${selected.contractAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 text-[13px] font-medium text-center border border-cyan-500/15 hover:bg-cyan-500/15 transition-all">
                  Chart ↗
                </a>
              )}
              {selected.tweetUrl && (
                <a href={selected.tweetUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.03] text-zinc-400 text-[13px] font-medium text-center border border-white/[0.06] hover:text-white transition-all">
                  Source ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
