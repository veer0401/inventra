import * as React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "./utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  show: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let toastGlobal: ToastContextValue | null = null;

export const toast = {
  success: (message: string, title?: string) => toastGlobal?.success(message, title),
  error: (message: string, title?: string) => toastGlobal?.error(message, title),
  warning: (message: string, title?: string) => toastGlobal?.warning(message, title),
  info: (message: string, title?: string) => toastGlobal?.info(message, title),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, message, title };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismiss(id);
      }, 5000);
    },
    [dismiss]
  );

  const value = React.useMemo(
    () => ({
      show,
      success: (msg: string, title?: string) => show("success", msg, title),
      error: (msg: string, title?: string) => show("error", msg, title),
      warning: (msg: string, title?: string) => show("warning", msg, title),
      info: (msg: string, title?: string) => show("info", msg, title),
      dismiss,
    }),
    [show, dismiss]
  );

  React.useEffect(() => {
    toastGlobal = value;
    return () => {
      toastGlobal = null;
    };
  }, [value]);

  const iconMap = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />,
  };

  const styleMap = {
    success: "bg-white border-emerald-300 text-slate-900 shadow-modal",
    error: "bg-white border-rose-300 text-slate-900 shadow-modal",
    warning: "bg-white border-amber-300 text-slate-900 shadow-modal",
    info: "bg-white border-sky-300 text-slate-900 shadow-modal",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-lg text-xs animate-in slide-in-from-bottom-5 duration-200 transition-all",
              styleMap[item.type]
            )}
          >
            {iconMap[item.type]}
            <div className="flex-1 space-y-0.5">
              {item.title && <p className="font-semibold text-xs text-slate-900">{item.title}</p>}
              <p className="text-slate-600 leading-normal">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-sm"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
