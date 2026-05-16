'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { label: 'Overview', href: '/', icon: '○' },
  { label: 'Projects', href: '/projects', icon: '○' },
  { label: 'Calls', href: '/alpha-calls', icon: '○' },
  { label: 'Callers', href: '/callers', icon: '○' },
  { section: 'Discover' },
  { label: 'Tokens', href: '/discover/tokens', icon: '○' },
  { label: 'NFTs', href: '/discover/nfts', icon: '○' },
  { label: 'NFT Intel', href: '/discover/nft-intel', icon: '○' },
  { section: 'System' },
  { label: 'Targets', href: '/targets', icon: '○' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 md:hidden btn">☰</button>
      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--accent)', color:'var(--bg-base)'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{color:'var(--text-primary)'}}>Alpha Tracker</div>
              <div className="text-[11px]" style={{color:'var(--text-tertiary)'}}>Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if ('section' in item) {
              return <div key={i} className="sidebar-section">{item.section}</div>
            }
            const active = pathname === item.href
            return (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center gap-2 text-[11px]" style={{color:'var(--text-tertiary)'}}>
            <div className="status-dot status-dot-green" />
            <span>Online</span>
          </div>
        </div>
      </aside>
    </>
  )
}
