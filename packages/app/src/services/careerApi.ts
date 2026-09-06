import { apiClient } from "./api";

export interface CareerJob {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  salaryRange?: string | null;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  title: string;
  department: string;
  location: string;
  employmentType?: string;
  experienceLevel: string;
  salaryRange?: string;
  summary: string;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  active?: boolean;
}

export type UpdateJobPayload = CreateJobPayload;

export interface SubmitApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  experienceYears: number;
  currentCompany?: string;
  currentRole?: string;
  noticePeriodDays?: number;
  currentCtc?: string;
  expectedCtc?: string;
  resumeUrl: string;
  coverLetter?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  experienceYears: number;
  currentCompany?: string;
  currentRole?: string;
  noticePeriodDays?: number;
  currentCtc?: string;
  expectedCtc?: string;
  resumeUrl: string;
  coverLetter?: string;
  status: "NEW" | "REVIEWING" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "OFFERED" | "HIRED" | "REJECTED";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateApplicationStatusPayload {
  status: string;
  adminNotes?: string;
}

export const careerApi = {
  // Public APIs
  async getActiveJobs(): Promise<CareerJob[]> {
    const res = await apiClient.get<CareerJob[]>("/api/v1/public/careers/jobs");
    return res.data || [];
  },

  async getJobById(id: string): Promise<CareerJob> {
    const res = await apiClient.get<CareerJob>(`/api/v1/public/careers/jobs/${id}`);
    return res.data;
  },

  async apply(jobId: string, payload: SubmitApplicationPayload): Promise<JobApplication> {
    const res = await apiClient.post<JobApplication>(`/api/v1/public/careers/jobs/${jobId}/apply`, payload);
    return res.data;
  },

  async submitApplication(jobId: string, payload: SubmitApplicationPayload): Promise<JobApplication> {
    return this.apply(jobId, payload);
  },

  // Admin APIs
  async getAllJobs(): Promise<CareerJob[]> {
    const res = await apiClient.get<CareerJob[]>("/api/v1/admin/careers/jobs");
    return res.data || [];
  },

  async createJob(payload: CreateJobPayload): Promise<CareerJob> {
    const res = await apiClient.post<CareerJob>("/api/v1/admin/careers/jobs", payload);
    return res.data;
  },

  async updateJob(id: string, payload: UpdateJobPayload): Promise<CareerJob> {
    const res = await apiClient.put<CareerJob>(`/api/v1/admin/careers/jobs/${id}`, payload);
    return res.data;
  },

  async deleteJob(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/admin/careers/jobs/${id}`);
  },

  async getApplications(params?: { jobId?: string; status?: string; search?: string }): Promise<JobApplication[]> {
    const query = new URLSearchParams();
    if (params?.jobId) query.append("jobId", params.jobId);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);

    const qs = query.toString();
    const url = `/api/v1/admin/careers/applications${qs ? `?${qs}` : ""}`;
    const res = await apiClient.get<JobApplication[]>(url);
    return res.data || [];
  },

  async getApplicationById(id: string): Promise<JobApplication> {
    const res = await apiClient.get<JobApplication>(`/api/v1/admin/careers/applications/${id}`);
    return res.data;
  },

  async updateApplicationStatus(id: string, payload: UpdateApplicationStatusPayload): Promise<JobApplication> {
    const res = await apiClient.patch<JobApplication>(`/api/v1/admin/careers/applications/${id}/status`, payload);
    return res.data;
  },
};
