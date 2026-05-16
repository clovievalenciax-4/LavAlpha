import { NextRequest, NextResponse } from 'next/server'

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8888'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  
  if (!q) return NextResponse.json({ tokens: [], count: 0 })
  
  try {
    const resp = await fetch(`${SCRAPER_URL}/api/tokens/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Scraper offline', tokens: [], count: 0 }, { status: 503 })
  }
}
