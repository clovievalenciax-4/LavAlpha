import { NextRequest, NextResponse } from 'next/server'

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8888'

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  try {
    const resp = await fetch(`${SCRAPER_URL}/api/alpha/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Scraper offline' }, { status: 503 })
  }
}
