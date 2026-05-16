import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const call = await prisma.alphaCall.findUnique({
    where: { id },
    include: { caller: true },
  })
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(call)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const call = await prisma.alphaCall.update({
    where: { id },
    data: body,
    include: { caller: true },
  })
  return NextResponse.json(call)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.alphaCall.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
