import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean
  await prisma.alphaCall.deleteMany()
  await prisma.caller.deleteMany()
  await prisma.scrapeTarget.deleteMany()

  // Create callers
  const callers = await Promise.all([
    prisma.caller.create({ data: { username: 'CryptoKaleo', name: 'Kaleo', score: 82, totalCalls: 45, correctCalls: 37 } }),
    prisma.caller.create({ data: { username: 'inversebrah', name: 'Inversebrah', score: 71, totalCalls: 38, correctCalls: 27 } }),
    prisma.caller.create({ data: { username: 'HsakaTrades', name: 'Hsaka', score: 88, totalCalls: 52, correctCalls: 46 } }),
    prisma.caller.create({ data: { username: 'CryptoHayes', name: 'Arthur Hayes', score: 75, totalCalls: 29, correctCalls: 22 } }),
    prisma.caller.create({ data: { username: 'Pentosh1', name: 'Pentoshi', score: 79, totalCalls: 41, correctCalls: 32 } }),
  ])

  // Create alpha calls
  const now = Date.now()
  const calls = [
    { callerId: callers[0].id, content: 'New gem alert on $RWA token. Real yield, low mcap. Loading heavy here. #Ethereum #DeFi', tokenName: 'RWA', chain: 'ETH', sentiment: 'bullish', tags: 'gem,defi', mentionedAt: new Date(now - 2 * 60 * 60 * 1000) },
    { callerId: callers[2].id, content: 'Solana memecoin season heating up. $WIF looking like a 100x from here. Aped.', tokenName: 'WIF', chain: 'SOL', sentiment: 'bullish', tags: 'alpha,meme', mentionedAt: new Date(now - 4 * 60 * 60 * 1000) },
    { callerId: callers[1].id, content: 'BASE ecosystem is undervalued. $DEGEN accumulating at these levels. Early.', tokenName: 'DEGEN', chain: 'BASE', sentiment: 'bullish', tags: 'alpha,gem', mentionedAt: new Date(now - 6 * 60 * 60 * 1000) },
    { callerId: callers[4].id, content: 'Bearish on $ARB short term. Overvalued at current levels. Taking profit.', tokenName: 'ARB', chain: 'ARB', sentiment: 'bearish', tags: '', mentionedAt: new Date(now - 8 * 60 * 60 * 1000) },
    { callerId: callers[3].id, content: 'Bitcoin looking strong above 100k. New ATH incoming. Loading $BTC calls.', tokenName: 'BTC', chain: 'ETH', sentiment: 'bullish', tags: 'alpha', mentionedAt: new Date(now - 10 * 60 * 60 * 1000) },
    { callerId: callers[0].id, content: 'BSC gem: low cap DeFi protocol with real TVL. $CAKE competitor. Micro-cap alpha.', tokenName: 'CAKE', chain: 'BSC', sentiment: 'bullish', tags: 'gem,micro-cap,defi', mentionedAt: new Date(now - 12 * 60 * 60 * 1000) },
    { callerId: callers[2].id, content: 'Ethereum L2 narrative heating up. $OP undervalued vs $ARB. Accumulate.', tokenName: 'OP', chain: 'ETH', sentiment: 'bullish', tags: 'alpha', mentionedAt: new Date(now - 14 * 60 * 60 * 1000) },
    { callerId: callers[1].id, content: 'Avoid $FTM. Rug risk high. Dead project walking.', tokenName: 'FTM', chain: 'ETH', sentiment: 'bearish', tags: '', mentionedAt: new Date(now - 16 * 60 * 60 * 1000) },
    { callerId: callers[4].id, content: 'Solana DEX narrative. $JUP is the play. New launch, massive volume. Alpha.', tokenName: 'JUP', chain: 'SOL', sentiment: 'bullish', tags: 'alpha,new-launch', mentionedAt: new Date(now - 18 * 60 * 60 * 1000) },
    { callerId: callers[3].id, content: 'Base chain $TOSHI micro-cap gem. Low mcat, high potential. Loading bag.', tokenName: 'TOSHI', chain: 'BASE', sentiment: 'bullish', tags: 'gem,micro-cap,meme', mentionedAt: new Date(now - 20 * 60 * 60 * 1000) },
    { callerId: callers[0].id, content: 'New AI token launch on ETH. $RNDR breaking out. AI narrative still strong.', tokenName: 'RNDR', chain: 'ETH', sentiment: 'bullish', tags: 'alpha,new-launch', mentionedAt: new Date(now - 22 * 60 * 60 * 1000) },
    { callerId: callers[2].id, content: 'BSC memecoin $PEPE2 pumping. New contract, clean. Gem status.', tokenName: 'PEPE2', chain: 'BSC', sentiment: 'bullish', tags: 'gem,meme', mentionedAt: new Date(now - 24 * 60 * 60 * 1000) },
    { callerId: callers[1].id, content: 'Solana $BONK is dead. Moving to $WIF for meme plays. Rotate.', tokenName: 'WIF', chain: 'SOL', sentiment: 'bullish', tags: 'meme', mentionedAt: new Date(now - 26 * 60 * 60 * 1000) },
    { callerId: callers[4].id, content: 'ETH staking derivatives $LDO $RPL both undervalued. DeFi alpha.', tokenName: 'LDO', chain: 'ETH', sentiment: 'bullish', tags: 'alpha,defi', mentionedAt: new Date(now - 28 * 60 * 60 * 1000) },
    { callerId: callers[3].id, content: 'AVAX ecosystem heating. $JOE is the DEX play. Accumulate before breakout.', tokenName: 'JOE', chain: 'AVAX', sentiment: 'bullish', tags: 'alpha,defi', mentionedAt: new Date(now - 30 * 60 * 60 * 1000) },
    { callerId: callers[0].id, content: 'BASE $BALD rug pull. Avoid at all costs. Scam project.', tokenName: 'BALD', chain: 'BASE', sentiment: 'bearish', tags: '', mentionedAt: new Date(now - 32 * 60 * 60 * 1000) },
    { callerId: callers[2].id, content: 'SOL $RAY breakout imminent. DEX volume hitting ATH. Bullish setup.', tokenName: 'RAY', chain: 'SOL', sentiment: 'bullish', tags: 'alpha,defi', mentionedAt: new Date(now - 34 * 60 * 60 * 1000) },
    { callerId: callers[1].id, content: 'ETH $ENS undervalued at these levels. Domain narrative coming back. Alpha.', tokenName: 'ENS', chain: 'ETH', sentiment: 'bullish', tags: 'alpha', mentionedAt: new Date(now - 36 * 60 * 60 * 1000) },
    { callerId: callers[4].id, content: 'BSC $XVS DeFi bluechip. Yield farming opportunity. Steady gains.', tokenName: 'XVS', chain: 'BSC', sentiment: 'neutral', tags: 'defi', mentionedAt: new Date(now - 38 * 60 * 60 * 1000) },
    { callerId: callers[3].id, content: 'New NFT-Fi token $BLUR pumping. NFT narrative revival. Early alpha.', tokenName: 'BLUR', chain: 'ETH', sentiment: 'bullish', tags: 'alpha,nft,new-launch', mentionedAt: new Date(now - 40 * 60 * 60 * 1000) },
  ]

  await prisma.alphaCall.createMany({ data: calls })

  // Create scrape targets
  await prisma.scrapeTarget.createMany({
    data: [
      { username: 'CryptoKaleo', isActive: true },
      { username: 'inversebrah', isActive: true },
      { username: 'HsakaTrades', isActive: true },
      { username: 'CryptoHayes', isActive: true },
      { username: 'Pentosh1', isActive: true },
    ],
  })

  console.log('✅ Seed complete: 5 callers, 20 alpha calls, 5 scrape targets')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
