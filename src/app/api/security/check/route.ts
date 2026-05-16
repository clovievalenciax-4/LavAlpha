import { NextRequest, NextResponse } from 'next/server'

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8888'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get('chain') || 'solana'
  const address = searchParams.get('address') || ''
  
  if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
  
  try {
    const resp = await fetch(`${SCRAPER_URL}/api/security/check/${chain}/${address}`, { cache: 'no-store' })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Scraper offline' }, { status: 503 })
  }
}
