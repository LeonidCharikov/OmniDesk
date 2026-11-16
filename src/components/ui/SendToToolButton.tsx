import React, { useEffect, useRef, useState } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { PIPE_TARGET_OPTIONS, setPendingToolPipe } from '../../services/toolPipeService';
import { toastService } from '../../services/toastService';
import { useI18n } from '../../i18n/context';

interface SendToToolButtonProps {
  sourceToolId: string;
  kind?: 'text' | 'color';
  getText?: () => string;
  getColorHex?: () => string;
  disabled?: boolean;
}

export const SendToToolButton: React.FC<SendToToolButtonProps> = ({
  sourceToolId,
  kind = 'text',
  getText,
  getColorHex,
  disabled = false,
}) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const targets = PIPE_TARGET_OPTIONS.filter(
    opt => opt.acceptedKinds.includes(kind) && opt.toolId !== sourceToolId
  );

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSend = (targetToolId: string, targetLabel: string) => {
    if (kind === 'color') {
      const hex = (getColorHex?.() || '').trim();
      if (!hex) {
        toastService.show({
          type: 'warning',
          title: t('pipe_empty_warning', 'Nothing to send yet'),
        });
        setOpen(false);
        return;
      }
      setPendingToolPipe(targetToolId, {
        kind: 'color',
        colorHex: hex,
        sourceToolId,
      });
    } else {
      const text = getText?.() || '';
      if (!text.trim()) {
        toastService.show({
          type: 'warning',
          title: t('pipe_empty_warning', 'Nothing to send yet'),
        });
        setOpen(false);
        return;
      }
      setPendingToolPipe(targetToolId, {
        kind: 'text',
        text,
        sourceToolId,
      });
    }

    setOpen(false);
    window.dispatchEvent(new CustomEvent('omnidesk-open-tool', { detail: { toolId: targetToolId } }));
    toastService.show({
      type: 'success',
      title: t('pipe_sent_toast', 'Sent to {tool}', { tool: targetLabel }),
    });
  };

  if (targets.length === 0) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
      >
        <Send className="w-3.5 h-3.5 text-indigo-400" />
        <span>{t('send_to_tool_btn', 'Send to...')}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-40 py-1 max-h-64 overflow-y-auto">
          {targets.map(opt => {
            const label = t(opt.labelKey, opt.defaultLabel);
            return (
              <button
                key={opt.toolId}
                type="button"
                onClick={() => handleSend(opt.toolId, label)}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors truncate"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
