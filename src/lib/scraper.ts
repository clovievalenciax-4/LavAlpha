export interface ParsedTweet {
  tokenName: string | null
  chain: string | null
  contractAddress: string | null
  sentiment: 'bullish' | 'bearish' | 'neutral'
  tags: string[]
}

// Detect contract addresses
function detectCA(text: string): { address: string; chain: string } | null {
  // EVM address (0x + 40 hex chars)
  const evmMatch = text.match(/0x[a-fA-F0-9]{40}/)
  if (evmMatch) {
    const lower = text.toLowerCase()
    if (lower.includes('bsc') || lower.includes('binance') || lower.includes('bnb'))
      return { address: evmMatch[0], chain: 'BSC' }
    if (lower.includes('base'))
      return { address: evmMatch[0], chain: 'BASE' }
    return { address: evmMatch[0], chain: 'ETH' }
  }

  // Solana address (base58, 32-44 chars) — rough heuristic
  const solMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/)
  if (solMatch && (text.toLowerCase().includes('sol') || text.toLowerCase().includes('solana'))) {
    return { address: solMatch[0], chain: 'SOL' }
  }

  return null
}

// Detect token names like $TOKEN, $TOKEN/USDT, or "token:" patterns
function detectToken(text: string): string | null {
  // $TICKER pattern
  const tickerMatch = text.match(/\$([A-Z]{2,10})(?:\b|\/)/)
  if (tickerMatch) return tickerMatch[1]

  // #TICKER pattern
  const hashMatch = text.match(/#([A-Z]{2,10})\b/)
  if (hashMatch) return hashMatch[1]

  // "buying X" or "aped X" patterns
  const buyMatch = text.match(/(?:buying|aped|bought|loading|accumulating)\s+([A-Z]{2,10})\b/i)
  if (buyMatch) return buyMatch[1].toUpperCase()

  return null
}

// Detect chain hints
function detectChain(text: string): string | null {
  const lower = text.toLowerCase()
  if (/\b(sol|solana)\b/.test(lower)) return 'SOL'
  if (/\b(eth|ethereum)\b/.test(lower)) return 'ETH'
  if (/\b(bsc|binance|bnb)\b/.test(lower)) return 'BSC'
  if (/\bbase\b/.test(lower)) return 'BASE'
  if (/\bavax|avalanche\b/.test(lower)) return 'AVAX'
  if (/\barb|arbitrum\b/.test(lower)) return 'ARB'
  return null
}

// Detect sentiment
function detectSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase()
  const bullishWords = ['alpha', 'gem', 'moon', 'pump', 'bullish', 'buy', 'ape', 'load', 'accumulate', 'undervalued', 'early', '100x', '1000x', 'send', 'breakout']
  const bearishWords = ['dump', 'rug', 'scam', 'bearish', 'sell', 'exit', 'avoid', 'dead', 'overvalued']

  const bullishCount = bullishWords.filter(w => lower.includes(w)).length
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length

  if (bullishCount > bearishCount) return 'bullish'
  if (bearishCount > bullishCount) return 'bearish'
  return 'neutral'
}

// Detect tags
function detectTags(text: string): string[] {
  const tags: string[] = []
  const lower = text.toLowerCase()
  if (lower.includes('alpha')) tags.push('alpha')
  if (lower.includes('gem')) tags.push('gem')
  if (lower.includes('micro') || lower.includes('lowcap') || lower.includes('low cap')) tags.push('micro-cap')
  if (lower.includes('nft')) tags.push('nft')
  if (lower.includes('defi')) tags.push('defi')
  if (lower.includes('meme') || lower.includes('memecoin')) tags.push('meme')
  if (lower.includes('airdrop')) tags.push('airdrop')
  if (lower.includes('new') || lower.includes('launch')) tags.push('new-launch')
  return tags
}

export function parseTweet(text: string): ParsedTweet {
  const ca = detectCA(text)
  const tokenName = detectToken(text)
  const chainHint = detectChain(text)
  const sentiment = detectSentiment(text)
  const tags = detectTags(text)

  return {
    tokenName: tokenName,
    chain: ca ? ca.chain : chainHint,
    contractAddress: ca ? ca.address : null,
    sentiment,
    tags,
  }
}
