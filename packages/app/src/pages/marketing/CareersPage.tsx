import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { careerApi, type CareerJob } from "../../services/careerApi";
import { cmsApi, type CmsPage } from "../../services/cmsApi";
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  Search,
  IndianRupee,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";

export const CareersPage: React.FC = () => {
  const [cmsData, setCmsData] = useState<CmsPage | null>(null);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");

  useEffect(() => {
    let mounted = true;
    cmsApi.getPublicPage("CAREERS")
      .then((res) => { if (mounted) setCmsData(res); })
      .catch((err) => console.warn("Using default CAREERS CMS data:", err));

    careerApi.getActiveJobs()
      .then((data) => {
        if (mounted) {
          if (data && data.length > 0) {
            setJobs(data);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not load dynamic career jobs, using fallback:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // If no DB jobs, use CMS seeded openings
  useEffect(() => {
    if (jobs.length === 0 && cmsData?.content?.openings && cmsData.content.openings.length > 0) {
      setJobs(
        cmsData.content.openings.map((op: any) => ({
          id: op.id || `role-${Math.random().toString(36).substring(7)}`,
          title: op.title || "Open Position",
          department: op.department || "General",
          location: op.location || "Bengaluru / Hybrid",
          employmentType: op.employmentType || op.type || "Full-Time",
          experienceLevel: op.experienceLevel || op.experience || "3+ Years",
          summary: op.summary || op.description || "",
          description: op.description || op.summary || "",
          responsibilities: [],
          requirements: [],
          benefits: cmsData.content.perks || [],
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
    }
  }, [cmsData, jobs.length]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => set.add(j.department));
    return ["ALL", ...Array.from(set)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchDept = selectedDepartment === "ALL" || j.department === selectedDepartment;
      const term = searchQuery.trim().toLowerCase();
      const matchSearch =
        !term ||
        j.title.toLowerCase().includes(term) ||
        j.location.toLowerCase().includes(term) ||
        j.summary.toLowerCase().includes(term);
      return matchDept && matchSearch;
    });
  }, [jobs, selectedDepartment, searchQuery]);

  return (
    <div className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <section className="text-center space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>We are actively hiring</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
          {cmsData?.title || "Shape the Future of Pharmacy Cloud Tech"}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {cmsData?.subtitle || "Join our mission to build India's high-speed, clinical-grade pharmacy operating system. Work with high-concurrency architectures, offline-sync protocols, and mission-critical healthcare infrastructure."}
        </p>

        {/* Value Props Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto">
          {[
            { icon: Briefcase, title: "Mission Driven", desc: "Healthcare & clinical impact" },
            { icon: Layers, title: "Modern Tech", desc: "React, Spring Boot 4, SQLite Sync" },
            { icon: Award, title: "Competitive Pay", desc: "Top compensation & ESOPs" },
            { icon: ShieldCheck, title: "High Autonomy", desc: "Remote & flexible culture" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-1 backdrop-blur-sm"
            >
              <item.icon className="w-5 h-5 text-teal-400" />
              <div className="text-xs font-bold text-white">{item.title}</div>
              <div className="text-[11px] text-slate-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Jobs Directory & Filter Section ───────────────────────────── */}
      <section className="space-y-8 pt-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Open Roles</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {filteredJobs.length} Available
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select an opening below to view full responsibilities, criteria, and apply.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by role or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        {/* Department Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedDepartment === dept
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {dept === "ALL" ? "All Departments" : dept}
            </button>
          ))}
        </div>

        {/* Job Listings Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-base font-semibold text-white">No Open Positions Match Your Search</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your department filter or search keywords, or submit an open inquiry to our talent team.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      {job.department}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                      {job.employmentType}
                    </span>
                    {job.salaryRange && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {job.salaryRange}
                      </span>
                    )}
                  </div>

                  <Link to={`/careers/${job.id}`}>
                    <h3 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                      {job.title}
                    </h3>
                  </Link>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {job.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      {job.experienceLevel} Experience
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to={`/careers/${job.id}`}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/careers/${job.id}/apply`}
                    className="px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-extrabold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apply Now
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
