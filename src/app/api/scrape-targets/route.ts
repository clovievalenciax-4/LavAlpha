import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const targets = await prisma.scrapeTarget.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(targets)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const target = await prisma.scrapeTarget.create({
    data: { username: body.username.replace('@', '') },
  })
  return NextResponse.json(target, { status: 201 })
}
