import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const callerId = searchParams.get('callerId')
  const chain = searchParams.get('chain')
  const token = searchParams.get('token')
  const sentiment = searchParams.get('sentiment')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const where: any = {}
  if (callerId) where.callerId = callerId
  if (chain) where.chain = chain
  if (token) where.tokenName = { contains: token }
  if (sentiment) where.sentiment = sentiment
  if (search) where.OR = [
    { content: { contains: search } },
    { tokenName: { contains: search } },
  ]

  const [calls, total] = await Promise.all([
    prisma.alphaCall.findMany({
      where,
      include: { caller: true },
      orderBy: { mentionedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.alphaCall.count({ where }),
  ])

  return NextResponse.json({ calls, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { content, callerUsername, tokenName, chain, contractAddress, sentiment, tags, tweetUrl } = body

  let caller = await prisma.caller.findUnique({ where: { username: callerUsername } })
  if (!caller) {
    caller = await prisma.caller.create({ data: { username: callerUsername } })
  }

  const call = await prisma.alphaCall.create({
    data: {
      content,
      callerId: caller.id,
      tokenName,
      chain,
      contractAddress,
      sentiment,
      tags: Array.isArray(tags) ? tags.join(',') : tags,
      tweetUrl,
    },
    include: { caller: true },
  })

  await prisma.caller.update({
    where: { id: caller.id },
    data: { totalCalls: { increment: 1 } },
  })

  return NextResponse.json(call, { status: 201 })
}
