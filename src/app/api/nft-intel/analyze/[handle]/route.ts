import { NextRequest, NextResponse } from 'next/server'

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8888'

export async function GET(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  
  try {
    const resp = await fetch(`${SCRAPER_URL}/api/nft-intel/analyze/${handle}`, { cache: 'no-store' })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Scraper offline' }, { status: 503 })
  }
}
