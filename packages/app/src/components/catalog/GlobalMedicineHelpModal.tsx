import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Globe,
  Plus,
  DollarSign,
  Send,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@inventra/ui";

export interface GlobalMedicineHelpModalProps {
  /** Optional custom trigger. If not provided, a default (?) icon button is rendered. */
  trigger?: React.ReactNode;
  /** Direct controlled open state if managing externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Role context: 'store' or 'admin' */
  mode?: "store" | "admin";
}

export const GlobalMedicineHelpModal: React.FC<GlobalMedicineHelpModalProps> = ({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  mode = "store",
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(val);
    } else {
      setInternalOpen(val);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer inline-flex">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-subtle bg-surface hover:bg-surface-subtle text-secondary hover:text-primary transition-colors cursor-pointer shadow-xs"
          title="How does this work? (Quick Guide)"
          aria-label="How does this work?"
        >
          <HelpCircle className="h-4 w-4 text-primary" />
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-primary">
                {mode === "admin"
                  ? "Admin Guide: Global Medicine Master & Curation"
                  : "How Global Medicines Work (Quick Guide)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-secondary mt-0.5">
                Understand in 60 seconds how shared formulations save time while keeping your store prices completely private.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {/* Concept 1: What is it? */}
          <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-2">
            <div className="flex items-center gap-2 font-semibold text-primary text-sm">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              1. What is the Global Medicine Database?
            </div>
            <p className="text-secondary leading-relaxed">
              Think of it as a <strong>verified national medicine library</strong>. Instead of typing the brand name, active salt, packaging, and government GST tax slab for every medicine, you simply pick from this pre-verified list.
            </p>
          </div>

          {/* Concept 2: 1-Click Store Add */}
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
              <Plus className="h-4 w-4 shrink-0" />
              2. Fast 1-Click Addition (No Annoying Popups)
            </div>
            <p className="text-secondary leading-relaxed">
              When you click <strong className="text-emerald-600 font-semibold">"Add to Store"</strong> in the directory, the medicine is instantly copied into your private pharmacy catalog with all standard formulation details. <strong>No form will pop up to slow you down.</strong>
            </p>
          </div>

          {/* Concept 3: Why No Prices in Global? */}
          <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 text-sm">
              <DollarSign className="h-4 w-4 shrink-0" />
              3. Why doesn't the Global Database include prices or stock?
            </div>
            <p className="text-secondary leading-relaxed">
              Every pharmacy buys from different distributors at different rates and sells at different profit margins. The Global Database only provides <strong>standard formulation specs</strong>. Your <strong>purchase costs, selling prices, MRP, and stock batches remain 100% private to your store</strong> and are set when you receive inventory.
            </p>
          </div>

          {/* Concept 4: Custom Medicines & Silent Suggestions */}
          <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400 text-sm">
              <Send className="h-4 w-4 shrink-0" />
              4. What if a medicine is not in the Global list?
            </div>
            <p className="text-secondary leading-relaxed">
              You can create any custom medicine manually at any time! It is saved to your store immediately. Behind the scenes, a copy is quietly submitted to our platform pharmacists for verification. If approved, it is added to the national library so other pharmacies can benefit too.
            </p>
          </div>

          {/* Guide Page Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary text-xs">
                Need a deeper field-by-field dictionary & FAQ?
              </span>
            </div>
            <Link
              to="/catalog/global/guide"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View Full Guide <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <DialogFooter>
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
            Got it, thanks!
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};
