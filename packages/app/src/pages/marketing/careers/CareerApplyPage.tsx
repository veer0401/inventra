import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  careerApi,
  type CareerJob,
  type SubmitApplicationPayload,
  type JobApplication,
} from "../../../services/careerApi";
import { useToast } from "@inventra/ui";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Sparkles,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  IndianRupee,
  Link2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export const CareerApplyPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [job, setJob] = useState<CareerJob | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // Stepper State: 1 = Contact, 2 = Experience & CTC, 3 = Resume & Note, 4 = Review
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedApplication, setSubmittedApplication] = useState<JobApplication | null>(null);

  // Form State
  const [form, setForm] = useState<SubmitApplicationPayload>({
    fullName: "",
    email: "",
    phone: "",
    currentLocation: "",
    linkedinUrl: "",
    portfolioUrl: "",
    experienceYears: 3,
    currentCompany: "",
    currentRole: "",
    noticePeriodDays: 30,
    currentCtc: "",
    expectedCtc: "",
    resumeUrl: "",
    coverLetter: "",
  });

  useEffect(() => {
    if (!jobId) {
      navigate("/careers");
      return;
    }

    const fetchJob = async () => {
      setLoadingJob(true);
      try {
        const data = await careerApi.getJobById(jobId);
        setJob(data);
      } catch {
        toast.error("Failed to load position information.", "Error");
        navigate("/careers");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJob();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [jobId, navigate]);

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!form.fullName.trim()) {
        toast.error("Please provide your full name.", "Validation Error");
        return false;
      }
      if (!form.email.trim() || !form.email.includes("@")) {
        toast.error("Please provide a valid email address.", "Validation Error");
        return false;
      }
      if (!form.phone.trim() || form.phone.trim().length < 8) {
        toast.error("Please provide a valid phone contact number.", "Validation Error");
        return false;
      }
      if (!form.currentLocation.trim()) {
        toast.error("Please enter your current location.", "Validation Error");
        return false;
      }
    } else if (currentStep === 2) {
      if (form.experienceYears < 0) {
        toast.error("Experience years must be positive.", "Validation Error");
        return false;
      }
      if (!form.currentCtc || !form.currentCtc.trim()) {
        toast.error("Please enter your current CTC / compensation.", "Validation Error");
        return false;
      }
      if (!form.expectedCtc || !form.expectedCtc.trim()) {
        toast.error("Please enter your expected CTC / compensation.", "Validation Error");
        return false;
      }
    } else if (currentStep === 3) {
      if (!form.resumeUrl.trim()) {
        toast.error("Please provide a link to your resume document.", "Validation Error");
        return false;
      }
      if (!form.resumeUrl.startsWith("http://") && !form.resumeUrl.startsWith("https://")) {
        toast.error("Resume URL must start with http:// or https://", "Validation Error");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 100, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !job) return;

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await careerApi.submitApplication(jobId, form);
      setSubmittedApplication(res);
      toast.success("Your application has been received successfully!", "Application Submitted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to submit application.", "Submission Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen py-20 px-4 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center animate-pulse">
          <Briefcase className="w-6 h-6 text-teal-400" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading application system…</p>
      </div>
    );
  }

  // Celebratory Success View
  if (submittedApplication && job) {
    return (
      <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-teal-500/30 backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Application Submitted Successfully!
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Thank you for applying for the <strong className="text-teal-400">{job.title}</strong> role.
              A confirmation email has been logged and our recruitment committee will review your profile.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 max-w-md mx-auto space-y-1">
            <div className="flex justify-between">
              <span>Application ID:</span>
              <span className="font-mono text-teal-400 font-semibold">{submittedApplication.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Candidate:</span>
              <span className="text-white font-medium">{submittedApplication.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span className="text-white font-mono">{submittedApplication.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Current CTC:</span>
              <span className="text-emerald-400 font-semibold">{submittedApplication.currentCtc}</span>
            </div>
            <div className="flex justify-between">
              <span>Expected CTC:</span>
              <span className="text-emerald-400 font-semibold">{submittedApplication.expectedCtc}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/careers"
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20"
            >
              Explore Other Open Roles
            </Link>
            <Link
              to="/"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-all"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* ─── Header & Back Link ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <Link
          to={`/careers/${jobId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Job Description</span>
        </Link>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Job Application Flow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Apply for {job?.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {job?.department} • {job?.location} • {job?.employmentType}
          </p>
        </div>
      </div>

      {/* ─── Stepper Progress Indicator ─────────────────────────────────── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Personal Details" },
            { num: 2, label: "Experience & CTC" },
            { num: 3, label: "Resume & Cover" },
            { num: 4, label: "Review & Submit" },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step === s.num
                      ? "bg-teal-500 text-slate-950 ring-4 ring-teal-500/20 shadow-lg shadow-teal-500/25"
                      : step > s.num
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium text-center hidden sm:block ${
                    step === s.num ? "text-teal-400 font-bold" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    step > idx + 1 ? "bg-emerald-500" : "bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── Main Form Container ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-8">
        {/* STEP 1: CONTACT INFORMATION */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-teal-400" />
                <span>Step 1: Contact & Personal Details</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tell us who you are and how our recruiting team can get in touch with you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Arjun Verma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="arjun.verma@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Current Location / City *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={form.currentLocation}
                    onChange={(e) => setForm({ ...form, currentLocation: e.target.value })}
                    placeholder="e.g. Bengaluru, Karnataka (or Open to Relocate)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">LinkedIn Profile URL</label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={form.linkedinUrl || ""}
                    onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Portfolio / GitHub / Website</label>
                <div className="relative">
                  <ExternalLink className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={form.portfolioUrl || ""}
                    onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PROFESSIONAL EXPERIENCE & CTC */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-400" />
                <span>Step 2: Professional Background & Compensation</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Share your industry experience, current tenure, and compensation expectations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Total Relevant Experience (Years) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="40"
                  required
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Notice Period (Days) *</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  required
                  value={form.noticePeriodDays ?? 30}
                  onChange={(e) => setForm({ ...form, noticePeriodDays: parseInt(e.target.value, 10) || 0 })}
                  placeholder="e.g. 15, 30, 60, or 90 days"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Current Employer / Company</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.currentCompany || ""}
                    onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
                    placeholder="e.g. HealthTech Labs"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Current Designation / Role</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.currentRole || ""}
                    onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Current CTC (Required & Visible for Admin) */}
              <div className="space-y-1 p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                <label className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Current Annual CTC (Gross) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.currentCtc || ""}
                  onChange={(e) => setForm({ ...form, currentCtc: e.target.value })}
                  placeholder="e.g. ₹24 LPA or 24,00,000 / year"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-teal-500/40 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-400 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Helps us calibrate competitive compensation packages.</p>
              </div>

              {/* Expected CTC */}
              <div className="space-y-1 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Expected Annual CTC *</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.expectedCtc || ""}
                  onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })}
                  placeholder="e.g. ₹32 LPA or As per company standards"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 font-semibold"
                />
                <p className="text-[10px] text-slate-400">Your expectations for this opportunity.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESUME & COVER NOTE */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <span>Step 3: Resume Document & Cover Note</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Provide a accessible cloud link to your CV/Resume and an optional intro statement.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Resume Document URL (Google Drive, Dropbox, Notion, GitHub) *
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    value={form.resumeUrl}
                    onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Ensure the link permissions are set to <strong>"Anyone with the link can view"</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Why are you interested in joining Inventra? (Cover Statement)
                </label>
                <textarea
                  rows={4}
                  value={form.coverLetter || ""}
                  onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                  placeholder="Share a short note about your motivations, notable achievements, and relevant pharmacy / SaaS experience..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & VERIFY */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span>Step 4: Final Review & Submission</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Please verify your details before submitting your application.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Applicant Information
                </span>
                <div className="space-y-1">
                  <div><span className="text-slate-400">Name:</span> <strong className="text-white">{form.fullName}</strong></div>
                  <div><span className="text-slate-400">Email:</span> <strong className="text-white font-mono">{form.email}</strong></div>
                  <div><span className="text-slate-400">Phone:</span> <strong className="text-white font-mono">{form.phone}</strong></div>
                  <div><span className="text-slate-400">Location:</span> <strong className="text-white">{form.currentLocation}</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Experience & Compensation
                </span>
                <div className="space-y-1">
                  <div><span className="text-slate-400">Experience:</span> <strong className="text-white">{form.experienceYears} Years</strong></div>
                  <div><span className="text-slate-400">Current Role:</span> <strong className="text-white">{form.currentRole || "—"} at {form.currentCompany || "—"}</strong></div>
                  <div><span className="text-slate-400">Notice Period:</span> <strong className="text-white">{form.noticePeriodDays} Days</strong></div>
                  <div><span className="text-slate-400">Current CTC:</span> <strong className="text-emerald-400">{form.currentCtc}</strong></div>
                  <div><span className="text-slate-400">Expected CTC:</span> <strong className="text-emerald-400">{form.expectedCtc}</strong></div>
                </div>
              </div>

              <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Resume & Statement
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-400">Resume Link:</span>
                    <a href={form.resumeUrl} target="_blank" rel="noreferrer" className="text-teal-400 underline font-mono truncate">
                      {form.resumeUrl}
                    </a>
                  </div>
                  {form.coverLetter && (
                    <div className="pt-1 text-slate-300 italic">
                      "{form.coverLetter}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Footer Controls ────────────────────────────────────────── */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-7 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? "Submitting Application…" : "Submit Application"}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
