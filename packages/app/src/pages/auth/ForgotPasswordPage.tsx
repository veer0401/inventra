import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
import { resetPasswordRequestSchema } from "@inventra/validation";
import { useAuthStore } from "../../stores/authStore";
import { Button, Input, FormField, Alert, Badge } from "@inventra/ui";
import { BrandLogo } from "../../components/common/BrandLogo";

interface ForgotPasswordFormValues {
  email: string;
}

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      await requestPasswordReset(data.email);
      setSubmitted(true);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to process password reset request.");
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
              Account Security & Recovery
            </Badge>
            <h2 className="text-2xl lg:text-3xl font-semibold text-primary tracking-tight leading-snug">
              Secure Credential Reset & Access Recovery.
            </h2>
            <p className="text-sm text-secondary leading-relaxed">
              Cryptographically signed single-use recovery tokens protect your pharmacy data, customer health records, and prescription registers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Zero-Trust Recovery Tokens</h4>
                <p className="text-[11px] text-secondary">Expiring single-use reset links sent strictly to registered verified operator emails.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <ShieldCheck className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Session Invalidation Protection</h4>
                <p className="text-[11px] text-secondary">Password modification automatically revokes all other active device tokens.</p>
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

      {/* Right Recovery Action Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-app text-primary">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2.5 mb-2">
            <BrandLogo size="md" showText subtitle="Account Recovery" />
          </div>

          {submitted ? (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="rounded-xl bg-success-subtle border border-success-border p-6 text-success-fg space-y-3">
                <div className="flex items-center gap-2.5 font-bold text-base">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  <span>Reset Instructions Dispatched</span>
                </div>
                <p className="text-xs leading-relaxed text-secondary">
                  If an authorized account is registered with this email, you will receive password recovery instructions shortly. Please check your inbox and spam folders.
                </p>
              </div>
              <Link to="/login" className="block">
                <Button variant="outline" size="lg" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-primary">Reset Your Password</h2>
                <p className="text-xs text-secondary">
                  Enter your registered pharmacy email address. We will dispatch a secure, single-use password reset link.
                </p>
              </div>

              {serverError && (
                <Alert variant="danger" onDismiss={() => setServerError(null)}>
                  {serverError}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  label="Registered Business Email"
                  htmlFor="email"
                  required
                  error={errors.email?.message}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@pharmacy.com"
                    autoFocus
                    disabled={isSubmitting}
                    error={Boolean(errors.email)}
                    leftIcon={<Mail className="h-4 w-4" />}
                    {...register("email")}
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                >
                  Send Recovery Link
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
