import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { resetPasswordConfirmSchema } from "@inventra/validation";
import { useAuthStore } from "../../stores/authStore";
import { Button, PasswordInput, FormField, Alert } from "@inventra/ui";

interface ResetPasswordFormValues {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const { confirmPasswordReset } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordConfirmSchema),
    defaultValues: {
      token: token,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await confirmPasswordReset({ token: data.token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Password reset token is invalid or has expired.");
    }
  };

  if (!token && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-app text-primary">
        <div className="w-full max-w-md bg-surface rounded-lg border border-subtle p-8 shadow-card space-y-4 text-center">
          <h3 className="text-lg font-bold text-danger">Missing Reset Token</h3>
          <p className="text-xs text-secondary">
            This password reset link is incomplete or missing a valid token. Please request a new recovery link.
          </p>
          <Link to="/forgot-password" className="block pt-2">
            <Button size="md" className="w-full">
              Request New Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-app text-primary">
      <div className="w-full max-w-md bg-surface rounded-lg border border-subtle p-8 shadow-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center font-bold text-base text-primary-fg">
            IN
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Inventra ERP</h2>
            <p className="text-[11px] text-secondary font-medium">Create New Password</p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4 animate-in fade-in-50 text-center">
            <div className="rounded-md bg-success-subtle border border-success-border p-4 text-success-fg space-y-2">
              <div className="flex items-center justify-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Password Updated Successfully</span>
              </div>
              <p className="text-xs leading-relaxed">
                Your credentials have been updated. Redirecting to sign in screen...
              </p>
            </div>
            <Link to="/login" className="block">
              <Button size="md" className="w-full">
                Sign In Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-primary">Set New Password</h3>
              <p className="text-xs text-secondary">
                Choose a strong password with at least 8 characters, one number, and one symbol.
              </p>
            </div>

            {serverError && (
              <Alert variant="danger" onDismiss={() => setServerError(null)}>
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <input type="hidden" {...register("token")} />

              <FormField
                label="New Password"
                htmlFor="newPassword"
                required
                error={errors.newPassword?.message}
              >
                <PasswordInput
                  id="newPassword"
                  placeholder="Min 8 characters"
                  autoFocus
                  disabled={isSubmitting}
                  error={Boolean(errors.newPassword)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  {...register("newPassword")}
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                htmlFor="confirmPassword"
                required
                error={errors.confirmPassword?.message}
              >
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Re-enter new password"
                  disabled={isSubmitting}
                  error={Boolean(errors.confirmPassword)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  {...register("confirmPassword")}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                Save New Password & Enter
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel & Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
