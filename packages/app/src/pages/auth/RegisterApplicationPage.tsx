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
  Select,
  FormField,
  Alert,
  StatusBadge,
} from "@inventra/ui";
import {
  User,
  Building2,
  Store,
  ShieldCheck,
  Check,
  ArrowLeft,
  ArrowRight,
  Edit3,
  MapPin,
  Sparkles,
  Loader2,
  Mail,
  Phone,
  Receipt,
  Hash,
  Globe,
  Navigation,
  Building,
} from "lucide-react";
import { submitOnboardingApplicationSchema } from "@inventra/validation";
import type { SubmitOnboardingApplicationRequest, OnboardingApplicationSummaryResponse } from "@inventra/api-types";
import { apiClient } from "../../services/api";
import { INDIAN_STATES, getCitiesForState } from "../../services/geoData";

interface StepConfig {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
}

interface PincodeLookupResponse {
  pincode: string;
  city: string;
  state: string;
  district: string;
  postOffices: string[];
  found: boolean;
  message: string;
}

interface OnboardingAvailabilityResponse {
  emailAvailable: boolean;
  emailMessage: string | null;
  phoneAvailable: boolean;
  phoneMessage: string | null;
  drugLicenseAvailable: boolean;
  drugLicenseMessage: string | null;
  allAvailable: boolean;
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "Owner Information",
    shortTitle: "Owner",
    description: "Applicant contact and credentials",
    icon: User,
  },
  {
    id: 2,
    title: "Business & Legal",
    shortTitle: "Business",
    description: "Company entity & drug licensing",
    icon: Building2,
  },
  {
    id: 3,
    title: "Store Location",
    shortTitle: "Store",
    description: "PIN code & dispensary address",
    icon: Store,
  },
  {
    id: 4,
    title: "Review & Submit",
    shortTitle: "Review",
    description: "Verify details & apply",
    icon: ShieldCheck,
  },
];

export const RegisterApplicationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
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

  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<OnboardingApplicationSummaryResponse | null>(null);

  // PIN Code Auto-Lookup State
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [pinStatus, setPinStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>(() =>
    formData.state ? getCitiesForState(formData.state) : []
  );

  // Field Availability Pre-check State
  const [isValidatingAvailability, setIsValidatingAvailability] = useState(false);

  const checkFieldAvailability = async (params: {
    email?: string;
    phone?: string;
    drugLicenseNumber?: string;
  }): Promise<boolean> => {
    try {
      setIsValidatingAvailability(true);
      const queryParams = new URLSearchParams();
      if (params.email?.trim()) queryParams.set("email", params.email.trim());
      if (params.phone?.trim()) queryParams.set("phone", params.phone.trim());
      if (params.drugLicenseNumber?.trim()) queryParams.set("drugLicenseNumber", params.drugLicenseNumber.trim());

      if ([...queryParams.keys()].length === 0) {
        return true;
      }

      const res = await apiClient.get<OnboardingAvailabilityResponse>(
        `/api/v1/onboarding/check-availability?${queryParams.toString()}`,
        { skipAuth: true }
      );

      if (res.data) {
        const fieldErrors: Record<string, string> = {};
        if (params.email && !res.data.emailAvailable && res.data.emailMessage) {
          fieldErrors.applicantEmail = res.data.emailMessage;
        }
        if (params.phone && !res.data.phoneAvailable && res.data.phoneMessage) {
          fieldErrors.applicantPhone = res.data.phoneMessage;
        }
        if (params.drugLicenseNumber && !res.data.drugLicenseAvailable && res.data.drugLicenseMessage) {
          fieldErrors.drugLicenseNumber = res.data.drugLicenseMessage;
        }

        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
          return false;
        }
      }
      return true;
    } catch {
      // Graceful fallback - backend will enforce on submit
      return true;
    } finally {
      setIsValidatingAvailability(false);
    }
  };

  const handleEmailBlur = async () => {
    if (formData.applicantEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail.trim())) {
      await checkFieldAvailability({ email: formData.applicantEmail });
    }
  };

  const handlePhoneBlur = async () => {
    if (formData.applicantPhone && /^[6-9]\d{9}$/.test(formData.applicantPhone.trim())) {
      await checkFieldAvailability({ phone: formData.applicantPhone });
    }
  };

  const handleLicenseBlur = async () => {
    if (formData.drugLicenseNumber && formData.drugLicenseNumber.trim().length >= 3) {
      await checkFieldAvailability({ drugLicenseNumber: formData.drugLicenseNumber });
    }
  };

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

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedState = e.target.value;
    const cities = getCitiesForState(selectedState);
    setAvailableCities(cities);
    setFormData((prev) => ({
      ...prev,
      state: selectedState,
      city: "", // reset city when state changes
    }));
    if (errors.state) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.state;
        return next;
      });
    }
  };

  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    setFormData((prev) => ({ ...prev, city: selectedCity }));
    if (errors.city) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.city;
        return next;
      });
    }
  };

  // Strictly 10 digits for mobile number (numeric only, max 10)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, applicantPhone: numericValue }));
    if (errors.applicantPhone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.applicantPhone;
        return next;
      });
    }
  };

  // PIN code lookup triggered when 6 digits are entered
  const lookupPincode = async (pincode: string) => {
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return;
    }

    try {
      setIsLookingUpPin(true);
      setPinStatus(null);
      const res = await apiClient.get<PincodeLookupResponse>(`/api/v1/pincode/${pincode}`, {
        skipAuth: true,
      });

      if (res.data && res.data.found) {
        const rawState = res.data.state || "";
        const rawCity = res.data.city || "";

        // Find matching state in INDIAN_STATES
        const matchedStateObj = INDIAN_STATES.find(
          (s) => s.name.toLowerCase() === rawState.trim().toLowerCase()
        );
        const resolvedState = matchedStateObj ? matchedStateObj.name : rawState;

        // Get cities list for state and ensure detected city is present
        let cities = getCitiesForState(resolvedState);
        if (rawCity && !cities.some((c) => c.toLowerCase() === rawCity.toLowerCase())) {
          cities = [rawCity, ...cities];
        }
        setAvailableCities(cities);

        setFormData((prev) => ({
          ...prev,
          state: resolvedState || prev.state,
          city: rawCity || prev.city,
        }));
        setPinStatus({
          success: true,
          message: `Auto-detected: ${rawCity}, ${resolvedState}`,
        });
        setErrors((prev) => {
          const next = { ...prev };
          delete next.city;
          delete next.state;
          delete next.postalCode;
          return next;
        });
      } else {
        setPinStatus({
          success: false,
          message: res.data?.message || "PIN code not found. Please select state and city manually.",
        });
      }
    } catch {
      setPinStatus({
        success: false,
        message: "PIN code lookup unavailable. Please select state and city manually.",
      });
    } finally {
      setIsLookingUpPin(false);
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setFormData((prev) => ({ ...prev, postalCode: val }));
    if (errors.postalCode) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.postalCode;
        return next;
      });
    }
    if (val.length === 6) {
      lookupPincode(val);
    } else {
      setPinStatus(null);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.applicantName.trim()) {
        stepErrors.applicantName = "Applicant legal name is required";
      } else if (formData.applicantName.length > 150) {
        stepErrors.applicantName = "Name must not exceed 150 characters";
      }

      if (!formData.applicantEmail?.trim()) {
        stepErrors.applicantEmail = "Applicant email address is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail.trim())) {
        stepErrors.applicantEmail = "Please enter a valid email address";
      }

      if (!formData.applicantPhone?.trim()) {
        stepErrors.applicantPhone = "Mobile number is required";
      } else if (!/^[6-9]\d{9}$/.test(formData.applicantPhone.trim())) {
        stepErrors.applicantPhone = "Mobile number must be strictly 10 digits starting with 6, 7, 8, or 9";
      }
    } else if (stepNumber === 2) {
      if (!formData.businessName?.trim()) {
        stepErrors.businessName = "Business legal entity name is required";
      }

      if (!formData.drugLicenseNumber?.trim()) {
        stepErrors.drugLicenseNumber = "Drug License Number is required for pharmacy operation";
      }

      if (formData.gstin?.trim()) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(formData.gstin.trim())) {
          stepErrors.gstin = "Please enter a valid 15-digit GSTIN (e.g. 29AAAAA0000A1Z5)";
        }
      }
    } else if (stepNumber === 3) {
      if (!formData.postalCode?.trim()) {
        stepErrors.postalCode = "6-digit PIN code is required";
      } else if (!/^[1-9][0-9]{5}$/.test(formData.postalCode.trim())) {
        stepErrors.postalCode = "PIN code must be exactly 6 digits";
      }

      if (!formData.state?.trim()) {
        stepErrors.state = "State / UT is required";
      }

      if (!formData.city?.trim()) {
        stepErrors.city = "City / District is required";
      }

      if (!formData.addressLine1?.trim()) {
        stepErrors.addressLine1 = "Street address line 1 is required";
      }

      if (!formData.storeName?.trim()) {
        stepErrors.storeName = "Primary pharmacy store name is required";
      } else if (formData.storeName.length > 200) {
        stepErrors.storeName = "Store name must not exceed 200 characters";
      }

      if (!formData.storeCode?.trim()) {
        stepErrors.storeCode = "Store code is required (e.g. MAIN-01)";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = async () => {
    setApiError(null);
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep === 1) {
      const isAvailable = await checkFieldAvailability({
        email: formData.applicantEmail,
        phone: formData.applicantPhone,
      });
      if (!isAvailable) {
        return;
      }
    } else if (currentStep === 2) {
      if (formData.drugLicenseNumber?.trim()) {
        const isAvailable = await checkFieldAvailability({
          drugLicenseNumber: formData.drugLicenseNumber,
        });
        if (!isAvailable) {
          return;
        }
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setApiError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      setApiError(null);
      setCurrentStep(stepNumber);
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
      if (fieldErrors.applicantName || fieldErrors.applicantEmail || fieldErrors.applicantPhone) {
        setCurrentStep(1);
      } else if (fieldErrors.businessName || fieldErrors.drugLicenseNumber || fieldErrors.gstin) {
        setCurrentStep(2);
      } else if (fieldErrors.postalCode || fieldErrors.city || fieldErrors.state || fieldErrors.addressLine1 || fieldErrors.storeName || fieldErrors.storeCode) {
        setCurrentStep(3);
      }
      return;
    }

    if (!declarationChecked) {
      setApiError("Please confirm the authenticity declaration before submitting.");
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
      const errorMsg = err instanceof Error ? err.message : "Failed to submit onboarding application. Please try again.";
      setApiError(errorMsg);

      // If duplicate error occurs on email or mobile, jump to Step 1
      if (
        errorMsg.toLowerCase().includes("email") ||
        errorMsg.toLowerCase().includes("mobile") ||
        errorMsg.toLowerCase().includes("phone")
      ) {
        setCurrentStep(1);
      } else if (errorMsg.toLowerCase().includes("drug license")) {
        setCurrentStep(2);
      }
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
              <div className="mx-auto w-14 h-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-primary" />
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
                  <span className="text-muted">Mobile Number</span>
                  <span className="text-primary font-mono">+91 {formData.applicantPhone}</span>
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
      <div className="w-full max-w-3xl">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-fg shadow-card mb-3 font-bold text-2xl font-mono">
            I
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            Register Your Pharmacy
          </h1>
          <p className="text-secondary text-sm mt-1">
            Complete the 4-step onboarding application for platform review and activation
          </p>
        </div>

        {/* Stepper Header Navigation */}
        <div className="mb-6">
          <nav aria-label="Onboarding Steps" className="bg-surface rounded-xl border border-subtle p-3 sm:p-4 shadow-subtle">
            {/* Desktop / Tablet Stepper */}
            <ol className="hidden sm:flex items-center justify-between w-full">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const isUpcoming = currentStep < step.id;
                const StepIcon = step.icon;

                return (
                  <React.Fragment key={step.id}>
                    <li className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => goToStep(step.id)}
                        disabled={isUpcoming}
                        className={`flex items-center gap-2.5 text-left group transition-colors ${
                          isUpcoming ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        }`}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        {/* Step Circle */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-xs shrink-0 transition-all ${
                            isCompleted
                              ? "bg-primary text-primary-fg shadow-sm"
                              : isCurrent
                              ? "bg-primary/10 border-2 border-primary text-primary ring-4 ring-primary/10"
                              : "bg-surface-muted border border-subtle text-muted"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <StepIcon className="w-4 h-4" />
                          )}
                        </div>

                        {/* Step Label */}
                        <div className="min-w-0">
                          <p
                            className={`text-[11px] font-semibold uppercase tracking-wider leading-none ${
                              isCurrent
                                ? "text-primary font-bold"
                                : isCompleted
                                ? "text-primary"
                                : "text-muted"
                            }`}
                          >
                            Step {step.id}
                          </p>
                          <p
                            className={`text-xs font-medium truncate mt-0.5 ${
                              isCurrent
                                ? "text-primary font-semibold"
                                : isCompleted
                                ? "text-secondary"
                                : "text-muted"
                            }`}
                          >
                            {step.shortTitle}
                          </p>
                        </div>
                      </button>
                    </li>

                    {/* Full Connecting Line Between Steps */}
                    {index < STEPS.length - 1 && (
                      <li className="flex-1 mx-2.5 lg:mx-4" aria-hidden="true">
                        <div
                          className={`h-[2px] w-full rounded-full transition-colors duration-300 ${
                            currentStep > step.id ? "bg-primary" : "bg-subtle"
                          }`}
                        />
                      </li>
                    )}
                  </React.Fragment>
                );
              })}
            </ol>

            {/* Mobile Stepper */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                    {currentStep}
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {STEPS[currentStep - 1]?.title}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  Step {currentStep} of {STEPS.length}
                </span>
              </div>
              <div className="w-full bg-subtle h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </nav>
        </div>

        {/* Form Card */}
        <Card className="shadow-card border-subtle">
          <CardHeader className="border-b border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-primary">
                  {STEPS[currentStep - 1]?.title}
                </CardTitle>
                <CardDescription className="text-secondary mt-0.5">
                  {STEPS[currentStep - 1]?.description}
                </CardDescription>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Step {currentStep} of {STEPS.length}
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {apiError && (
              <div className="mb-6">
                <Alert variant="danger" title="Validation / Submission Error">
                  {apiError}
                </Alert>
              </div>
            )}

            <form id="onboarding-form" onSubmit={handleSubmit}>
              {/* STEP 1: Owner / Pharmacist Information */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-surface-muted/60 p-3.5 rounded-lg border border-subtle mb-4">
                    <p className="text-xs text-secondary leading-relaxed">
                      Enter the details of the designated pharmacy proprietor or primary licensed superintendent pharmacist. A strictly 10-digit Indian mobile number is required for account authentication.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Full Legal Name" required error={errors.applicantName} className="sm:col-span-2">
                      <Input
                        name="applicantName"
                        value={formData.applicantName}
                        onChange={handleChange}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        leftIcon={<User className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.applicantName)}
                        disabled={isLoading}
                        autoFocus
                      />
                    </FormField>

                    <FormField label="Email Address" required error={errors.applicantEmail}>
                      <Input
                        type="email"
                        name="applicantEmail"
                        value={formData.applicantEmail}
                        onChange={handleChange}
                        onBlur={handleEmailBlur}
                        placeholder="e.g. rajesh@sharmapharmacy.com"
                        leftIcon={<Mail className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.applicantEmail)}
                        disabled={isLoading}
                      />
                    </FormField>

                    <FormField
                      label="Mobile Number (Strictly 10 Digits)"
                      required
                      error={errors.applicantPhone}
                    >
                      <Input
                        type="tel"
                        inputMode="numeric"
                        name="applicantPhone"
                        value={formData.applicantPhone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="9876543210"
                        maxLength={10}
                        leftIcon={<Phone className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.applicantPhone)}
                        disabled={isLoading}
                      />
                      <p className="text-[11px] text-muted mt-1">
                        Enter 10-digit Indian mobile number without country code or +91
                      </p>
                    </FormField>
                  </div>
                </div>
              )}

              {/* STEP 2: Business & Legal Entity */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-surface-muted/60 p-3.5 rounded-lg border border-subtle mb-4">
                    <p className="text-xs text-secondary leading-relaxed">
                      Provide your registered business name and state drug licensing authority number. All licenses are audited by platform compliance before branch access is provisioned.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Business Legal Name" required error={errors.businessName}>
                      <Input
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="e.g. Sharma Healthcare Pvt Ltd"
                        leftIcon={<Building2 className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.businessName)}
                        disabled={isLoading}
                        autoFocus
                      />
                    </FormField>

                    <FormField label="Trade Name / Storefront Brand" error={errors.tradeName}>
                      <Input
                        name="tradeName"
                        value={formData.tradeName}
                        onChange={handleChange}
                        placeholder="e.g. Sharma Medicos & Wellness"
                        leftIcon={<Store className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.tradeName)}
                        disabled={isLoading}
                      />
                    </FormField>

                    <FormField label="Drug License Number" required error={errors.drugLicenseNumber}>
                      <Input
                        name="drugLicenseNumber"
                        value={formData.drugLicenseNumber}
                        onChange={handleChange}
                        onBlur={handleLicenseBlur}
                        placeholder="e.g. DL-20B-123456"
                        leftIcon={<ShieldCheck className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.drugLicenseNumber)}
                        disabled={isLoading}
                      />
                    </FormField>

                    <FormField label="GSTIN (Goods & Services Tax)" error={errors.gstin}>
                      <Input
                        name="gstin"
                        value={formData.gstin}
                        onChange={handleChange}
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        leftIcon={<Receipt className="w-4 h-4 text-muted" />}
                        error={Boolean(errors.gstin)}
                        disabled={isLoading}
                      />
                    </FormField>
                  </div>
                </div>
              )}

              {/* STEP 3: Initial Store Location (PINCODE FIRST) */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-surface-muted/60 p-3.5 rounded-lg border border-subtle">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Smart Address Detection
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      Enter your 6-digit postal PIN code first. The system will automatically resolve the State and City across India, after which you can provide the dispensary street address.
                    </p>
                  </div>

                  {/* Address Grid with PINCODE FIRST */}
                  <div className="rounded-xl border border-subtle bg-surface p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-subtle">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                        Dispensary Address (PIN Code First)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 1. POSTAL PIN CODE (FIRST) */}
                      <FormField
                        label="Postal PIN Code (6 Digits)"
                        htmlFor="postalCode-input"
                        required
                        error={errors.postalCode}
                        className="sm:col-span-2"
                      >
                        <div className="relative">
                          <Input
                            id="postalCode-input"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handlePincodeChange}
                            placeholder="e.g. 560038"
                            maxLength={6}
                            leftIcon={<MapPin className="w-4 h-4 text-muted" />}
                            error={Boolean(errors.postalCode)}
                            disabled={isLoading}
                            autoFocus
                            className="font-mono text-sm tracking-wider pr-10"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            {isLookingUpPin ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : pinStatus?.success ? (
                              <Check className="w-4 h-4 text-success stroke-[3]" />
                            ) : null}
                          </div>
                        </div>

                        {/* PIN Detection Notification */}
                        {pinStatus && (
                          <div
                            className={`mt-1.5 text-xs flex items-center gap-1.5 ${
                              pinStatus.success ? "text-success font-medium" : "text-amber-400"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                            {pinStatus.message}
                          </div>
                        )}
                        <p className="text-[11px] text-muted mt-1">
                          Enter 6-digit PIN to auto-detect City & State
                        </p>
                      </FormField>

                      {/* 2. STATE (Dropdown) */}
                      <FormField
                        label="State / Union Territory"
                        htmlFor="state-select"
                        required
                        error={errors.state}
                      >
                        <Select
                          id="state-select"
                          name="state"
                          value={formData.state}
                          onChange={handleStateSelect}
                          leftIcon={<Globe className="w-4 h-4 text-muted" />}
                          error={Boolean(errors.state)}
                          disabled={isLoading}
                        >
                          <option value="">Select State / UT</option>
                          <optgroup label="States">
                            {INDIAN_STATES.filter((s) => s.type === "STATE").map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Union Territories">
                            {INDIAN_STATES.filter((s) => s.type === "UT").map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </optgroup>
                        </Select>
                      </FormField>

                      {/* 3. CITY (Dropdown filtered by State) */}
                      <FormField
                        label="City / District"
                        htmlFor="city-select"
                        required
                        error={errors.city}
                      >
                        <Select
                          id="city-select"
                          name="city"
                          value={formData.city}
                          onChange={handleCitySelect}
                          leftIcon={<Navigation className="w-4 h-4 text-muted" />}
                          error={Boolean(errors.city)}
                          disabled={isLoading || !formData.state}
                        >
                          <option value="">
                            {formData.state ? "Select City / District" : "Select State first"}
                          </option>
                          {availableCities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      {/* 4. STREET ADDRESS LINE 1 */}
                      <FormField
                        label="Street Address Line 1"
                        required
                        error={errors.addressLine1}
                        className="sm:col-span-2"
                      >
                        <Input
                          name="addressLine1"
                          value={formData.addressLine1}
                          onChange={handleChange}
                          placeholder="e.g. Shop 12, Ground Floor, Central Market"
                          leftIcon={<MapPin className="w-4 h-4 text-muted" />}
                          error={Boolean(errors.addressLine1)}
                          disabled={isLoading}
                        />
                      </FormField>

                      {/* 5. ADDRESS LINE 2 */}
                      <FormField
                        label="Address Line 2 (Optional)"
                        error={errors.addressLine2}
                        className="sm:col-span-2"
                      >
                        <Input
                          name="addressLine2"
                          value={formData.addressLine2}
                          onChange={handleChange}
                          placeholder="e.g. Landmark: Opposite City Hospital"
                          leftIcon={<Building className="w-4 h-4 text-muted" />}
                          error={Boolean(errors.addressLine2)}
                          disabled={isLoading}
                        />
                      </FormField>
                    </div>
                  </div>

                  {/* Branch Details Section */}
                  <div className="rounded-xl border border-subtle bg-surface p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-subtle">
                      <Store className="w-4 h-4 text-accent" />
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                        Dispensary Branch Details
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Store / Branch Name" required error={errors.storeName}>
                        <Input
                          name="storeName"
                          value={formData.storeName}
                          onChange={handleChange}
                          placeholder="e.g. Indiranagar Main Dispensary"
                          leftIcon={<Store className="w-4 h-4 text-muted" />}
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
                          leftIcon={<Hash className="w-4 h-4 text-muted" />}
                          error={Boolean(errors.storeCode)}
                          disabled={isLoading}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Final Confirmation */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-surface-muted/60 p-3.5 rounded-lg border border-subtle">
                    <p className="text-xs text-secondary leading-relaxed">
                      Please review your application summary. Once submitted, your application will enter the Platform Admin review queue.
                    </p>
                  </div>

                  {/* Summary Card 1: Applicant */}
                  <div className="rounded-xl border border-subtle bg-surface p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-subtle">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                          Applicant & Contact
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted block">Applicant Name:</span>
                        <span className="text-primary font-medium">{formData.applicantName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Email Address:</span>
                        <span className="text-primary font-medium">{formData.applicantEmail || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Mobile Number:</span>
                        <span className="text-primary font-medium font-mono">
                          {formData.applicantPhone ? `+91 ${formData.applicantPhone}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Card 2: Business & Licensing */}
                  <div className="rounded-xl border border-subtle bg-surface p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-subtle">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-accent" />
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                          Pharmacy Legal Entity
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted block">Legal Name:</span>
                        <span className="text-primary font-medium">{formData.businessName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Trade Name:</span>
                        <span className="text-primary font-medium">{formData.tradeName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Drug License:</span>
                        <span className="text-primary font-medium font-mono">{formData.drugLicenseNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">GSTIN:</span>
                        <span className="text-primary font-medium font-mono">{formData.gstin || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Card 3: Store & Location */}
                  <div className="rounded-xl border border-subtle bg-surface p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-subtle">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-success" />
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                          Dispensary Location (PIN First)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted block">Postal PIN Code:</span>
                        <span className="text-primary font-medium font-mono">{formData.postalCode || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">City / State:</span>
                        <span className="text-primary font-medium">
                          {formData.city && formData.state ? `${formData.city}, ${formData.state}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">Store Name:</span>
                        <span className="text-primary font-medium">{formData.storeName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Store Code:</span>
                        <span className="text-primary font-medium font-mono">{formData.storeCode || "—"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted block">Street Address:</span>
                        <span className="text-primary font-medium">
                          {[formData.addressLine1, formData.addressLine2].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Declaration Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 p-3.5 rounded-lg border border-subtle bg-surface-muted/50 cursor-pointer hover:bg-surface-muted transition-colors">
                      <input
                        type="checkbox"
                        checked={declarationChecked}
                        onChange={(e) => setDeclarationChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-subtle text-primary focus:ring-primary/20 accent-brand-500"
                      />
                      <span className="text-xs text-secondary leading-relaxed">
                        I hereby declare that all information submitted, including legal registration and drug licensing details, are valid, authentic, and compliant with applicable pharmacy regulations.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-subtle">
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
              <Link to="/login" className="text-xs text-secondary hover:text-primary transition-colors">
                ← Back to Sign In
              </Link>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-end gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleBack}
                  disabled={isLoading}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
              )}

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  isLoading={isValidatingAvailability}
                  disabled={isLoading || isValidatingAvailability}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="onboarding-form"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  disabled={!declarationChecked}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Submit Application
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
