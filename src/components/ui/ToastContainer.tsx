import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { ToastItem, toastService } from '../../services/toastService';
import { useI18n } from '../../i18n/context';

export const ToastContainer: React.FC = () => {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastService.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map(item => {
        const style =
          item.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
            : item.type === 'warning'
            ? 'bg-amber-950/95 border-amber-500/40 text-amber-100'
            : item.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/40 text-rose-100'
            : 'bg-slate-900/95 border-slate-700 text-slate-100';

        const Icon =
          item.type === 'success'
            ? CheckCircle2
            : item.type === 'warning'
            ? AlertTriangle
            : item.type === 'error'
            ? XCircle
            : Info;

        const iconColor =
          item.type === 'success'
            ? 'text-emerald-400'
            : item.type === 'warning'
            ? 'text-amber-400'
            : item.type === 'error'
            ? 'text-rose-400'
            : 'text-indigo-400';

        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-2.5 animate-fade-in ${style}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-snug">{item.title}</p>
              {item.message && (
                <p className="text-[11px] opacity-85 mt-0.5 leading-snug break-words">{item.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => toastService.dismiss(item.id)}
              aria-label={t('close', 'Close')}
              className="p-0.5 rounded text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
