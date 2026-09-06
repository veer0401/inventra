import React, { useState } from "react";
import { type CareerJob, careerApi, type SubmitApplicationPayload } from "../../../services/careerApi";
import {
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  User,
  FileText,
  Send,
  Sparkles,
  Link as LinkIcon,
  MapPin,
  Mail,
  Phone,
  Building2,
  Clock,
  IndianRupee,
} from "lucide-react";

interface StepperApplyModalProps {
  job: CareerJob | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StepperApplyModal: React.FC<StepperApplyModalProps> = ({ job, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);

  const [form, setForm] = useState<SubmitApplicationPayload>({
    fullName: "",
    email: "",
    phone: "",
    currentLocation: "",
    linkedinUrl: "",
    portfolioUrl: "",
    experienceYears: 2.0,
    currentCompany: "",
    currentRole: "",
    noticePeriodDays: 30,
    currentCtc: "",
    expectedCtc: "",
    resumeUrl: "",
    coverLetter: "",
  });

  if (!job) return null;

  const validateStep = (step: number): boolean => {
    setSubmitError(null);
    if (step === 1) {
      if (!form.fullName.trim()) {
        setSubmitError("Full name is required.");
        return false;
      }
      if (!form.email.trim() || !form.email.includes("@")) {
        setSubmitError("Please enter a valid email address.");
        return false;
      }
      if (!form.phone.trim() || form.phone.trim().length < 8) {
        setSubmitError("Please enter a valid contact phone number.");
        return false;
      }
      if (!form.currentLocation.trim()) {
        setSubmitError("Current city/location is required.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (form.experienceYears < 0) {
        setSubmitError("Please enter a valid number of years of experience.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!form.resumeUrl.trim() || !form.resumeUrl.startsWith("http")) {
        setSubmitError("Please provide a valid accessible link to your resume (Google Drive, Dropbox, Notion, or cloud document).");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await careerApi.apply(job.id, form);
      setSuccessAppId(res.id);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || err.message || "Failed to submit job application. Please check details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Applying for Position</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">{job.title}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>{job.department}</span>
              <span>•</span>
              <span>{job.location}</span>
              <span>•</span>
              <span>{job.experienceLevel}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        {!successAppId && (
          <div className="bg-slate-950/60 px-6 py-3.5 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: "Contact Info", icon: User },
                { step: 2, title: "Experience", icon: Briefcase },
                { step: 3, title: "Resume & Links", icon: FileText },
                { step: 4, title: "Review & Submit", icon: Send },
              ].map((item, idx, arr) => {
                const isActive = currentStep === item.step;
                const isPassed = currentStep > item.step;
                return (
                  <React.Fragment key={item.step}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isPassed
                            ? "bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/30"
                            : isActive
                            ? "bg-teal-400/20 text-teal-300 border border-teal-500/50"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                      </div>
                      <span className={`text-xs font-medium hidden sm:inline ${
                        isActive ? "text-white font-bold" : isPassed ? "text-slate-300" : "text-slate-500"
                      }`}>
                        {item.title}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 transition-all ${isPassed ? "bg-teal-500" : "bg-slate-800"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {submitError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <span className="font-semibold">Notice:</span> {submitError}
            </div>
          )}

          {successAppId ? (
            /* ── Step 5: Success Confirmation ── */
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-teal-500/20 border border-teal-500/40 text-teal-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-white">Application Received!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{form.fullName}</strong>. Your application for{" "}
                <strong className="text-teal-400">{job.title}</strong> has been securely logged into our talent system.
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl inline-block text-xs font-mono text-slate-400">
                Application Reference ID: <span className="text-white font-semibold">{successAppId}</span>
              </div>
              <p className="text-xs text-slate-400">
                Our hiring and clinical technology team will review your background and reach out directly at{" "}
                <span className="text-slate-200">{form.email}</span>.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20"
                >
                  Done & Back to Careers
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── Step 1: Personal & Contact Information ── */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Step 1 of 4: Personal & Contact Information
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-400" /> Full Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="e.g. Dr. Rohan Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-teal-400" /> Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="rohan@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-400" /> Contact Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" /> Current City / Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.currentLocation}
                        onChange={(e) => setForm({ ...form, currentLocation: e.target.value })}
                        placeholder="e.g. Bengaluru, Karnataka (Open to relocation)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-teal-400" /> LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        value={form.linkedinUrl || ""}
                        onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-teal-400" /> GitHub / Portfolio Website
                      </label>
                      <input
                        type="url"
                        value={form.portfolioUrl || ""}
                        onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                        placeholder="https://github.com/username"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Professional Background & Experience ── */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Step 2 of 4: Experience & Current Employment
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400" /> Total Relevant Experience (Years) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        required
                        value={form.experienceYears}
                        onChange={(e) => setForm({ ...form, experienceYears: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400" /> Notice Period (Days)
                      </label>
                      <select
                        value={form.noticePeriodDays ?? 30}
                        onChange={(e) => setForm({ ...form, noticePeriodDays: parseInt(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value={0}>Immediate Joiner (0 days)</option>
                        <option value={15}>15 Days</option>
                        <option value={30}>30 Days (1 Month)</option>
                        <option value={60}>60 Days (2 Months)</option>
                        <option value={90}>90 Days (3 Months)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-400" /> Current Organization / Employer
                      </label>
                      <input
                        type="text"
                        value={form.currentCompany || ""}
                        onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
                        placeholder="e.g. Apollo Pharmacy / Tech Corp"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-teal-400" /> Current Designation / Title
                      </label>
                      <input
                        type="text"
                        value={form.currentRole || ""}
                        onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
                        placeholder="e.g. Software Engineer / Lead Pharmacist"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-teal-400" /> Current CTC (Annual)
                      </label>
                      <input
                        type="text"
                        value={form.currentCtc || ""}
                        onChange={(e) => setForm({ ...form, currentCtc: e.target.value })}
                        placeholder="e.g. ₹18 LPA"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-teal-400" /> Expected CTC (Annual)
                      </label>
                      <input
                        type="text"
                        value={form.expectedCtc || ""}
                        onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })}
                        placeholder="e.g. ₹24 LPA"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Resume URL & Motivation ── */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Step 3 of 4: Resume Document & Candidate Statement
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-400" /> Accessible Resume Link (URL) *
                      </label>
                      <input
                        type="url"
                        required
                        value={form.resumeUrl}
                        onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/... or Dropbox link"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                      />
                      <p className="text-[11px] text-slate-500">
                        Please ensure the link permissions are set to "Anyone with the link can view".
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Cover Note / Why are you interested in joining Inventra?
                      </label>
                      <textarea
                        rows={4}
                        value={form.coverLetter || ""}
                        onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                        placeholder="Share a brief overview of relevant projects, pharmaceutical experience, or why you want to build with us..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Review & Submit ── */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Step 4 of 4: Review Application Criteria
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <span className="text-slate-400 font-medium">Applied Position</span>
                      <span className="font-bold text-teal-400">{job.title}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Candidate</span>
                        <span className="font-semibold text-white">{form.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Contact</span>
                        <span className="text-slate-300">{form.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Email</span>
                        <span className="text-slate-300 truncate block">{form.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Current Location</span>
                        <span className="text-slate-300">{form.currentLocation}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Experience</span>
                        <span className="font-bold text-white">{form.experienceYears} Years</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Notice Period</span>
                        <span className="text-slate-300">{form.noticePeriodDays ?? 30} Days</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Expected CTC</span>
                        <span className="text-slate-300">{form.expectedCtc || "Flexible"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase mb-1">Resume Document URL</span>
                      <a
                        href={form.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-400 underline font-mono text-[11px] truncate block hover:text-teal-300"
                      >
                        {form.resumeUrl}
                      </a>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    By submitting this application, you authorize Inventra's recruiting team to verify details and contact you regarding open career opportunities.
                  </p>
                </div>
              )}

              {/* Stepper Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-400 font-semibold text-xs hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-extrabold text-xs hover:opacity-95 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Submitting Application…" : "Submit Application"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
