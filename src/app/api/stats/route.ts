import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [totalCalls, totalCallers, recentCalls, topCallers, chainDistribution, sentimentDistribution] = await Promise.all([
    prisma.alphaCall.count(),
    prisma.caller.count(),
    prisma.alphaCall.findMany({
      take: 10,
      orderBy: { mentionedAt: 'desc' },
      include: { caller: true },
    }),
    prisma.caller.findMany({
      take: 10,
      orderBy: { score: 'desc' },
      include: { _count: { select: { alphaCalls: true } } },
    }),
    prisma.alphaCall.groupBy({
      by: ['chain'],
      _count: true,
      orderBy: { _count: { chain: 'desc' } },
    }),
    prisma.alphaCall.groupBy({
      by: ['sentiment'],
      _count: true,
    }),
  ])

  const last24h = await prisma.alphaCall.count({
    where: { mentionedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })

  return NextResponse.json({
    totalCalls,
    totalCallers,
    last24h,
    recentCalls,
    topCallers,
    chainDistribution,
    sentimentDistribution,
  })
}
