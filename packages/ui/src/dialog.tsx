import * as React from "react";
import { X } from "lucide-react";
import { cn } from "./utils";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children, className }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-subtle bg-surface-elevated p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-primary ring-1 ring-black/5 dark:ring-white/10",
          className
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg text-muted hover:text-primary transition-colors p-1.5 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-left pb-3 mb-4 border-b border-subtle/80", className)} {...props} />
);

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn("text-base font-bold leading-tight tracking-tight text-primary", className)} {...props} />
);

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn("text-xs text-secondary leading-relaxed", className)} {...props} />
);

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-subtle/80", className)} {...props} />
);

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("space-y-4", className)} {...props} />
);
