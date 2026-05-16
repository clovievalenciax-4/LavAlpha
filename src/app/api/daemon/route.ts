import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    let logs: any[] = []
    let freshCount = 0, kolCount = 0, smartCount = 0
    
    try {
      logs = await prisma.$queryRawUnsafe(
        "SELECT event, details, createdAt FROM DaemonLog ORDER BY id DESC LIMIT 30"
      )
    } catch {}
    
    try {
      const fresh: any[] = await prisma.$queryRawUnsafe("SELECT COUNT(*) as c FROM FreshProject")
      freshCount = Number(fresh[0]?.c || 0)
      const smart: any[] = await prisma.$queryRawUnsafe("SELECT COUNT(*) as c FROM FreshProject WHERE smartFollowerCount > 0")
      smartCount = Number(smart[0]?.c || 0)
    } catch {}
    
    try {
      const kol: any[] = await prisma.$queryRawUnsafe("SELECT COUNT(*) as c FROM AlphaProject")
      kolCount = Number(kol[0]?.c || 0)
    } catch {}
    
    // Get NFT project count
    let nftCount = 0
    try {
      const nft: any[] = await prisma.$queryRawUnsafe("SELECT COUNT(*) as c FROM NFTProject")
      nftCount = Number(nft[0]?.c || 0)
    } catch {}
    
    // Get KOL following count
    let kolFollowingCount = 0
    try {
      const kf: any[] = await prisma.$queryRawUnsafe("SELECT COUNT(*) as c FROM KOLFollowing")
      kolFollowingCount = Number(kf[0]?.c || 0)
    } catch {}
    
    // Get on-chain data count
    let onChainCount = 0
    try {
      const oc: any[] = await prisma.$queryRawUnsafe("SELECT COUNT(*) as c FROM OnChainData")
      onChainCount = Number(oc[0]?.c || 0)
    } catch {}
    
    // Check daemon
    let daemonRunning = false
    try {
      const { execSync } = require('child_process')
      const result = execSync('pgrep -f "daemon.py"', { encoding: 'utf8', timeout: 3000 }).trim()
      daemonRunning = result.length > 0
    } catch {}
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      daemonRunning,
      stats: { 
        freshCount, 
        kolCount, 
        smartCount, 
        nftCount, 
        kolFollowingCount, 
        onChainCount 
      },
      logs,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'start-daemon') {
      const { execSync, spawn } = require('child_process')
      try {
        const result = execSync('pgrep -f "daemon.py"', { encoding: 'utf8', timeout: 3000 }).trim()
        if (result) return NextResponse.json({ success: true, message: 'Already running' })
      } catch {}
      
      const child = spawn('python3', ['scraper/daemon.py'], {
        cwd: '/root/.openclaw/workspace/alpha-tracker',
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      return NextResponse.json({ success: true, message: 'Started' })
    }
    
    if (action === 'stop-daemon') {
      const { execSync } = require('child_process')
      try {
        execSync('pkill -f "daemon.py"', { timeout: 3000 })
        return NextResponse.json({ success: true, message: 'Stopped' })
      } catch {
        return NextResponse.json({ success: true, message: 'Not running' })
      }
    }
    
    if (action === 'scrape-now') {
      const { spawn } = require('child_process')
      const child = spawn('python3', ['scraper/quick_scrape.py'], {
        cwd: '/root/.openclaw/workspace/alpha-tracker',
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      return NextResponse.json({ success: true, message: 'Scrape started' })
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
