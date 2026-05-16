'use client'

import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose'
  trend?: { value: string; positive: boolean }
}

export default function StatsCard({ title, value, subtitle, icon, variant = 'cyan', trend }: StatsCardProps) {
  const variants = { cyan: 'stat-cyan', emerald: 'stat-emerald', amber: 'stat-amber', rose: 'stat-rose' }
  const iconColors = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
  }

  return (
    <div className={`card ${variants[variant]} p-5 transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconColors[variant]} transition-colors`}>{icon}</div>
        {trend && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${trend.positive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-[28px] font-bold text-white tracking-tight leading-none">{value}</p>
      <p className="text-[11px] text-zinc-500 mt-2 uppercase tracking-wider font-medium">{title}</p>
      {subtitle && <p className="text-[11px] text-zinc-600 mt-1">{subtitle}</p>}
    </div>
  )
}
