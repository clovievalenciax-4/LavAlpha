'use client'

import CallerBadge from './CallerBadge'

interface AlphaCallCardProps {
  call: {
    id: string
    content: string
    tokenName?: string | null
    chain?: string | null
    contractAddress?: string | null
    sentiment?: string | null
    tags?: string | null
    tweetUrl?: string | null
    mentionedAt: string
    caller: {
      id: string
      username: string
      name?: string | null
      avatarUrl?: string | null
      score: number
    }
  }
}

const chainStyles: Record<string, string> = {
  ETH: 'tag-blue', SOL: 'tag-purple', BSC: 'tag-yellow',
  BASE: 'tag-cyan', AVAX: 'tag-red', ARB: 'tag-sky',
}

export default function AlphaCallCard({ call }: AlphaCallCardProps) {
  const tags = call.tags ? call.tags.split(',').filter(Boolean) : []

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const sentimentCfg: Record<string, { color: string; bg: string; label: string }> = {
    bullish: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Bullish' },
    bearish: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Bearish' },
    neutral: { color: 'text-zinc-500', bg: 'bg-zinc-500/10', label: 'Neutral' },
  }

  return (
    <div className="card p-5 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <CallerBadge caller={call.caller} compact />
        <div className="flex items-center gap-2.5">
          {call.sentiment && (
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md ${sentimentCfg[call.sentiment]?.bg} ${sentimentCfg[call.sentiment]?.color}`}>
              {sentimentCfg[call.sentiment]?.label}
            </span>
          )}
          <span className="text-[11px] text-zinc-700 font-medium">{timeAgo(call.mentionedAt)}</span>
        </div>
      </div>

      {/* Content */}
      <p className="text-[13px] text-zinc-300 leading-[1.7] mb-4 line-clamp-3">{call.content}</p>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {call.tokenName && (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[12px] font-bold font-mono border border-cyan-500/15">
            ${call.tokenName}
          </span>
        )}
        {call.chain && (
          <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${chainStyles[call.chain] || 'tag-cyan'}`}>
            {call.chain}
          </span>
        )}
        {tags.map((tag) => (
          <span key={tag} className="px-2 py-1 rounded-md bg-white/[0.03] text-zinc-600 text-[10px] font-medium border border-white/[0.04]">
            {tag}
          </span>
        ))}
      </div>

      {/* Contract Address */}
      {call.contractAddress && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-3">
          <span className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] font-bold">CA</span>
          <code className="text-[11px] text-zinc-500 font-mono truncate">{call.contractAddress}</code>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-700">{new Date(call.mentionedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        {call.tweetUrl && (
          <a href={call.tweetUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors font-medium"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            View on X
          </a>
        )}
      </div>
    </div>
  )
}
