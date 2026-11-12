import { useState } from 'react'
import { Code2, Copy, ExternalLink, Globe, MessageCircle } from 'lucide-react'
import { APP_BRANDING, type SupportLink } from '@shared/branding'

interface AboutCardProps {
  appVersion: string
}

export function AboutCard({ appVersion }: AboutCardProps): JSX.Element {
  const [pendingAction, setPendingAction] = useState<SupportLink | 'copy' | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null)

  const handleAction = async (action: SupportLink | 'copy'): Promise<void> => {
    setPendingAction(action)
    setFeedback(null)
    try {
      const result = action === 'copy'
        ? await window.compressorApi.copySupportPhone()
        : await window.compressorApi.openSupportLink(action)
      if (!result.ok) throw new Error(result.error)
      setFeedback({
        message: action === 'copy'
          ? `Đã sao chép số Zalo ${APP_BRANDING.supportPhone}.`
          : 'Đã mở liên kết bằng trình duyệt mặc định.',
        isError: false
      })
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : 'Không thể thực hiện. Vui lòng thử lại.',
        isError: true
      })
    } finally {
      setPendingAction(null)
    }
  }

  const actionClassName = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:border-sky-600 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900'

  return (
    <section aria-labelledby="about-contact-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div aria-hidden="true" className="h-1 bg-gradient-to-r from-sky-500 to-emerald-400" />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="about-contact-heading" tabIndex={-1} className="flex items-center gap-2 text-sm font-bold focus:outline-none">
              <Code2 aria-hidden="true" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Giới thiệu & Liên hệ
            </h2>
            <p className="mt-2 text-base font-bold">File Compressor</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Phát triển bởi <strong className="font-semibold text-slate-900 dark:text-slate-100">{APP_BRANDING.author}</strong>
              {' · '}{APP_BRANDING.organization}
            </p>
          </div>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            Phiên bản {appVersion}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Công cụ nén ảnh, video, PDF và tạo ZIP/7z trên máy tính. Gửi góp ý hoặc liên hệ hỗ trợ qua các kênh bên dưới.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <Globe aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Website</p>
                <p className="break-words text-xs font-semibold">{APP_BRANDING.websiteLabel}</p>
              </div>
            </div>
            <button type="button" disabled={pendingAction !== null} onClick={() => void handleAction('website')} className={actionClassName}>
              Website {APP_BRANDING.organization}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Zalo hỗ trợ</p>
                <p className="text-xs font-semibold tabular-nums">{APP_BRANDING.supportPhone}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pendingAction !== null} onClick={() => void handleAction('zalo')} className={actionClassName}>
                Liên hệ Zalo
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={pendingAction !== null} onClick={() => void handleAction('copy')} aria-label="Sao chép số Zalo" title="Sao chép số Zalo" className={actionClassName}>
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <p role="status" aria-live="polite" className={`min-h-4 text-[11px] ${feedback?.isError ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {feedback?.message || 'Các liên kết được mở trong trình duyệt mặc định của bạn.'}
        </p>
      </div>
    </section>
  )
}
