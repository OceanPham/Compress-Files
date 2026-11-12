import { ChevronRight, Code2 } from 'lucide-react'
import { APP_BRANDING } from '@shared/branding'

interface AuthorCreditProps {
  onOpenAbout: () => void
}

export function AuthorCredit({ onOpenAbout }: AuthorCreditProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpenAbout}
      aria-label={`Giới thiệu ${APP_BRANDING.author} và liên hệ ${APP_BRANDING.organization}`}
      className="group w-full rounded-lg border border-slate-700/70 bg-slate-800/40 p-3 text-left transition hover:border-sky-500/60 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      <span className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        <Code2 aria-hidden="true" className="h-3.5 w-3.5 text-sky-400" />
        Phát triển bởi
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-slate-100">{APP_BRANDING.author}</span>
          <span className="mt-0.5 block text-[11px] text-sky-300">{APP_BRANDING.organization}</span>
        </span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-sky-300" />
      </span>
    </button>
  )
}
