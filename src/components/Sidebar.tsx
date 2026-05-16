'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { label: 'Overview', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Calls', href: '/alpha-calls' },
  { label: 'Callers', href: '/callers' },
  { section: 'Discover' },
  { label: 'Tokens', href: '/discover/tokens' },
  { label: 'NFTs', href: '/discover/nfts' },
  { label: 'NFT Intel', href: '/discover/nft-intel' },
  { section: 'System' },
  { label: 'Targets', href: '/targets' },
]

const icons: Record<string, React.ReactNode> = {
  Overview: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Projects: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4m0 0l9-4m-9 4v10"/></svg>,
  Calls: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Callers: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Tokens: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12m-4-6h8"/></svg>,
  NFTs: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  'NFT Intel': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z"/></svg>,
  Targets: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-3 left-3 z-50 md:hidden btn" style={{height:28,padding:'0 8px'}}>☰</button>
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:20,height:20,borderRadius:4,background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--text-1)',lineHeight:1.1}}>LavAlpha</div>
              <div style={{fontSize:9,color:'var(--text-5)',lineHeight:1.1,marginTop:1}}>Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if ('section' in item) return <div key={i} className="sidebar-section">{item.section}</div>
            const active = pathname === item.href
            return (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
                <span style={{width:16,display:'flex',alignItems:'center',justifyContent:'center',color:active?'var(--accent)':'var(--text-5)'}}>
                  {icons[item.label]}
                </span>
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--text-5)'}}>
            <div className="status-dot status-dot-green" />
            <span>Online</span>
          </div>
        </div>
      </aside>
    </>
  )
}
