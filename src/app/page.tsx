'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function MiniSparkline({ data, color = 'var(--accent)', w = 60, h = 20 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} style={{display:'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DistBar({ segments }: { segments: { color: string; pct: number }[] }) {
  return (
    <div className="dist-bar">
      {segments.filter(s => s.pct > 0).map((s, i) => (
        <div key={i} className="dist-seg" style={{width:`${s.pct}%`,background:s.color}} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()).catch(() => null),
      fetch('/api/projects').then(r => r.json()).catch(() => ({ projects: [] })),
      fetch('/api/alpha-calls?limit=8').then(r => r.json()).catch(() => ({ calls: [] })),
    ]).then(([s, p, c]) => {
      setStats(s)
      setProjects(p.projects || [])
      setCalls(c.calls || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{height:72,borderRadius:6}} />)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>
          <div className="shimmer" style={{height:300,borderRadius:6}} />
          <div className="shimmer" style={{height:300,borderRadius:6}} />
        </div>
      </div>
    )
  }

  const freshProjects = projects.filter(p => p.source === 'fresh')
  const kolProjects = projects.filter(p => p.source === 'kol')
  const topProjects = [...projects].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6)

  const chainDist = stats?.chainDistribution || []
  const totalChain = chainDist.reduce((a: number, c: any) => a + c._count, 0)
  const chainColors: Record<string, string> = { SOLANA: '#a78bfa', ETHEREUM: '#3b82f6', BASE: '#22d3ee', BSC: '#eab308', ETH: '#3b82f6', SOL: '#a78bfa' }

  const sentDist = stats?.sentimentDistribution || []
  const totalSent = sentDist.reduce((a: number, c: any) => a + c._count, 0)

  // Generate mock sparkline data from calls count
  const sparkData = [12, 18, 15, 22, 28, 24, 31, 27, 35, 42, 38, stats?.last24h || 45]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontSize:16,fontWeight:600,color:'var(--text-1)',letterSpacing:'-0.01em'}}>Dashboard</h1>
          <p style={{fontSize:11,color:'var(--text-4)',marginTop:1}}>Crypto intelligence · {stats?.totalCalls || 0} calls tracked</p>
        </div>
        <div style={{fontSize:10,color:'var(--text-5)'}}>
          Last 24h: <span className="num" style={{color:'var(--text-2)'}}>{stats?.last24h || 0}</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
        <div className="card stat-cyan" style={{padding:'12px 14px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:9,color:'var(--text-5)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600}}>Total Calls</p>
              <p className="num" style={{fontSize:22,fontWeight:700,color:'var(--text-1)',marginTop:2}}>{stats?.totalCalls || 0}</p>
            </div>
            <MiniSparkline data={sparkData} color="var(--blue)" w={48} h={18} />
          </div>
          <p style={{fontSize:9,color:'var(--text-5)',marginTop:4}}>{stats?.totalCallers || 0} callers active</p>
        </div>
        <div className="card stat-emerald" style={{padding:'12px 14px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:9,color:'var(--text-5)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600}}>Projects</p>
              <p className="num" style={{fontSize:22,fontWeight:700,color:'var(--text-1)',marginTop:2}}>{projects.length}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:9,color:'var(--text-5)'}}>Fresh</p>
              <p className="num" style={{fontSize:12,fontWeight:600,color:'var(--green)'}}>{freshProjects.length}</p>
            </div>
          </div>
          <p style={{fontSize:9,color:'var(--text-5)',marginTop:4}}>{kolProjects.length} from KOL signals</p>
        </div>
        <div className="card stat-amber" style={{padding:'12px 14px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:9,color:'var(--text-5)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600}}>Smart Follow</p>
              <p className="num" style={{fontSize:22,fontWeight:700,color:'var(--amber)',marginTop:2}}>{freshProjects.filter(p => p.smartFollowerCount > 0).length}</p>
            </div>
          </div>
          <p style={{fontSize:9,color:'var(--text-5)',marginTop:4}}>KOL backed projects</p>
        </div>
        <div className="card stat-rose" style={{padding:'12px 14px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:9,color:'var(--text-5)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600}}>24h Activity</p>
              <p className="num" style={{fontSize:22,fontWeight:700,color:'var(--text-1)',marginTop:2}}>{stats?.last24h || 0}</p>
            </div>
            <MiniSparkline data={sparkData.slice(-6)} color="var(--red)" w={40} h={16} />
          </div>
          <p style={{fontSize:9,color:'var(--text-5)',marginTop:4}}>calls today</p>
        </div>
      </div>

      {/* Main grid */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>

        {/* Left: Top Projects */}
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <h2 style={{fontSize:12,fontWeight:600,color:'var(--text-2)'}}>Top Alpha Projects</h2>
            <Link href="/projects" style={{fontSize:11,color:'var(--accent-text)'}}>View all →</Link>
          </div>

          {topProjects.length === 0 ? (
            <div className="card" style={{padding:24,textAlign:'center'}}>
              <p style={{color:'var(--text-4)',fontSize:12}}>No projects yet</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {topProjects.map((proj, idx) => {
                const smartList = typeof proj.smartFollowers === 'string' ? proj.smartFollowers.split(',').filter(Boolean) : (proj.smartFollowers || [])
                const hasSmart = smartList.length > 0
                return (
                  <Link key={proj.id || proj.username} href="/projects"
                    className="card"
                    style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:10,transition:'border-color 60ms ease'}}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
                    <span className="num" style={{fontSize:10,color:'var(--text-5)',width:16,textAlign:'right'}}>{idx + 1}</span>
                    <div className="avatar" style={{
                      background: hasSmart ? 'var(--amber-bg)' : 'var(--bg-4)',
                      color: hasSmart ? 'var(--amber)' : 'var(--text-3)',
                      fontSize:10, width:24, height:24
                    }}>
                      {(proj.name || proj.username || '?')[0]}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{fontSize:12,fontWeight:500,color:'var(--text-1)'}}>{proj.name || proj.username}</span>
                        {proj.source === 'fresh' && <span className="badge badge-green" style={{fontSize:8,padding:'0 4px'}}>FRESH</span>}
                        {hasSmart && <span className="badge badge-amber" style={{fontSize:8,padding:'0 4px'}}>★{smartList.length}</span>}
                      </div>
                      <p style={{fontSize:10,color:'var(--text-4)',marginTop:1}}>
                        @{proj.username} · {proj.category || proj.stage || '—'}
                      </p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:10,color:'var(--text-4)'}}>{proj.followers ? `${(proj.followers/1000).toFixed(0)}K` : ''}</span>
                      <span className="num" style={{fontSize:14,fontWeight:700,color:hasSmart?'var(--amber)':'var(--accent-text)',minWidth:24,textAlign:'right'}}>
                        {Math.round(proj.score || 0)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Latest Calls */}
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <h2 style={{fontSize:12,fontWeight:600,color:'var(--text-2)'}}>Latest Calls</h2>
            <Link href="/alpha-calls" style={{fontSize:11,color:'var(--accent-text)'}}>View all →</Link>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {calls.slice(0, 8).map(call => {
              const pctMatch = call.content?.match(/\+?(-?[\d.]+)%/)
              const pct = pctMatch ? parseFloat(pctMatch[1]) : null
              const mcapMatch = call.content?.match(/MCap: \$?([\d,.]+[KMB]?)/)
              const mcap = mcapMatch ? mcapMatch[1] : null

              return (
                <Link key={call.id} href="/alpha-calls"
                  className="card"
                  style={{padding:'8px 10px',display:'flex',alignItems:'center',gap:8,transition:'border-color 60ms ease'}}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
                  <div className="avatar" style={{width:22,height:22,fontSize:9}}>
                    {(call.tokenName || '?')[0]}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--text-1)'}}>${call.tokenName}</span>
                      <span style={{fontSize:9,color:'var(--text-5)'}}>{call.chain}</span>
                    </div>
                    <p style={{fontSize:9,color:'var(--text-4)',marginTop:0}} className="truncate">
                      @{call.caller?.username || '?'}{mcap ? ` · ${mcap}` : ''}
                    </p>
                  </div>
                  {pct !== null && (
                    <span className="num" style={{
                      fontSize:11,fontWeight:600,
                      color: pct >= 0 ? 'var(--green)' : 'var(--red)'
                    }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Chain Distribution + Quick Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        {/* Chain distribution */}
        <div className="card" style={{padding:'12px 14px'}}>
          <p style={{fontSize:9,color:'var(--text-5)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,marginBottom:8}}>Chain Distribution</p>
          <DistBar segments={chainDist.slice(0, 5).map((c: any) => ({
            color: chainColors[c.chain] || 'var(--text-4)',
            pct: totalChain > 0 ? (c._count / totalChain) * 100 : 0
          }))} />
          <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
            {chainDist.slice(0, 5).map((c: any) => (
              <div key={c.chain} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:6,height:6,borderRadius:1,background:chainColors[c.chain] || 'var(--text-4)'}} />
                <span style={{fontSize:9,color:'var(--text-4)'}}>{c.chain}</span>
                <span className="num" style={{fontSize:9,color:'var(--text-3)'}}>{c._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div className="card" style={{padding:'12px 14px'}}>
          <p style={{fontSize:9,color:'var(--text-5)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,marginBottom:8}}>Sentiment</p>
          <DistBar segments={[
            { color: 'var(--green)', pct: totalSent > 0 ? (sentDist.find((s:any)=>s.sentiment==='bullish')?._count || 0) / totalSent * 100 : 0 },
            { color: 'var(--red)', pct: totalSent > 0 ? (sentDist.find((s:any)=>s.sentiment==='bearish')?._count || 0) / totalSent * 100 : 0 },
            { color: 'var(--text-4)', pct: totalSent > 0 ? (sentDist.find((s:any)=>s.sentiment==='neutral')?._count || 0) / totalSent * 100 : 0 },
          ]} />
          <div style={{display:'flex',gap:12,marginTop:8}}>
            {sentDist.map((s: any) => (
              <div key={s.sentiment} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:6,height:6,borderRadius:1,background:s.sentiment==='bullish'?'var(--green)':s.sentiment==='bearish'?'var(--red)':'var(--text-4)'}} />
                <span style={{fontSize:9,color:'var(--text-4)'}}>{s.sentiment}</span>
                <span className="num" style={{fontSize:9,color:'var(--text-3)'}}>{s._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {[
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12m-4-6h8"/></svg>, label: 'Tokens', href: '/discover/tokens' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, label: 'NFTs', href: '/discover/nfts' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>, label: 'Callers', href: '/callers' },
            { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, label: 'Targets', href: '/targets' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="card"
              style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:8,transition:'border-color 60ms ease'}}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
              <span style={{color:'var(--text-4)'}}>{item.icon}</span>
              <span style={{fontSize:11,fontWeight:500,color:'var(--text-2)'}}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
