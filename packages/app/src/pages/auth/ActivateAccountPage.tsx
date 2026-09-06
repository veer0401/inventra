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
import {
  User,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { storeStaffApi, VerifyInvitationResponse } from "../../services/storeStaffApi";
import { apiClient } from "../../services/api";

export const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [staffInvite, setStaffInvite] = useState<VerifyInvitationResponse | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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
      checkToken(queryToken);
    }
  }, [searchParams]);

  const checkToken = async (rawToken: string) => {
    try {
      setIsVerifyingToken(true);
      const res = await storeStaffApi.verifyInvitation(rawToken);
      if (res && res.valid) {
        setStaffInvite(res);
      }
    } catch {
      // If verify fails, token may be an owner onboarding token or manual token
      setStaffInvite(null);
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(raw);
    if (errors.phoneNumber) {
      setErrors((prev) => ({ ...prev, phoneNumber: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const newErrors: Record<string, string> = {};

    if (!token.trim()) {
      newErrors.token = "Activation token is required";
    }

    if (staffInvite) {
      // Staff Profile Completion Validations
      if (!fullName.trim() || fullName.trim().length < 2) {
        newErrors.fullName = "Full legal name must be at least 2 characters";
      }

      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone number is required";
      } else if (!/^[6-9]\d{9}$/.test(phoneNumber.trim())) {
        newErrors.phoneNumber = "Phone number must be strictly 10 digits starting with 6, 7, 8, or 9";
      }
    }

    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);

      if (staffInvite) {
        // Staff Invitation Activation
        await storeStaffApi.activateStaff({
          token: token.trim(),
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          password: newPassword,
        });
      } else {
        // Owner Onboarding Activation Fallback
        await apiClient.post(
          "/api/v1/auth/onboarding/activate",
          {
            token: token.trim(),
            newPassword,
          },
          { skipAuth: true }
        );
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Failed to activate account. The activation link may be invalid, expired, or already used."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-app text-primary flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
          <Card className="shadow-card border-subtle">
            <CardHeader className="text-center pb-2 border-b border-subtle">
              <div className="mx-auto w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-primary">Account Activated!</CardTitle>
              <CardDescription className="text-secondary">
                {staffInvite
                  ? `Welcome to ${staffInvite.businessName}. Your staff account is now fully active.`
                  : "Your pharmacy owner credentials have been established."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <Alert variant="success" title="Ready for Counter Access">
                Your profile details and secure password have been registered. You can now log in using your registered email.
              </Alert>
            </CardContent>

            <CardFooter className="pt-4 border-t border-subtle">
              <Link to="/login" className="w-full">
                <Button variant="primary" className="w-full">
                  Proceed to Sign In
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
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {staffInvite ? "Complete Your Profile & Activate" : "Activate Pharmacy Account"}
          </h1>
          <p className="text-secondary text-xs mt-1">
            {staffInvite
              ? `Join ${staffInvite.businessName} as ${staffInvite.role}`
              : "Set a secure password to finalize your pharmacy onboarding"}
          </p>
        </div>

        <Card className="shadow-card border-subtle">
          <CardHeader className="border-b border-subtle">
            <CardTitle className="text-lg text-primary">
              {staffInvite ? "Staff Profile Details" : "Set Master Account Password"}
            </CardTitle>
            <CardDescription className="text-secondary">
              {staffInvite
                ? "Enter your legal name, mobile number, and choose a secure password to activate your staff access."
                : "Your application has been approved. Choose a strong password to activate your owner profile."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            {/* Staff Invitation Details Banner */}
            {staffInvite && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pharmacy:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    {staffInvite.businessName}
                  </span>
                </div>
                {staffInvite.storeName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-semibold text-foreground">{staffInvite.storeName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Designated Role:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary">
                    {staffInvite.role}
                  </span>
                </div>
              </div>
            )}

            {isVerifyingToken && (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground bg-muted/40 rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Verifying invitation link...</span>
              </div>
            )}

            {apiError && (
              <Alert variant="danger" title="Activation Error">
                {apiError}
              </Alert>
            )}

            <form id="activate-form" onSubmit={handleSubmit} className="space-y-4">
              {/* If staff invitation, email is shown read-only */}
              {staffInvite ? (
                <FormField label="Email Address" required>
                  <Input
                    name="email"
                    value={staffInvite.email}
                    disabled
                    leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                    className="bg-muted/30 text-xs font-mono"
                  />
                </FormField>
              ) : (
                <FormField label="Activation Token" required error={errors.token}>
                  <Input
                    name="token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (e.target.value.length > 20) checkToken(e.target.value);
                    }}
                    placeholder="Paste activation token from email"
                    error={Boolean(errors.token)}
                    disabled={isLoading || Boolean(searchParams.get("token"))}
                    className="font-mono text-xs"
                  />
                </FormField>
              )}

              {/* Staff Specific Fields: Full Name & 10-digit Phone Number */}
              {staffInvite && (
                <>
                  <FormField label="Full Legal Name" required error={errors.fullName}>
                    <Input
                      name="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      leftIcon={<User className="w-4 h-4 text-muted-foreground" />}
                      error={Boolean(errors.fullName)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </FormField>

                  <FormField label="Mobile Number (Strictly 10 Digits)" required error={errors.phoneNumber}>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      name="phoneNumber"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="9876543210"
                      maxLength={10}
                      leftIcon={<Phone className="w-4 h-4 text-muted-foreground" />}
                      error={Boolean(errors.phoneNumber)}
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Indian 10-digit mobile number starting with 6, 7, 8, or 9
                    </p>
                  </FormField>
                </>
              )}

              <FormField label="Create Password" required error={errors.newPassword}>
                <PasswordInput
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
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
              {staffInvite ? "Complete Profile & Activate" : "Activate Account & Finish"}
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
