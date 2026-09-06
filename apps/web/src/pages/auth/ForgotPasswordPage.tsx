import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { resetPasswordRequestSchema } from "@inventra/validation";
import { useAuthStore } from "../../stores/authStore";
import { Button, Input, FormField, Alert } from "@inventra/ui";

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-app text-primary">
      <div className="w-full max-w-md bg-surface rounded-lg border border-subtle p-8 shadow-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center font-bold text-base text-primary-fg">
            IN
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Inventra ERP</h2>
            <p className="text-[11px] text-secondary font-medium">Account Recovery</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="rounded-md bg-success-subtle border border-success-border p-4 text-success-fg space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Reset Instructions Dispatched</span>
              </div>
              <p className="text-xs leading-relaxed">
                If an authorized account is registered with this email, you will receive password recovery instructions shortly.
              </p>
            </div>
            <Link to="/login" className="block">
              <Button variant="outline" size="md" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-primary">Reset Your Password</h3>
              <p className="text-xs text-secondary">
                Enter your verified business email address. We will send a secure password reset link.
              </p>
            </div>

            {serverError && (
              <Alert variant="danger" onDismiss={() => setServerError(null)}>
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                label="Registered Email"
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
                size="md"
                className="w-full"
                isLoading={isSubmitting}
              >
                Send Reset Link
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
