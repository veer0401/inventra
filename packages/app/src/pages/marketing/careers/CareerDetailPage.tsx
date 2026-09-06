import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  careerApi,
  type CareerJob,
} from "../../../services/careerApi";
import { useToast } from "@inventra/ui";
import {
  Briefcase,
  MapPin,
  Clock,
  IndianRupee,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Share2,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";

export const CareerDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const toast = useToast();

  const [job, setJob] = useState<CareerJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError("No job position specified.");
      setLoading(false);
      return;
    }

    const fetchJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await careerApi.getJobById(jobId);
        setJob(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [jobId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Job link copied to clipboard!", "Link Copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center animate-pulse">
          <Briefcase className="w-6 h-6 text-teal-400" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading role specification…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center space-y-6">
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold text-white">Opening Not Found</h2>
          <p className="text-sm text-slate-400">
            {error || "The position you are looking for may have been filled or is no longer accepting new applications."}
          </p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Explore All Open Positions</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-10">
      {/* ─── Breadcrumbs & Navigation ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/careers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Openings</span>
        </Link>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-850 transition-all"
        >
          <Share2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Share Job</span>
        </button>
      </div>

      {/* ─── Role Hero Banner ────────────────────────────────────────────── */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden space-y-6">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {job.department}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {job.employmentType}
          </span>
          {job.active && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Actively Hiring
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {job.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-3xl leading-relaxed">
            {job.summary}
          </p>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-400" /> Location
            </span>
            <div className="text-xs sm:text-sm font-bold text-white">{job.location}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" /> Experience
            </span>
            <div className="text-xs sm:text-sm font-bold text-white">{job.experienceLevel}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-emerald-400" /> Compensation
            </span>
            <div className="text-xs sm:text-sm font-bold text-emerald-400">
              {job.salaryRange || "Competitive"}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-purple-400" /> Workplace
            </span>
            <div className="text-xs sm:text-sm font-bold text-white">{job.employmentType}</div>
          </div>
        </div>

        {/* Primary CTA button */}
        <div className="pt-2 flex flex-wrap items-center gap-4">
          <Link
            to={`/careers/${job.id}/apply`}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Apply for this Position</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-400">
            Takes ~3 minutes • Multi-step progressive form
          </span>
        </div>
      </div>

      {/* ─── Two-Column Layout (Role Details + Overview Sidebar) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area (8 Columns) */}
        <div className="lg:col-span-8 space-y-10">
          {/* Detailed Role Description */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>About the Role & Mission</span>
            </h2>
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap">
              {job.description}
            </div>
          </section>

          {/* Key Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>What You'll Do & Key Responsibilities</span>
              </h2>
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                {job.responsibilities.map((resp, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </span>
                    <span className="leading-relaxed">{resp}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Requirements & Qualifications */}
          {job.requirements && job.requirements.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>What We're Looking For (Qualifications)</span>
              </h2>
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                {job.requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </span>
                    <span className="leading-relaxed">{req}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Benefits & Perks */}
          {job.benefits && job.benefits.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Perks & Growth Opportunities</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.benefits.map((ben, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 text-[10px] font-bold">
                      ✓
                    </span>
                    <span>{ben}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Summary Card (4 Columns) */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400">
              Role Summary
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-white">{job.department}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Location</span>
                <span className="font-semibold text-white">{job.location}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Experience</span>
                <span className="font-semibold text-white">{job.experienceLevel}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Employment Type</span>
                <span className="font-semibold text-white">{job.employmentType}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Salary Band</span>
                <span className="font-bold text-emerald-400">{job.salaryRange || "Competitive"}</span>
              </div>
            </div>

            <Link
              to={`/careers/${job.id}/apply`}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <span>Apply for this Role</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleShare}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
          </div>

          {/* About Inventra Card */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-white">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Why Inventra?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              We are building the future of pharmaceutical operating systems in India. Our platform manages high-speed POS billing, FEFO batch traceability, automated CDSCO compliance, and distributed offline sync across hospital and retail pharmacies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
