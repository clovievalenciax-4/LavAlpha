import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caller = await prisma.caller.findUnique({
    where: { id },
    include: { alphaCalls: { orderBy: { mentionedAt: 'desc' } } },
  })
  if (!caller) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(caller)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const caller = await prisma.caller.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(caller)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.alphaCall.deleteMany({ where: { callerId: id } })
  await prisma.caller.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
