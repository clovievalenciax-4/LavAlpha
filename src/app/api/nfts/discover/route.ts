import { NextRequest, NextResponse } from 'next/server'

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8888'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get('chain') || 'solana'
  const limit = searchParams.get('limit') || '20'
  
  try {
    const resp = await fetch(`${SCRAPER_URL}/api/discover/nfts?chain=${chain}&limit=${limit}`, { cache: 'no-store' })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Scraper offline', collections: [], count: 0 }, { status: 503 })
  }
}
