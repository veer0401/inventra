import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  PasswordInput,
  FormField,
  Alert,
} from "@inventra/ui";
import { activateOwnerSchema } from "@inventra/validation";
import { apiClient } from "../../services/api";

export const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const queryToken = searchParams.get("token");
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setErrors({});

    const result = activateOwnerSchema.safeParse({
      token,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post(
        "/api/v1/auth/onboarding/activate",
        {
          token: result.data.token,
          newPassword: result.data.newPassword,
        },
        { skipAuth: true }
      );
      setIsSuccess(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Failed to activate owner account. The activation link may be invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-app text-primary flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-card border-subtle">
            <CardHeader className="text-center pb-2 border-b border-subtle">
              <div className="mx-auto w-14 h-14 bg-success-subtle border border-success-border rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold text-primary">Account Activated!</CardTitle>
              <CardDescription className="text-secondary">
                Your pharmacy owner credentials have been established.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <Alert variant="success" title="Ready to Operate">
                Your pharmacy account is now active. You can log in with your email address and newly created password.
              </Alert>
            </CardContent>

            <CardFooter className="pt-4 border-t border-subtle">
              <Link to="/login" className="w-full">
                <Button variant="primary" className="w-full">
                  Proceed to Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-primary flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary shadow-card mb-3">
            <span className="text-primary-fg font-bold text-2xl tracking-wider font-mono">I</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Activate Pharmacy Account</h1>
          <p className="text-secondary text-xs mt-1">
            Set a secure password to finalize your pharmacy onboarding
          </p>
        </div>

        <Card className="shadow-card border-subtle">
          <CardHeader className="border-b border-subtle">
            <CardTitle className="text-lg text-primary">Set Master Account Password</CardTitle>
            <CardDescription className="text-secondary">
              Your application has been approved by the platform administrator. Choose a strong password to activate your owner profile.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            {apiError && (
              <div className="mb-6">
                <Alert variant="danger" title="Activation Error">
                  {apiError}
                </Alert>
              </div>
            )}

            <form id="activate-form" onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Activation Token" required error={errors.token}>
                <Input
                  name="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste activation token from approval email"
                  error={Boolean(errors.token)}
                  disabled={isLoading || Boolean(searchParams.get("token"))}
                  className="font-mono text-xs"
                />
              </FormField>

              <FormField label="New Password" required error={errors.newPassword}>
                <PasswordInput
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol"
                  error={Boolean(errors.newPassword)}
                  disabled={isLoading}
                />
              </FormField>

              <FormField label="Confirm Password" required error={errors.confirmPassword}>
                <PasswordInput
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  error={Boolean(errors.confirmPassword)}
                  disabled={isLoading}
                />
              </FormField>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-4 border-t border-subtle">
            <Button
              type="submit"
              form="activate-form"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Activate Account & Finish
            </Button>

            <Link to="/login" className="text-center text-xs text-secondary hover:text-primary transition-colors">
              Already activated? Go to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
