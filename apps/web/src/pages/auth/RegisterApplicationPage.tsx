import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  FormField,
  Alert,
  StatusBadge,
} from "@inventra/ui";
import { submitOnboardingApplicationSchema } from "@inventra/validation";
import type { SubmitOnboardingApplicationRequest, OnboardingApplicationSummaryResponse } from "@inventra/api-types";
import { apiClient } from "../../services/api";

export const RegisterApplicationPage: React.FC = () => {
  const [formData, setFormData] = useState<SubmitOnboardingApplicationRequest>({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    businessName: "",
    tradeName: "",
    drugLicenseNumber: "",
    gstin: "",
    storeName: "",
    storeCode: "MAIN-01",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<OnboardingApplicationSummaryResponse | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setErrors({});

    const result = submitOnboardingApplicationSchema.safeParse(formData);
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
      const res = await apiClient.post<OnboardingApplicationSummaryResponse>(
        "/api/v1/onboarding/apply",
        result.data,
        { skipAuth: true }
      );
      if (res.data) {
        setSubmittedApp(res.data);
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Failed to submit onboarding application. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submittedApp) {
    return (
      <div className="min-h-screen bg-app text-primary flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          <Card className="shadow-card border-subtle">
            <CardHeader className="text-center pb-4 border-b border-subtle">
              <div className="mx-auto w-14 h-14 bg-primary-subtle border border-primary-border rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold text-primary">Application Received</CardTitle>
              <CardDescription className="text-secondary">
                Your pharmacy onboarding application has been submitted for platform review.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <Alert variant="info" title="Status: Under Platform Admin Review">
                Every pharmacy on Inventra undergoes administrative review. Once approved, you will receive an account activation link to set your password and access your pharmacy operations workspace.
              </Alert>

              <div className="bg-surface-muted rounded-lg p-4 border border-subtle space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Application Reference</span>
                  <code className="text-xs text-primary font-mono">{submittedApp.id}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Pharmacy Legal Name</span>
                  <span className="text-primary font-medium">{submittedApp.businessName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Applicant</span>
                  <span className="text-primary">{submittedApp.applicantName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Notification Email</span>
                  <span className="text-primary">{submittedApp.applicantEmail}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status</span>
                  <StatusBadge status={submittedApp.status} />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-4 border-t border-subtle">
              <Link to="/login" className="w-full">
                <Button variant="primary" className="w-full">
                  Return to Login
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
      <div className="w-full max-w-2xl">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary shadow-card mb-3">
            <span className="text-primary-fg font-bold text-2xl tracking-wider font-mono">I</span>
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Register Your Pharmacy</h1>
          <p className="text-secondary text-sm mt-1">
            Apply for an Inventra enterprise pharmacy operations account
          </p>
        </div>

        <Card className="shadow-card border-subtle">
          <CardHeader className="border-b border-subtle">
            <CardTitle className="text-xl text-primary">Onboarding Application</CardTitle>
            <CardDescription className="text-secondary">
              Submit your pharmacy details. A Platform Administrator will review and approve your account before activation.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {apiError && (
              <div className="mb-6">
                <Alert variant="danger" title="Submission Error">
                  {apiError}
                </Alert>
              </div>
            )}

            <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Applicant Details */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                  1. Owner / Pharmacist Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Full Name" required error={errors.applicantName}>
                    <Input
                      name="applicantName"
                      value={formData.applicantName}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      error={Boolean(errors.applicantName)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Email Address" required error={errors.applicantEmail}>
                    <Input
                      type="email"
                      name="applicantEmail"
                      value={formData.applicantEmail}
                      onChange={handleChange}
                      placeholder="e.g. rajesh@sharmapharmacy.com"
                      error={Boolean(errors.applicantEmail)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Phone Number" error={errors.applicantPhone}>
                    <Input
                      type="tel"
                      name="applicantPhone"
                      value={formData.applicantPhone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                      error={Boolean(errors.applicantPhone)}
                      disabled={isLoading}
                    />
                  </FormField>
                </div>
              </div>

              {/* Section 2: Business & Legal Entity */}
              <div className="pt-4 border-t border-subtle">
                <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
                  2. Pharmacy Legal Entity & Licensing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Business Legal Name" required error={errors.businessName}>
                    <Input
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma Healthcare Pvt Ltd"
                      error={Boolean(errors.businessName)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Trade Name / Pharmacy Name" error={errors.tradeName}>
                    <Input
                      name="tradeName"
                      value={formData.tradeName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma Medicos"
                      error={Boolean(errors.tradeName)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Drug License Number" required error={errors.drugLicenseNumber}>
                    <Input
                      name="drugLicenseNumber"
                      value={formData.drugLicenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. DL-20B-123456"
                      error={Boolean(errors.drugLicenseNumber)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="GSTIN (Optional)" error={errors.gstin}>
                    <Input
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      error={Boolean(errors.gstin)}
                      disabled={isLoading}
                    />
                  </FormField>
                </div>
              </div>

              {/* Section 3: Initial Store Location */}
              <div className="pt-4 border-t border-subtle">
                <h3 className="text-xs font-bold text-success uppercase tracking-wider mb-3">
                  3. Primary Store / Dispensary Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Store Name" required error={errors.storeName}>
                    <Input
                      name="storeName"
                      value={formData.storeName}
                      onChange={handleChange}
                      placeholder="e.g. Main Branch Dispensary"
                      error={Boolean(errors.storeName)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Store Code" required error={errors.storeCode}>
                    <Input
                      name="storeCode"
                      value={formData.storeCode}
                      onChange={handleChange}
                      placeholder="e.g. MAIN-01"
                      error={Boolean(errors.storeCode)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Address Line 1" required error={errors.addressLine1} className="sm:col-span-2">
                    <Input
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleChange}
                      placeholder="e.g. Shop 12, Ground Floor, Central Market"
                      error={Boolean(errors.addressLine1)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Address Line 2" error={errors.addressLine2} className="sm:col-span-2">
                    <Input
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleChange}
                      placeholder="e.g. Near City Hospital"
                      error={Boolean(errors.addressLine2)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="City" required error={errors.city}>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. New Delhi"
                      error={Boolean(errors.city)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="State" required error={errors.state}>
                    <Input
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Delhi"
                      error={Boolean(errors.state)}
                      disabled={isLoading}
                    />
                  </FormField>

                  <FormField label="Postal Code / PIN" required error={errors.postalCode}>
                    <Input
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 110001"
                      error={Boolean(errors.postalCode)}
                      disabled={isLoading}
                    />
                  </FormField>
                </div>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-subtle">
            <Link to="/login" className="text-xs text-secondary hover:text-primary transition-colors">
              ← Back to Sign In
            </Link>
            <Button
              type="submit"
              form="onboarding-form"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full sm:w-auto"
            >
              Submit Onboarding Application
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
