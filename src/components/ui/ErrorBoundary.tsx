import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface Props {
  children: ReactNode;
  fallbackKey?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props & { t: (key: string, fallback?: string) => string }, State> {
  constructor(props: Props & { t: (key: string, fallback?: string) => string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="p-6 rounded-2xl bg-slate-900 border border-rose-800/50 text-slate-200 max-w-xl mx-auto my-8 space-y-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                {t('error_boundary_title', 'V tomto nástroji došlo k chybě')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('error_boundary_desc', 'Během práce s nástrojem nastala neočekávaná chyba. Můžete jej znovu načíst.')}
              </p>
              {this.state.error?.message && (
                <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-rose-300 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              )}
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('error_boundary_reload', 'Znovu načíst nástroj')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary: React.FC<Props> = props => {
  const { t } = useI18n();
  return <ErrorBoundaryInner {...props} t={t} />;
};
