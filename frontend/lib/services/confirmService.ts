type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

let confirmFn: ConfirmFn | null = null;

export const registerConfirmDialog = (fn: ConfirmFn) => {
  confirmFn = fn;
};

export const confirmDialog = async (options: ConfirmOptions): Promise<boolean> => {
  if (confirmFn) {
    return confirmFn(options);
  }
  // Fallback to native window.confirm if component not mounted yet (or during SSR)
  if (typeof window !== 'undefined') {
    return window.confirm(options.title ? `${options.title}\n\n${options.message}` : options.message);
  }
  return false;
};
