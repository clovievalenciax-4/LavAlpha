import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chain = searchParams.get('chain')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    // Query FreshProject table via raw SQL since Prisma might not have it
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    try {
      let where = []
      let params = []
      
      if (chain) { where.push("chain = ?"); params.push(chain.toUpperCase()) }
      if (category) { where.push("category = ?"); params.push(category) }
      if (search) { where.push("(name LIKE ? OR bio LIKE ? OR username LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      
      const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
      
      const projects = await prisma.$queryRawUnsafe(
        `SELECT * FROM FreshProject ${whereClause} ORDER BY score DESC, discoveredAt DESC LIMIT 50`,
        ...params
      )
      
      // Also get AlphaProject table
      let alphaProjects = []
      try {
        alphaProjects = await prisma.$queryRawUnsafe(
          `SELECT * FROM AlphaProject ORDER BY mentionedAt DESC LIMIT 50`
        )
      } catch (e) {}
      
      // Get on-chain data for projects with contract addresses
      let onChainData: any[] = []
      try {
        onChainData = await prisma.$queryRawUnsafe(
          `SELECT * FROM OnChainData ORDER BY checkedAt DESC LIMIT 100`
        )
      } catch (e) {}
      
      // Get KOL following data
      let kolFollowing: any[] = []
      try {
        kolFollowing = await prisma.$queryRawUnsafe(
          `SELECT * FROM KOLFollowing ORDER BY detectedAt DESC LIMIT 200`
        )
      } catch (e) {}
      
      // Enrich projects with on-chain data
      const enrichedProjects = projects.map((p: any) => {
        const oc = onChainData.find((o: any) => o.projectId === p.id)
        return { ...p, onChain: oc || null }
      })
      
      // Combine
      const allProjects = [
        ...enrichedProjects.map((p: any) => ({ ...p, source: 'fresh' })),
        ...alphaProjects.map((p: any) => ({ ...p, source: 'kol' })),
      ]
      
      return NextResponse.json({ 
        projects: allProjects, 
        total: allProjects.length,
        kolFollowing: kolFollowing.length,
        onChainCount: onChainData.length,
      })
    } catch (e) {
      return NextResponse.json({ projects: [], total: 0 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
