import * as React from "react";
import { Label } from "./label";
import { cn } from "./utils";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  error,
  helperText,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-[11px] font-medium text-danger tracking-wide animate-in fade-in-0 duration-100">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-[11px] text-muted tracking-wide">{helperText}</p>
      )}
    </div>
  );
};
