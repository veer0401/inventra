import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@inventra/validation";
import type { LoginRequest } from "@inventra/api-types";
import {
  Button,
  Input,
  PasswordInput,
  FormField,
  Alert,
  Badge,
} from "@inventra/ui";
import { useAuthStore } from "../../stores/authStore";
import {
  ShieldCheck,
  Lock,
  Mail,
  WifiOff,
  Activity,
  Boxes,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, status, error, isOnline, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    clearError();
    try {
      await login(data);
      const state = useAuthStore.getState();
      if (state.activeContext?.role === "PLATFORM_ADMIN") {
        navigate("/admin/onboarding");
      } else if (state.memberships.length > 1) {
        navigate("/select-context");
      } else {
        navigate("/");
      }
    } catch {
      // Error handled in store and displayed via state.error
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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center font-bold text-xl text-primary-fg shadow-card">
              IN
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">INVENTRA</h1>
              <p className="text-xs text-primary font-medium tracking-wide uppercase">
                Enterprise Pharmacy ERP
              </p>
            </div>
          </div>
        </div>

        {/* Operational Highlights */}
        <div className="relative z-10 space-y-6 my-auto py-8">
          <div className="space-y-2">
            <Badge variant="accent">
              Clinical Grade Architecture
            </Badge>
            <h2 className="text-2xl lg:text-3xl font-semibold text-primary tracking-tight leading-snug">
              Secure, multi-store pharmaceutical operations & POS.
            </h2>
            <p className="text-sm text-secondary leading-relaxed">
              Real-time batch traceability, strict FEFO inventory management, schedule drug compliance, and offline transaction synchronization.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Strict Tenant & Store Isolation</h4>
                <p className="text-[11px] text-secondary">Hierarchical multi-branch access control with cryptographic JWT authorization.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <Boxes className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Batch-Level FEFO Accuracy</h4>
                <p className="text-[11px] text-secondary">Strict regulatory batch allocation, expiry tracking, and drug license compliance.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-subtle">
              <Activity className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-primary">Admin-Approved Onboarding</h4>
                <p className="text-[11px] text-secondary">Platform administrator verification prevents unauthorized pharmacy registrations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted border-t border-subtle pt-4">
          <span>PostgreSQL 17 • Spring Boot 4.1.1</span>
          <div className="flex items-center gap-1.5 text-success">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Online Terminal</span>
          </div>
        </div>
      </div>

      {/* Right Login Action Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-app text-primary">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-2.5 mb-2">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center font-bold text-lg text-primary-fg">
              IN
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Inventra ERP</h2>
              <p className="text-[11px] text-primary font-medium">Pharmacy Operations</p>
            </div>
          </div>

          {/* Network Disconnection Banner */}
          {!isOnline && (
            <Alert variant="danger" title="Network Connection Lost">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 shrink-0" />
                <span>You are offline. The web terminal requires an active internet connection.</span>
              </div>
            </Alert>
          )}

          {/* Header Card Info */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-primary">Sign In to Terminal</h2>
            <p className="text-xs text-secondary">
              Enter your registered credentials to access your pharmacy operations workspace.
            </p>
          </div>

          {/* Login Error Alert */}
          {error && (
            <Alert variant="danger" onDismiss={clearError}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              label="Email Address"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                placeholder="name@pharmacy.com"
                autoComplete="email"
                disabled={isSubmitting || !isOnline}
                error={Boolean(errors.email)}
                leftIcon={<Mail className="h-4 w-4" />}
                {...register("email")}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <PasswordInput
                id="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isSubmitting || !isOnline}
                error={Boolean(errors.password)}
                leftIcon={<Lock className="h-4 w-4" />}
                {...register("password")}
              />
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted">Authorized Personnel Only</span>
              <Link
                to="/forgot-password"
                className="font-semibold text-primary hover:text-primary-hover hover:underline focus:outline-none focus:ring-1 focus:ring-focus rounded-sm"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting || status === "AUTHENTICATING"}
              disabled={!isOnline}
            >
              Authenticate & Enter
            </Button>
          </form>

          {/* Pharmacy Onboarding Link */}
          <div className="pt-2 text-center text-xs text-secondary">
            <span>New pharmacy? </span>
            <Link
              to="/apply"
              className="font-semibold text-primary hover:text-primary-hover hover:underline"
            >
              Apply for Pharmacy Onboarding →
            </Link>
          </div>

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
