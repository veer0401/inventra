import * as React from "react";
import { cn } from "./utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-xs font-semibold text-secondary select-none tracking-wide",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-danger font-bold">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";
