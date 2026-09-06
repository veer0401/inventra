import { useEffect } from "react";
import type { UseFormHandleSubmit, FieldValues } from "react-hook-form";

export interface UseFormShortcutOptions<T extends FieldValues> {
  handleSubmit: UseFormHandleSubmit<T>;
  onSubmit: (data: T) => void | Promise<void>;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  formId?: string;
}

export function useFormShortcut<T extends FieldValues>({
  handleSubmit,
  onSubmit,
  isSubmitting = false,
  isDisabled = false,
  formId,
}: UseFormShortcutOptions<T>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Listen for Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); // Stop native browser "Save As..." dialog

        if (isDisabled || isSubmitting) {
          return;
        }

        // If formId is specified, check if activeElement is inside this form or form is active
        if (formId) {
          const formElement = document.getElementById(formId);
          if (formElement && !formElement.contains(document.activeElement)) {
            // Optional check: still allowed if modal is open
          }
        }

        handleSubmit(
          async (data) => {
            await onSubmit(data);
          },
          (errors) => {
            // Validation failed: focus first invalid field automatically
            const firstErrorKey = Object.keys(errors)[0];
            if (firstErrorKey) {
              const fieldEl = document.querySelector<HTMLElement>(
                `[name="${firstErrorKey}"], #${firstErrorKey}`
              );
              if (fieldEl) {
                fieldEl.focus();
              }
            }
          }
        )();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSubmit, onSubmit, isSubmitting, isDisabled, formId]);
}
