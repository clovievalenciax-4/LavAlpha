'use client'

import { useState } from 'react'

interface SearchFilterProps {
  onFilter: (filters: { search: string; chain: string; sentiment: string }) => void
}

export default function SearchFilter({ onFilter }: SearchFilterProps) {
  const [search, setSearch] = useState('')
  const [chain, setChain] = useState('')
  const [sentiment, setSentiment] = useState('')

  const handleChange = (field: string, value: string) => {
    const f = { search, chain, sentiment, [field]: value }
    if (field === 'search') setSearch(value)
    if (field === 'chain') setChain(value)
    if (field === 'sentiment') setSentiment(value)
    onFilter(f)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[260px]">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input type="text" placeholder="Search tokens, content, callers..." value={search}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0a0e14] border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/30 transition-all"
        />
      </div>
      <select value={chain} onChange={(e) => handleChange('chain', e.target.value)}
        className="px-5 py-3 rounded-2xl bg-[#0a0e14] border border-white/[0.06] text-sm text-zinc-400 focus:outline-none focus:border-cyan-500/30 transition-all appearance-none cursor-pointer">
        <option value="">All Chains</option>
        <option value="ETH">Ethereum</option>
        <option value="SOL">Solana</option>
        <option value="BSC">BSC</option>
        <option value="BASE">Base</option>
        <option value="AVAX">Avalanche</option>
        <option value="ARB">Arbitrum</option>
      </select>
      <select value={sentiment} onChange={(e) => handleChange('sentiment', e.target.value)}
        className="px-5 py-3 rounded-2xl bg-[#0a0e14] border border-white/[0.06] text-sm text-zinc-400 focus:outline-none focus:border-cyan-500/30 transition-all appearance-none cursor-pointer">
        <option value="">All Sentiment</option>
        <option value="bullish">🟢 Bullish</option>
        <option value="bearish">🔴 Bearish</option>
        <option value="neutral">⚪ Neutral</option>
      </select>
    </div>
  )
}
