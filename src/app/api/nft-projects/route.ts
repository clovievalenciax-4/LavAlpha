import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    const { searchParams } = new URL(request.url)
    const chain = searchParams.get('chain')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let projects: any[] = []
    try {
      let where = []
      let params = []
      if (chain) { where.push("chain = ?"); params.push(chain.toUpperCase()) }
      if (category) { where.push("category = ?"); params.push(category) }
      if (search) { where.push("(name LIKE ? OR bio LIKE ? OR username LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
      projects = await prisma.$queryRawUnsafe(
        `SELECT * FROM NFTProject ${whereClause} ORDER BY score DESC, discoveredAt DESC LIMIT 50`, ...params
      )
    } catch {}

    await prisma.$disconnect()
    return NextResponse.json({ projects, total: projects.length })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'scrape-now') {
      const { spawn } = require('child_process')
      const child = spawn('python3', ['scraper/nft_scraper.py'], {
        cwd: '/root/.openclaw/workspace/alpha-tracker',
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      return NextResponse.json({ success: true, message: 'NFT scrape started' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
