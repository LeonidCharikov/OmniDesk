export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastService {
  private toasts: ToastItem[] = [];
  private listeners = new Set<ToastListener>();
  private counter = 1;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = [...this.toasts];
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  show(options: { type?: ToastType; title: string; message?: string; durationMs?: number }): string {
    const id = `toast-${this.counter++}`;
    const durationMs = options.durationMs ?? 3200;
    const item: ToastItem = {
      id,
      type: options.type ?? 'info',
      title: options.title,
      message: options.message,
      durationMs,
    };

    this.toasts = [...this.toasts.slice(-2), item];
    this.emit();

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }

    return id;
  }

  dismiss(id: string): void {
    const next = this.toasts.filter(t => t.id !== id);
    if (next.length !== this.toasts.length) {
      this.toasts = next;
      this.emit();
    }
  }
}

export const toastService = new ToastService();
