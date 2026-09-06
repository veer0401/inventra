import React, { useEffect, useState, useMemo } from "react";
import { useToast } from "@inventra/ui";
import {
  careerApi,
  type CareerJob,
  type JobApplication,
  type CreateJobPayload,
} from "../../services/careerApi";
import {
  Briefcase,
  Users,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Search,
  ExternalLink,
  Save,
  X,
  RefreshCw,
  ChevronRight,
  Mail,
  IndianRupee,
} from "lucide-react";

export const AdminCareersPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"OPENINGS" | "APPLICATIONS">("OPENINGS");

  // Jobs state
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const [jobForm, setJobForm] = useState<CreateJobPayload>({
    title: "",
    department: "Engineering",
    location: "Bengaluru / Remote",
    employmentType: "Full-time",
    experienceLevel: "3-5 years",
    salaryRange: "Competitive",
    summary: "",
    description: "",
    responsibilities: [],
    requirements: [],
    benefits: [],
    active: true,
  });

  const [newRespInput, setNewRespInput] = useState("");
  const [newReqInput, setNewReqInput] = useState("");
  const [newBenInput, setNewBenInput] = useState("");
  const [savingJob, setSavingJob] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilterJobId, setAppFilterJobId] = useState<string>("ALL");
  const [appFilterStatus, setAppFilterStatus] = useState<string>("ALL");
  const [appSearchTerm, setAppSearchTerm] = useState("");

  // Selected application for detail drawer
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [updatingAppStatus, setUpdatingAppStatus] = useState(false);
  const [appStatusInput, setAppStatusInput] = useState<string>("NEW");
  const [appAdminNotesInput, setAppAdminNotesInput] = useState<string>("");

  // Load Data
  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const data = await careerApi.getAllJobs();
      setJobs(data);
    } catch {
      toast.error("Failed to load career jobs.", "Error");
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const data = await careerApi.getApplications({
        jobId: appFilterJobId === "ALL" ? undefined : appFilterJobId,
        status: appFilterStatus === "ALL" ? undefined : appFilterStatus,
        search: appSearchTerm.trim() || undefined,
      });
      setApplications(data);
    } catch {
      toast.error("Failed to load candidate applications.", "Error");
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchApplications();
    }, 250);
    return () => clearTimeout(handler);
  }, [appFilterJobId, appFilterStatus, appSearchTerm]);

  // Handle open job modal for create / edit
  const handleOpenJobModal = (jobToEdit?: CareerJob) => {
    if (jobToEdit) {
      setEditingJobId(jobToEdit.id);
      setJobForm({
        title: jobToEdit.title,
        department: jobToEdit.department,
        location: jobToEdit.location,
        employmentType: jobToEdit.employmentType,
        experienceLevel: jobToEdit.experienceLevel,
        salaryRange: jobToEdit.salaryRange || "",
        summary: jobToEdit.summary,
        description: jobToEdit.description,
        responsibilities: [...(jobToEdit.responsibilities || [])],
        requirements: [...(jobToEdit.requirements || [])],
        benefits: [...(jobToEdit.benefits || [])],
        active: jobToEdit.active,
      });
    } else {
      setEditingJobId(null);
      setJobForm({
        title: "",
        department: "Engineering",
        location: "Bengaluru / Remote",
        employmentType: "Full-time",
        experienceLevel: "3-5 years",
        salaryRange: "Competitive",
        summary: "",
        description: "",
        responsibilities: [],
        requirements: [],
        benefits: [],
        active: true,
      });
    }
    setNewRespInput("");
    setNewReqInput("");
    setNewBenInput("");
    setShowJobModal(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.summary.trim() || !jobForm.description.trim()) {
      toast.error("Title, summary, and description are required.", "Validation Error");
      return;
    }

    setSavingJob(true);
    try {
      if (editingJobId) {
        await careerApi.updateJob(editingJobId, jobForm);
        toast.success(`Position '${jobForm.title}' updated successfully.`, "Job Updated");
      } else {
        await careerApi.createJob(jobForm);
        toast.success(`Position '${jobForm.title}' published successfully.`, "Job Created");
      }
      setShowJobModal(false);
      fetchJobs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message, "Operation Failed");
    } finally {
      setSavingJob(false);
    }
  };

  const handleDeleteJob = async (job: CareerJob) => {
    if (!confirm(`Are you sure you want to delete opening '${job.title}'? This will also remove any associated applications.`)) {
      return;
    }
    try {
      await careerApi.deleteJob(job.id);
      toast.success(`Job '${job.title}' deleted.`, "Job Deleted");
      fetchJobs();
      fetchApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message, "Delete Failed");
    }
  };

  const handleOpenAppDetail = (app: JobApplication) => {
    setSelectedApp(app);
    setAppStatusInput(app.status);
    setAppAdminNotesInput(app.adminNotes || "");
  };

  const handleUpdateAppStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setUpdatingAppStatus(true);
    try {
      const updated = await careerApi.updateApplicationStatus(selectedApp.id, {
        status: appStatusInput,
        adminNotes: appAdminNotesInput,
      });
      setSelectedApp(updated);
      toast.success(`Candidate status updated to '${appStatusInput}' & notification email sent.`, "Decision Saved");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message, "Update Failed");
    } finally {
      setUpdatingAppStatus(false);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.active).length;
    const totalApps = applications.length;
    const shortlisted = applications.filter((a) => a.status === "SHORTLISTED" || a.status === "HIRED").length;
    return { totalJobs, activeJobs, totalApps, shortlisted };
  }, [jobs, applications]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Talent & Recruiting Governance</span>
          </div>
          <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
            Careers & Hiring Portal
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Manage public job listings, role specifications, candidate stepper applications, and hiring pipeline decisions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border">
          <button
            onClick={() => setActiveTab("OPENINGS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "OPENINGS"
                ? "bg-teal-500 text-slate-950 shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Job Openings ({jobs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("APPLICATIONS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "APPLICATIONS"
                ? "bg-teal-500 text-slate-950 shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Applications ({applications.length})</span>
          </button>
        </div>
      </div>

      {/* ─── Metrics KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Roles", val: stats.activeJobs, sub: `out of ${stats.totalJobs} posted`, color: "text-teal-400" },
          { label: "Total Applications", val: stats.totalApps, sub: "all received resumes", color: "text-sky-400" },
          { label: "Shortlisted / Hired", val: stats.shortlisted, sub: "advanced candidates", color: "text-emerald-400" },
          { label: "Pending Review", val: applications.filter((a) => a.status === "NEW" || a.status === "REVIEWING").length, sub: "awaiting decision", color: "text-amber-400" },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-2xl bg-surface border border-border space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">{m.label}</span>
            <div className={`text-2xl font-black font-mono ${m.color}`}>{m.val}</div>
            <div className="text-[10px] text-muted">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── TAB 1: JOB OPENINGS ───────────────────────────────────────── */}
      {activeTab === "OPENINGS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-400" />
              <span>Configured Job Postings</span>
            </h2>
            <button
              onClick={() => handleOpenJobModal()}
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Role</span>
            </button>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
            {loadingJobs ? (
              <div className="p-12 text-center text-muted space-y-2">
                <Briefcase className="w-8 h-8 text-muted mx-auto opacity-40 animate-pulse" />
                <div className="text-sm font-semibold text-primary">Loading Job Postings...</div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center text-muted space-y-2">
                <Briefcase className="w-8 h-8 text-muted mx-auto opacity-40" />
                <div className="text-sm font-semibold text-primary">No Job Openings Found</div>
                <p className="text-xs text-secondary">
                  Click "Post New Role" above to publish your first career opportunity.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-secondary font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Position & Summary</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Location & Type</th>
                  <th className="p-3.5">Experience & Compensation</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-hover transition-colors">
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-primary text-sm">{j.title}</div>
                      <div className="text-secondary text-[11px] line-clamp-1 mt-0.5">{j.summary}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {j.department}
                      </span>
                    </td>
                    <td className="p-3.5 text-secondary">
                      <div>{j.location}</div>
                      <div className="text-muted text-[10px]">{j.employmentType}</div>
                    </td>
                    <td className="p-3.5 text-secondary">
                      <div>{j.experienceLevel}</div>
                      <div className="text-emerald-400 font-medium text-[10px]">{j.salaryRange || "Competitive"}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        j.active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {j.active ? "ACTIVE" : "CLOSED"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenJobModal(j)}
                          className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-all"
                          title="Edit role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(j)}
                          className="p-1.5 rounded-lg text-secondary hover:text-red-400 hover:bg-surface-raised transition-all"
                          title="Delete role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}

      {/* ─── TAB 2: CANDIDATE APPLICATIONS ─────────────────────────────── */}
      {activeTab === "APPLICATIONS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appSearchTerm}
                  onChange={(e) => setAppSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchApplications()}
                  placeholder="Search candidate name, email..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-primary placeholder:text-muted focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Job Filter */}
              <select
                value={appFilterJobId}
                onChange={(e) => setAppFilterJobId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Applied Positions</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={appFilterStatus}
                onChange={(e) => setAppFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Application Statuses</option>
                <option value="NEW">New Submissions</option>
                <option value="REVIEWING">Under Review</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <button
              onClick={fetchApplications}
              className="p-2 rounded-xl bg-surface-raised border border-border text-secondary hover:text-primary transition-all"
              title="Refresh applications"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Applications Table */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
            {loadingApps ? (
              <div className="p-12 text-center text-muted space-y-2">
                <Users className="w-8 h-8 text-muted mx-auto opacity-40 animate-pulse" />
                <div className="text-sm font-semibold text-primary">Loading Candidate Applications...</div>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-muted space-y-2">
                <Users className="w-8 h-8 text-muted mx-auto opacity-40" />
                <div className="text-sm font-semibold text-primary">No Applications Found</div>
                <p className="text-xs text-secondary">
                  Applications submitted from the public careers page will appear here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-secondary font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Applicant Candidate</th>
                    <th className="p-3.5">Position</th>
                    <th className="p-3.5">Experience & Notice</th>
                    <th className="p-3.5">Compensation & CTC</th>
                    <th className="p-3.5">Current Role & Org</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-primary text-sm">{app.fullName}</div>
                        <div className="text-secondary text-[11px] font-mono">{app.email}</div>
                        <div className="text-muted text-[10px]">{app.phone} • {app.currentLocation}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-teal-400">{app.jobTitle}</div>
                      </td>
                      <td className="p-3.5 text-secondary">
                        <div className="font-semibold">{app.experienceYears} Years Exp</div>
                        <div className="text-muted text-[10px]">{app.noticePeriodDays ?? 30} Days Notice</div>
                      </td>
                      <td className="p-3.5 text-secondary">
                        <div className="font-bold text-emerald-400">Current: {app.currentCtc || "—"}</div>
                        <div className="text-muted text-[10px]">Expected: {app.expectedCtc || "Flexible"}</div>
                      </td>
                      <td className="p-3.5 text-secondary">
                        <div>{app.currentRole || "Not specified"}</div>
                        <div className="text-muted text-[10px]">{app.currentCompany || "—"}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === "HIRED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : app.status === "SHORTLISTED"
                            ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                            : app.status === "REJECTED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : app.status === "INTERVIEW_SCHEDULED"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenAppDetail(app)}
                          className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          Review Candidate
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT JOB OPENING MODAL ───────────────────────────── */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-border bg-surface-raised flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-primary">
                  {editingJobId ? "Edit Job Opening" : "Publish New Job Opening"}
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Specify roles, responsibilities, requirements, and location for the public careers page.
                </p>
              </div>
              <button
                onClick={() => setShowJobModal(false)}
                className="p-2 rounded-xl text-secondary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-primary">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Senior Fullstack Engineer"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">Department *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    placeholder="Engineering / Clinical / Operations"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">Location *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g. Bengaluru / Remote (India)"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">Employment Type *</label>
                  <select
                    value={jobForm.employmentType}
                    onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote / Hybrid">Remote / Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">Experience Level *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.experienceLevel}
                    onChange={(e) => setJobForm({ ...jobForm, experienceLevel: e.target.value })}
                    placeholder="e.g. 3-5 years"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary">Salary / Compensation</label>
                  <input
                    type="text"
                    value={jobForm.salaryRange || ""}
                    onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    placeholder="e.g. ₹20L - ₹30L + ESOPs"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-primary">Short Summary *</label>
                  <textarea
                    rows={2}
                    required
                    value={jobForm.summary}
                    onChange={(e) => setJobForm({ ...jobForm, summary: e.target.value })}
                    placeholder="Brief 1-2 sentence preview for cards..."
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-primary">Full Description *</label>
                  <textarea
                    rows={4}
                    required
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Comprehensive overview of the role, mission, and team context..."
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Roles & Responsibilities Builder */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-bold text-primary uppercase tracking-wider text-teal-400">
                  Roles & Responsibilities
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRespInput}
                    onChange={(e) => setNewRespInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newRespInput.trim()) {
                          setJobForm({ ...jobForm, responsibilities: [...(jobForm.responsibilities || []), newRespInput.trim()] });
                          setNewRespInput("");
                        }
                      }
                    }}
                    placeholder="Add a key responsibility and press Enter..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRespInput.trim()) {
                        setJobForm({ ...jobForm, responsibilities: [...(jobForm.responsibilities || []), newRespInput.trim()] });
                        setNewRespInput("");
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs font-bold text-teal-400 hover:bg-surface transition-all"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {(jobForm.responsibilities || []).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-raised border border-border text-xs">
                      <span className="text-secondary">{r}</span>
                      <button
                        type="button"
                        onClick={() => setJobForm({ ...jobForm, responsibilities: (jobForm.responsibilities || []).filter((_, idx) => idx !== i) })}
                        className="text-muted hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements & Qualifications Builder */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-bold text-primary uppercase tracking-wider text-teal-400">
                  Requirements & Qualifications
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newReqInput}
                    onChange={(e) => setNewReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newReqInput.trim()) {
                          setJobForm({ ...jobForm, requirements: [...(jobForm.requirements || []), newReqInput.trim()] });
                          setNewReqInput("");
                        }
                      }
                    }}
                    placeholder="Add a qualification criteria..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newReqInput.trim()) {
                        setJobForm({ ...jobForm, requirements: [...(jobForm.requirements || []), newReqInput.trim()] });
                        setNewReqInput("");
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs font-bold text-teal-400 hover:bg-surface transition-all"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {(jobForm.requirements || []).map((req, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-raised border border-border text-xs">
                      <span className="text-secondary">{req}</span>
                      <button
                        type="button"
                        onClick={() => setJobForm({ ...jobForm, requirements: (jobForm.requirements || []).filter((_, idx) => idx !== i) })}
                        className="text-muted hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits & Perks Builder */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-bold text-primary uppercase tracking-wider text-teal-400">
                  Perks & Benefits
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBenInput}
                    onChange={(e) => setNewBenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newBenInput.trim()) {
                          setJobForm({ ...jobForm, benefits: [...(jobForm.benefits || []), newBenInput.trim()] });
                          setNewBenInput("");
                        }
                      }
                    }}
                    placeholder="Add a benefit (e.g. Comprehensive Health Cover, Learning Stipend)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newBenInput.trim()) {
                        setJobForm({ ...jobForm, benefits: [...(jobForm.benefits || []), newBenInput.trim()] });
                        setNewBenInput("");
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs font-bold text-teal-400 hover:bg-surface transition-all"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {(jobForm.benefits || []).map((ben, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-raised border border-border text-xs">
                      <span className="text-secondary">{ben}</span>
                      <button
                        type="button"
                        onClick={() => setJobForm({ ...jobForm, benefits: (jobForm.benefits || []).filter((_, idx) => idx !== i) })}
                        className="text-muted hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <input
                  type="checkbox"
                  id="job-active"
                  checked={jobForm.active}
                  onChange={(e) => setJobForm({ ...jobForm, active: e.target.checked })}
                  className="rounded text-teal-500 focus:ring-teal-500"
                />
                <label htmlFor="job-active" className="text-xs font-semibold text-primary">
                  Active (Display this position publicly on Careers page)
                </label>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 rounded-xl text-secondary hover:text-primary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingJob}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingJob ? "Saving Role…" : editingJobId ? "Update Job" : "Publish Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CANDIDATE PROFILE & HIRING DECISION MODAL ────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-border bg-surface-raised flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Candidate Application Profile
                </span>
                <h2 className="text-xl font-black text-primary">{selectedApp.fullName}</h2>
                <div className="text-xs text-secondary mt-0.5">Applied for {selectedApp.jobTitle}</div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-xl text-secondary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Contact Card */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase">Email</span>
                  <a href={`mailto:${selectedApp.email}`} className="text-teal-400 underline font-mono">
                    {selectedApp.email}
                  </a>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Phone</span>
                  <a href={`tel:${selectedApp.phone}`} className="text-primary font-mono">
                    {selectedApp.phone}
                  </a>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Location</span>
                  <span className="text-primary">{selectedApp.currentLocation}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Applied Date</span>
                  <span className="text-secondary font-mono">{new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Experience & Compensation Card */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Experience</span>
                  <span className="text-primary font-bold">{selectedApp.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Notice Period</span>
                  <span className="text-primary font-semibold">{selectedApp.noticePeriodDays ?? 30} Days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface border border-emerald-500/30">
                  <span className="text-muted block text-[10px] uppercase font-semibold text-emerald-400">Current CTC</span>
                  <span className="text-emerald-400 font-black text-xs sm:text-sm flex items-center gap-0.5 mt-0.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {selectedApp.currentCtc || "Not Specified"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface border border-teal-500/30">
                  <span className="text-muted block text-[10px] uppercase font-semibold text-teal-400">Expected CTC</span>
                  <span className="text-primary font-bold text-xs sm:text-sm flex items-center gap-0.5 mt-0.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {selectedApp.expectedCtc || "Flexible"}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-border">
                  <span className="text-muted block text-[10px] uppercase">Current Employer & Title</span>
                  <span className="text-primary font-medium">
                    {selectedApp.currentRole ? `${selectedApp.currentRole} at ` : ""}{selectedApp.currentCompany || "Not specified"}
                  </span>
                </div>
              </div>

              {/* Links & Resume */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider text-teal-400">
                  Credentials & Resume
                </span>
                <div className="flex flex-col gap-2">
                  <a
                    href={selectedApp.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold flex items-center justify-between hover:bg-teal-500/20 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      View / Open Candidate Resume Document
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {selectedApp.linkedinUrl && (
                    <a
                      href={selectedApp.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-secondary hover:text-teal-400 flex items-center gap-1.5 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> LinkedIn Profile: {selectedApp.linkedinUrl}
                    </a>
                  )}
                  {selectedApp.portfolioUrl && (
                    <a
                      href={selectedApp.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-secondary hover:text-teal-400 flex items-center gap-1.5 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Portfolio / GitHub: {selectedApp.portfolioUrl}
                    </a>
                  )}
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApp.coverLetter && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider text-teal-400">
                    Candidate Cover Statement
                  </span>
                  <p className="p-3.5 rounded-xl bg-surface-raised border border-border text-xs text-secondary leading-relaxed whitespace-pre-wrap">
                    {selectedApp.coverLetter}
                  </p>
                </div>
              )}

              {/* Hiring Decision & Internal Notes */}
              <form onSubmit={handleUpdateAppStatus} className="p-4 rounded-2xl bg-surface border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider text-teal-400">
                    Hiring Decision Pipeline
                  </span>
                  <span className="text-[11px] text-muted">Take Candidate / Advance Status</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-primary">Candidate Status</label>
                    <select
                      value={appStatusInput}
                      onChange={(e) => setAppStatusInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary font-bold focus:outline-none focus:border-teal-500"
                    >
                      <option value="NEW">NEW</option>
                      <option value="REVIEWING">REVIEWING</option>
                      <option value="SHORTLISTED">SHORTLISTED (Advance to interview)</option>
                      <option value="INTERVIEW_SCHEDULED">INTERVIEW SCHEDULED</option>
                      <option value="OFFERED">OFFERED</option>
                      <option value="HIRED">HIRED (Take this person!)</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-teal-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> Automated Notification
                    </label>
                    <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 leading-tight">
                      Saving sends a branded email to <strong>{selectedApp.email}</strong> with status details & next steps.
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-primary">Internal Admin Notes</label>
                    <textarea
                      rows={2}
                      value={appAdminNotesInput}
                      onChange={(e) => setAppAdminNotesInput(e.target.value)}
                      placeholder="Notes on candidate interview performance, feedback, or compensation agreement..."
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-primary focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updatingAppStatus}
                    className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {updatingAppStatus ? "Saving Decision…" : "Save Hiring Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
