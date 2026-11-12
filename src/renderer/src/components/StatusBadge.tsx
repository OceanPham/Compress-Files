import React from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  PauseCircle,
  ShieldCheck,
  Target,
  XCircle
} from 'lucide-react'
import { JobStatus } from '@shared/types'
import { VI_STRINGS } from '../i18n/vi'

interface StatusBadgeProps {
  status: JobStatus
  compact?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, compact = false }) => {
  const info = VI_STRINGS.statuses[status] || {
    label: status,
    desc: ''
  }

  const styleMap: Record<
    JobStatus,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    queued: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />
    },
    probing: {
      bg: 'bg-sky-50 dark:bg-sky-950/60',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-300 dark:border-sky-800',
      icon: <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
    },
    running: {
      bg: 'bg-blue-50 dark:bg-blue-950/70',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-800',
      icon: <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
    },
    validating: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/70',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-300 dark:border-indigo-800',
      icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0 animate-pulse" />
    },
    completed: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
    },
    no_savings: {
      bg: 'bg-teal-50 dark:bg-teal-950/60',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-300 dark:border-teal-800',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />
    },
    converted_not_smaller: {
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />
    },
    target_unmet: {
      bg: 'bg-orange-50 dark:bg-orange-950/60',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-800',
      icon: <Target className="w-3.5 h-3.5 shrink-0" />
    },
    failed: {
      bg: 'bg-rose-50 dark:bg-rose-950/60',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />
    },
    cancelled: {
      bg: 'bg-slate-100 dark:bg-slate-800/80',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-300 dark:border-slate-700',
      icon: <Ban className="w-3.5 h-3.5 shrink-0" />
    },
    interrupted: {
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      icon: <PauseCircle className="w-3.5 h-3.5 shrink-0" />
    },
    unsupported: {
      bg: 'bg-purple-50 dark:bg-purple-950/60',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-800',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
    }
  }

  const s = styleMap[status] || styleMap.queued

  return (
    <span
      title={info.desc}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
      } ${s.bg} ${s.text} ${s.border}`}
    >
      {s.icon}
      <span className="truncate">{info.label}</span>
    </span>
  )
}
