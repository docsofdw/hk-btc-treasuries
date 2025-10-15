import * as React from "react"

type BadgeKind = 'verified' | 'stale' | 'active' | 'holder' | 'source'
type BadgeVariant = 'default' | 'outline' | 'secondary' | 'destructive'

interface BadgeProps {
  kind?: BadgeKind
  variant?: BadgeVariant
  children: React.ReactNode
  title?: string
  className?: string
}

const badgeStyles: Record<BadgeKind, string> = {
  verified: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  stale: 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200',
  active: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
  holder: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
  source: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-900',
  outline: 'border border-slate-200 bg-transparent',
  secondary: 'bg-slate-100 text-slate-900',
  destructive: 'bg-red-100 text-red-900',
}

export function Badge({ kind, variant, children, title, className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 rounded-md text-xs px-2 py-1'
  const kindClasses = kind ? badgeStyles[kind] : ''
  const variantClasses = variant ? variantStyles[variant] : ''
  
  return (
    <span 
      className={`${baseClasses} ${kindClasses} ${variantClasses} ${className || ''}`}
      title={title}
    >
      {children}
    </span>
  )
}

export default Badge
