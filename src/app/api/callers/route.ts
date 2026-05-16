import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const callers = await prisma.caller.findMany({
    include: {
      alphaCalls: { orderBy: { mentionedAt: 'desc' }, take: 5 },
      _count: { select: { alphaCalls: true } },
    },
    orderBy: { score: 'desc' },
  })
  return NextResponse.json(callers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const caller = await prisma.caller.create({
    data: {
      username: body.username,
      name: body.name,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
    },
  })
  return NextResponse.json(caller, { status: 201 })
}
