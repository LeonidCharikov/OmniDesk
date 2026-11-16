import React, { useState, useId } from 'react';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { SecurityConfig } from '../../types/tool';
import { verifyMasterKey } from '../../services/securityService';
import { useI18n } from '../../i18n/context';

interface LockScreenProps {
  security: SecurityConfig;
  onUnlock: () => void;
  onFactoryReset: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  security,
  onUnlock,
  onFactoryReset,
}) => {
  const { t } = useI18n();
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const inputId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase || !security.pinHash || !security.pinSalt) {
      setError(t('lock_enter_passphrase', 'Please enter your passphrase or PIN.'));
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      const valid = await verifyMasterKey(passphrase, security.pinHash, security.pinSalt);
      if (valid) {
        setPassphrase('');
        onUnlock();
      } else {
        setError(t('lock_invalid_passphrase', 'Incorrect passphrase or PIN.'));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t('lock_screen_title', 'OmniDesk Locked')}
            </h1>
            <p className="text-xs text-slate-400">
              {t('lock_screen_subtitle', 'Enter your local master PIN or passphrase to unlock your workspace.')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-xs font-medium text-slate-300 block">
              {t('lock_passphrase_label', 'Master PIN / Passphrase')}
            </label>
            <div className="relative">
              <input
                id={inputId}
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={e => {
                  setPassphrase(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                placeholder={t('lock_passphrase_placeholder', 'Enter PIN or passphrase...')}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-sm text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                aria-label={showPassphrase ? t('hide', 'Hide') : t('show', 'Show')}
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {security.securityHint && (
            <p className="text-xs text-slate-400">
              <span className="text-slate-500">{t('lock_hint_prefix', 'Hint')}:</span> {security.securityHint}
            </p>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || !passphrase}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? t('lock_verifying', 'Verifying...') : t('lock_unlock_btn', 'Unlock Workspace')}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{t('lock_pbkdf2_note', 'PBKDF2-SHA256 local verification')}</span>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-slate-400 hover:text-rose-400 transition-colors"
            >
              {t('lock_forgot_reset', 'Forgot PIN? Reset')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={onFactoryReset}
                className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                {t('lock_confirm_reset', 'Confirm Reset')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
