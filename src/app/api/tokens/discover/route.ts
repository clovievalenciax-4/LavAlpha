import { NextRequest, NextResponse } from 'next/server'

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8888'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get('chain') || ''
  const maxAge = searchParams.get('max_age_hours') || '72'
  const minLiq = searchParams.get('min_liquidity') || '0'
  const maxScam = searchParams.get('max_scam_score') || '50'
  const limit = searchParams.get('limit') || '20'
  
  try {
    const params = new URLSearchParams({ max_age_hours: maxAge, min_liquidity: minLiq, max_scam_score: maxScam, limit: limit })
    if (chain) params.set('chain', chain)
    const resp = await fetch(`${SCRAPER_URL}/api/discover/tokens?${params}`, { cache: 'no-store' })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Scraper offline', tokens: [], count: 0 }, { status: 503 })
  }
}
