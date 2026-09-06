import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
import { resetPasswordConfirmSchema } from "@inventra/validation";
import { useAuthStore } from "../../stores/authStore";
import { Button, PasswordInput, FormField, Alert, Badge } from "@inventra/ui";
import { BrandLogo } from "../../components/common/BrandLogo";

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-app text-primary font-sans selection:bg-primary selection:text-white">
      {/* Left Clinical Branding Panel */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-surface p-8 lg:p-12 flex-col justify-between border-r border-subtle relative overflow-hidden">
        {/* Background Subtle Gradient Accents */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary-subtle rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent-subtle rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <BrandLogo size="lg" showText subtitle="Enterprise Pharmacy ERP" />
        </div>

        {/* Operational Highlights */}
        <div className="relative z-10 space-y-6 my-auto py-8">
          <div className="space-y-2">
            <Badge variant="accent">
              Credential Vault
            </Badge>
            <h2 className="text-2xl lg:text-3xl font-semibold text-primary tracking-tight leading-snug">
              Secure Credential Update & Vault Synchronization.
            </h2>
            <p className="text-sm text-secondary leading-relaxed">
              Passwords are salted and hashed using Argon2id with strict computational difficulty constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Argon2id Hash Hardening</h4>
                <p className="text-[11px] text-secondary">Defense against offline GPU rainbow table attacks and side-channel leakage.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <KeyRound className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Active Device Termination</h4>
                <p className="text-[11px] text-secondary">All old JWT sessions and refresh tokens are immediately purged across devices.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted border-t border-subtle pt-4">
          <span>PostgreSQL 17 • Spring Boot 4.1.1</span>
          <div className="flex items-center gap-1.5 text-success">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Encrypted Vault</span>
          </div>
        </div>
      </div>

      {/* Right Reset Action Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-app text-primary">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2.5 mb-2">
            <BrandLogo size="md" showText subtitle="Password Reset" />
          </div>

          {!token && !success ? (
            <div className="space-y-6 text-center">
              <div className="rounded-xl bg-danger-subtle border border-danger-border p-6 text-danger-fg space-y-3">
                <h3 className="text-base font-bold text-danger">Missing or Invalid Token</h3>
                <p className="text-xs leading-relaxed text-secondary">
                  This password reset link is incomplete or missing a valid cryptographic token. Please request a new recovery link.
                </p>
              </div>
              <Link to="/forgot-password" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Request New Link
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-6 animate-in fade-in-50 text-center">
              <div className="rounded-xl bg-success-subtle border border-success-border p-6 text-success-fg space-y-3">
                <div className="flex items-center justify-center gap-2 font-bold text-base">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>Password Updated Successfully</span>
                </div>
                <p className="text-xs leading-relaxed text-secondary">
                  Your credentials have been updated. Redirecting to sign in screen...
                </p>
              </div>
              <Link to="/login" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Sign In Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-primary">Create New Password</h2>
                <p className="text-xs text-secondary">
                  Enter a strong new password with at least 8 characters, one number, and one symbol.
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
                    placeholder="Re-enter password"
                    disabled={isSubmitting}
                    error={Boolean(errors.confirmPassword)}
                    leftIcon={<Lock className="h-4 w-4" />}
                    {...register("confirmPassword")}
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                >
                  Update Password & Enter
                </Button>
              </form>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          )}

          {/* Security / System Footer */}
          <div className="pt-4 border-t border-subtle text-center space-y-2">
            <p className="text-[11px] text-muted">
              Inventra Pharmacy ERP • Version 1.0.0 (Spring Boot 4.1.1 + PostgreSQL 17)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
