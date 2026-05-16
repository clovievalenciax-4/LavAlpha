'use client'

import { useEffect, useState } from 'react'

interface Token {
  name: string
  symbol: string
  chain: string
  contract_address: string
  price_usd: number | null
  market_cap: number | null
  liquidity: number | null
  volume_24h: number | null
  price_change_24h: number | null
  age_hours: number | null
  dex: string | null
  url: string | null
  image: string | null
  scam_score: number | null
  scam_reasons: string[] | null
  source: string
}

export default function DiscoverTokensPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [chain, setChain] = useState('')
  const [maxAge, setMaxAge] = useState('72')
  const [maxScam, setMaxScam] = useState('50')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [searching, setSearching] = useState(false)

  const fetchTokens = () => {
    setLoading(true)
    const params = new URLSearchParams({ max_age_hours: maxAge, max_scam_score: maxScam, limit: '30' })
    if (chain) params.set('chain', chain)
    fetch(`/api/tokens/discover?${params}`)
      .then(r => r.json())
      .then(d => setTokens(d.tokens || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTokens() }, [chain, maxAge, maxScam])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const resp = await fetch(`/api/tokens/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await resp.json()
      setSearchResults(data.tokens || [])
    } finally {
      setSearching(false)
    }
  }

  const getScamColor = (score: number | null) => {
    if (score === null) return { text: 'text-zinc-500', bg: 'bg-zinc-500/10', label: 'Unknown' }
    if (score <= 15) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Safe' }
    if (score <= 40) return { text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Caution' }
    return { text: 'text-red-400', bg: 'bg-red-500/10', label: 'Risky' }
  }

  const formatNum = (n: number | null) => {
    if (n === null) return '—'
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
    return `$${n.toFixed(2)}`
  }

  const formatAge = (hours: number | null) => {
    if (hours === null) return '—'
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${Math.round(hours)}h`
    return `${Math.round(hours / 24)}d`
  }

  const chainColors: Record<string, string> = {
    ethereum: 'tag-blue', solana: 'tag-purple', bsc: 'tag-yellow',
    base: 'tag-cyan', avalanche: 'tag-red', arbitrum: 'tag-sky',
  }

  const displayTokens = searchResults.length > 0 ? searchResults : tokens

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-white tracking-tight">Discover Tokens</h1>
        <p className="text-sm text-zinc-500 mt-1">Find new tokens with scam detection</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Search token name, symbol, or CA..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0a0e14] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30 transition-all"
          />
        </div>
        <button onClick={handleSearch} disabled={searching}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/15 disabled:opacity-50">
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={chain} onChange={(e) => setChain(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#0a0e14] border border-white/[0.06] text-sm text-zinc-400 focus:outline-none focus:border-cyan-500/30 appearance-none cursor-pointer">
          <option value="">All Chains</option>
          <option value="ethereum">Ethereum</option>
          <option value="solana">Solana</option>
          <option value="bsc">BSC</option>
          <option value="base">Base</option>
        </select>
        <select value={maxAge} onChange={(e) => setMaxAge(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#0a0e14] border border-white/[0.06] text-sm text-zinc-400 focus:outline-none focus:border-cyan-500/30 appearance-none cursor-pointer">
          <option value="24">Last 24h</option>
          <option value="48">Last 48h</option>
          <option value="72">Last 72h</option>
          <option value="168">Last 7d</option>
        </select>
        <select value={maxScam} onChange={(e) => setMaxScam(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-[#0a0e14] border border-white/[0.06] text-sm text-zinc-400 focus:outline-none focus:border-cyan-500/30 appearance-none cursor-pointer">
          <option value="100">All Risk</option>
          <option value="50">Medium Risk</option>
          <option value="25">Low Risk</option>
          <option value="10">Safe Only</option>
        </select>
        {searchResults.length > 0 && (
          <button onClick={() => setSearchResults([])} className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">
            Clear Search
          </button>
        )}
      </div>

      {/* Token grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-[180px] card shimmer" />)}
        </div>
      ) : displayTokens.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-5 text-4xl">🔍</div>
          <p className="text-zinc-400 font-semibold text-lg">No tokens found</p>
          <p className="text-sm text-zinc-600 mt-2">Try different search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTokens.map((token, i) => {
            const scam = getScamColor(token.scam_score)
            return (
              <div key={`${token.contract_address}-${i}`} className="card p-5 transition-all duration-300 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {token.image ? (
                      <img src={token.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm">
                        {(token.symbol || '?')[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-semibold text-white">{token.name || token.symbol}</p>
                      <p className="text-[11px] text-zinc-600 font-mono">${token.symbol}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${scam.bg} ${scam.text}`}>
                    {token.scam_score !== null ? `${token.scam_score}` : '?'} {scam.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Price</p>
                    <p className="text-[13px] font-bold text-white">{token.price_usd ? `$${token.price_usd.toFixed(6)}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Market Cap</p>
                    <p className="text-[13px] font-bold text-white">{formatNum(token.market_cap)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Liquidity</p>
                    <p className="text-[13px] font-bold text-white">{formatNum(token.liquidity)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Volume 24h</p>
                    <p className="text-[13px] font-bold text-white">{formatNum(token.volume_24h)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${chainColors[token.chain] || 'tag-cyan'}`}>
                      {token.chain}
                    </span>
                    {token.age_hours !== null && (
                      <span className="text-[10px] text-zinc-600">{formatAge(token.age_hours)} old</span>
                    )}
                  </div>
                  {token.price_change_24h !== null && (
                    <span className={`text-[11px] font-bold ${token.price_change_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(1)}%
                    </span>
                  )}
                </div>

                {token.scam_reasons && token.scam_reasons.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {token.scam_reasons.slice(0, 3).map((r, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-red-500" />
                        <span className="text-[10px] text-red-400/70">{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {token.url && (
                  <a href={token.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors font-medium">
                    View on DEXScreener →
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
