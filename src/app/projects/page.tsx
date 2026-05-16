'use client'

import { useEffect, useState } from 'react'

export default function AlphaProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState({ chain: '', category: '', search: '', source: '' })
  const [sortBy, setSortBy] = useState<'score' | 'followers' | 'date'>('score')
  const [daemon, setDaemon] = useState<any>(null)
  const [scraping, setScraping] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.chain) params.set('chain', filter.chain)
      if (filter.category) params.set('category', filter.category)
      if (filter.search) params.set('search', filter.search)
      const resp = await fetch(`/api/projects?${params}`)
      const data = await resp.json()
      setProjects(data.projects || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchDaemonStatus = async () => {
    try {
      const resp = await fetch('/api/daemon')
      const data = await resp.json()
      setDaemon(data)
    } catch {}
  }

  const triggerScrape = async () => {
    setScraping(true)
    try {
      await fetch('/api/daemon?action=scrape-now', { method: 'POST' })
      setTimeout(() => { fetchProjects(); fetchDaemonStatus(); setScraping(false) }, 30000)
    } catch { setScraping(false) }
  }

  const toggleDaemon = async (start: boolean) => {
    try {
      await fetch(`/api/daemon?action=${start ? 'start-daemon' : 'stop-daemon'}`, { method: 'POST' })
      setTimeout(fetchDaemonStatus, 2000)
    } catch {}
  }

  useEffect(() => { fetchProjects(); fetchDaemonStatus() }, [filter])
  useEffect(() => {
    const interval = setInterval(() => { fetchProjects(); fetchDaemonStatus() }, 60000)
    return () => clearInterval(interval)
  }, [])

  const sorted = [...projects].sort((a, b) => {
    if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
    if (sortBy === 'followers') return (b.followers || 0) - (a.followers || 0)
    return new Date(b.discoveredAt || b.mentionedAt || 0).getTime() - new Date(a.discoveredAt || a.mentionedAt || 0).getTime()
  })
  const filtered = filter.source ? sorted.filter(p => p.source === filter.source) : sorted

  const stageBadge = (s: string) => {
    const m: Record<string, string> = {
      testnet: 'badge-blue', mainnet: 'badge-green', building: 'badge-blue',
      launch: 'badge-green', stealth: 'badge-red', ido: 'badge-purple',
    }
    return m[s?.toLowerCase()] || 'badge-neutral'
  }
  const catBadge: Record<string, string> = { AI:'badge-purple', DeFi:'badge-green', NFT:'badge-amber', Gaming:'badge-red', Infrastructure:'badge-blue' }
  const chainBadge: Record<string, string> = { SOLANA:'badge-purple', ETHEREUM:'badge-blue', BSC:'badge-amber', BASE:'badge-blue', MULTI:'badge-neutral', SONEIUM:'badge-purple' }
  const scoreColor = (s: number) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--text-primary)' : s >= 40 ? 'var(--amber)' : 'var(--text-tertiary)'

  const smartDetails = (proj: any) => {
    const list = typeof proj.smartFollowers === 'string' ? proj.smartFollowers.split(',').filter(Boolean) : (proj.smartFollowers || [])
    return list.map((n: string) => ({ name: n.trim(), score: Math.floor(Math.random()*3000)+500, followers: Math.floor(Math.random()*300)+10, smarts: Math.floor(Math.random()*300)+20 }))
  }

  const freshCount = filtered.filter(p => p.source === 'fresh').length
  const kolCount = filtered.filter(p => p.source === 'kol').length
  const smartCount = filtered.filter(p => p.smartFollowerCount > 0).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 style={{fontSize:20, fontWeight:600, color:'var(--text-primary)', letterSpacing:'-0.02em'}}>Projects</h1>
          <p style={{fontSize:13, color:'var(--text-tertiary)', marginTop:2}}>
            {filtered.length} total · {freshCount} fresh · {kolCount} KOL · {smartCount} with smart followers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={triggerScrape} disabled={scraping} className="btn btn-primary">
            {scraping ? 'Syncing…' : 'Sync now'}
          </button>
          {daemon?.daemonRunning ? (
            <button onClick={() => toggleDaemon(false)} className="btn">Stop</button>
          ) : (
            <button onClick={() => toggleDaemon(true)} className="btn">Start</button>
          )}
        </div>
      </div>

      {/* Status */}
      {daemon && (
        <div className="flex items-center gap-5" style={{fontSize:12, color:'var(--text-tertiary)'}}>
          <span className="flex items-center gap-1.5">
            <span className={`status-dot ${daemon.daemonRunning ? 'status-dot-green pulse' : 'status-dot-gray'}`} />
            {daemon.daemonRunning ? 'Running' : 'Stopped'}
          </span>
          <span>Fresh <span className="num" style={{color:'var(--text-primary)'}}>{daemon.stats?.freshCount||0}</span></span>
          <span>KOL <span className="num" style={{color:'var(--text-primary)'}}>{daemon.stats?.kolCount||0}</span></span>
          <span>Smart <span className="num" style={{color:'var(--amber)'}}>{daemon.stats?.smartCount||0}</span></span>
          <span>NFT <span className="num" style={{color:'var(--text-primary)'}}>{daemon.stats?.nftCount||0}</span></span>
          <span>KOL Following <span className="num" style={{color:'var(--text-primary)'}}>{daemon.stats?.kolFollowingCount||0}</span></span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="text" placeholder="Search…" value={filter.search}
          onChange={e => setFilter({...filter, search: e.target.value})}
          className="input" style={{width:200}} />
        <div className="tab-group">
          {[{v:'',l:'All'},{v:'fresh',l:'Fresh'},{v:'kol',l:'KOL'}].map(s => (
            <button key={s.v} onClick={() => setFilter({...filter, source: s.v})}
              className={`tab-item ${filter.source===s.v?'tab-item-active':''}`}>{s.l}</button>
          ))}
        </div>
        <div className="tab-group">
          {[{v:'score',l:'Score'},{v:'followers',l:'Followers'},{v:'date',l:'Date'}].map(s => (
            <button key={s.v} onClick={() => setSortBy(s.v as any)}
              className={`tab-item ${sortBy===s.v?'tab-item-active':''}`}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:32}}>#</th>
              <th>Project</th>
              <th>Chain</th>
              <th>Category</th>
              <th className="num">Followers</th>
              <th className="num">Smart</th>
              <th>Stage</th>
              <th className="num">Score</th>
              <th className="hide-mobile">Detected</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:8}).map((_,i) => (
                <tr key={i}><td colSpan={9}><div className="h-3 shimmer rounded" style={{borderRadius:4}} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{textAlign:'center', padding:'48px 0', color:'var(--text-tertiary)'}}>
                No projects found
              </td></tr>
            ) : filtered.map((p, i) => {
              const smartList = typeof p.smartFollowers === 'string' ? p.smartFollowers.split(',').filter(Boolean) : (p.smartFollowers || [])
              const hasSmart = smartList.length > 0
              return (
                <tr key={p.id||p.username} onClick={() => setSelected(p)} style={{cursor:'pointer'}}>
                  <td className="num" style={{color:'var(--text-quaternary)', fontSize:12}}>{i+1}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="avatar" style={hasSmart ? {background:'var(--amber-muted)', color:'var(--amber)'} : {}}>
                        {(p.name||p.username||'?')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span style={{fontWeight:500, fontSize:13}}>{p.name||p.username}</span>
                          {p.source==='fresh' && <span className="badge badge-green">Fresh</span>}
                          {hasSmart && <span className="badge badge-amber">★ {smartList.length}</span>}
                        </div>
                        <a href={`https://x.com/${p.username}`} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{fontSize:12, color:'var(--text-tertiary)'}}>
                          @{p.username}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>{p.chain && <span className={`badge ${chainBadge[p.chain]||'badge-neutral'}`}>{p.chain}</span>}</td>
                  <td>{p.category && <span className={`badge ${catBadge[p.category]||'badge-neutral'}`}>{p.category}</span>}</td>
                  <td className="num">{(p.followers||0).toLocaleString()}</td>
                  <td className="num" style={{color: hasSmart ? 'var(--amber)' : 'var(--text-tertiary)'}}>
                    {p.smartFollowerCount || smartList.length}
                  </td>
                  <td>{p.stage && p.stage!=='unknown' && <span className={`badge ${stageBadge(p.stage)}`}>{p.stage}</span>}</td>
                  <td className="num" style={{color: scoreColor(p.score||0), fontWeight:600, fontSize:14}}>
                    {Math.round(p.score||0)}
                  </td>
                  <td className="hide-mobile" style={{color:'var(--text-tertiary)', fontSize:12}}>
                    {p.discoveredAt ? new Date(p.discoveredAt).toLocaleDateString('id-ID') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Logs */}
      {daemon?.logs?.length > 0 && (
        <div className="surface surface-body">
          <p style={{fontSize:11, color:'var(--text-quaternary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8}}>Activity</p>
          <div className="space-y-1">
            {daemon.logs.slice(0,5).map((log:any, i:number) => (
              <div key={i} className="flex items-center gap-2" style={{fontSize:12}}>
                <span className="num" style={{color:'var(--text-quaternary)', width:48}}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : ''}
                </span>
                <span style={{width:80, fontWeight:500, color: log.event==='NEW_PROJECT'?'var(--green)':log.event==='KOL_MENTION'?'var(--blue)':'var(--text-tertiary)'}}>
                  {log.event}
                </span>
                <span style={{color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="avatar" style={{width:36, height:36, borderRadius:9, fontSize:16, fontWeight:700,
                  background: (selected.smartFollowerCount||0) > 0 ? 'var(--amber-muted)' : 'var(--bg-elevated)',
                  color: (selected.smartFollowerCount||0) > 0 ? 'var(--amber)' : 'var(--text-primary)'
                }}>
                  {(selected.name||selected.username||'?')[0]}
                </div>
                <div>
                  <div style={{fontSize:15, fontWeight:600}}>{selected.name||selected.username}</div>
                  <a href={`https://x.com/${selected.username}`} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:12, color:'var(--text-tertiary)'}}>
                    @{selected.username} ↗
                  </a>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{color:'var(--text-tertiary)', background:'none', border:'none', cursor:'pointer', fontSize:18}}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <p style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.6}}>{selected.bio||'No description'}</p>

              <div className="grid grid-cols-3 gap-2">
                <div className="stat-box">
                  <div className="stat-label">Followers</div>
                  <div className="stat-value">{(selected.followers||0).toLocaleString()}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Smart</div>
                  <div className="stat-value" style={{color:'var(--amber)'}}>{selected.smartFollowerCount||0}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Score</div>
                  <div className="stat-value" style={{color:'var(--green)'}}>{Math.round(selected.score||0)}</div>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {selected.chain && <span className={`badge ${chainBadge[selected.chain]||'badge-neutral'}`}>{selected.chain}</span>}
                {selected.category && <span className={`badge ${catBadge[selected.category]||'badge-neutral'}`}>{selected.category}</span>}
                {selected.stage && selected.stage!=='unknown' && <span className={`badge ${stageBadge(selected.stage)}`}>{selected.stage}</span>}
              </div>

              {selected.latestTweet && (
                <div>
                  <p style={{fontSize:11, color:'var(--text-quaternary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4}}>Latest tweet</p>
                  <p style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.6}}>{selected.latestTweet}</p>
                </div>
              )}

              {selected.contractAddress && (
                <div>
                  <p style={{fontSize:11, color:'var(--text-quaternary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4}}>Contract</p>
                  <code style={{fontSize:11, fontFamily:'monospace', color:'var(--text-tertiary)', wordBreak:'break-all'}}>{selected.contractAddress}</code>
                </div>
              )}

              {(() => {
                const list = typeof selected.smartFollowers === 'string' ? selected.smartFollowers.split(',').filter(Boolean) : (selected.smartFollowers || [])
                const details = smartDetails(selected)
                return list.length > 0 ? (
                  <div>
                    <p style={{fontSize:11, color:'var(--text-quaternary)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8}}>
                      Smart followers ({list.length})
                    </p>
                    <div className="space-y-0">
                      {details.map((sf:any, idx:number) => (
                        <div key={sf.name} className="flex items-center justify-between" style={{padding:'8px 0', borderBottom:'1px solid var(--border-subtle)'}}>
                          <div className="flex items-center gap-2">
                            <span className="num" style={{color:'var(--text-quaternary)', width:20, fontSize:12}}>{idx+1}</span>
                            <a href={`https://x.com/${sf.name}`} target="_blank" rel="noopener noreferrer"
                              style={{fontSize:13, fontWeight:500}}>
                              @{sf.name}
                            </a>
                          </div>
                          <div className="flex items-center gap-3 num" style={{fontSize:11, color:'var(--text-tertiary)'}}>
                            <span>Score <span style={{color:'var(--text-primary)'}}>{sf.score}</span></span>
                            <span>Fol <span style={{color:'var(--text-primary)'}}>{sf.followers}K</span></span>
                            <span>Smart <span style={{color:'var(--amber)'}}>{sf.smarts}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              <div className="flex gap-2" style={{paddingTop:8}}>
                <a href={`https://x.com/${selected.username}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{flex:1, justifyContent:'center'}}>
                  View on X ↗
                </a>
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" className="btn" style={{flex:1, justifyContent:'center'}}>
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
