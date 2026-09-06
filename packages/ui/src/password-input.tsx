import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "./input";

export type PasswordInputProps = Omit<InputProps, "type" | "rightIcon">;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <Input
        type={showPassword ? "text" : "password"}
        ref={ref}
        disabled={disabled}
        className={className}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            className="text-muted hover:text-primary transition-colors focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";
