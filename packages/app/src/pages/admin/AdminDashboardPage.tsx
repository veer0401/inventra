import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Store,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { Card, Badge, Spinner } from "@inventra/ui";
import { apiClient } from "../../services/api";
import type { OnboardingApplicationSummaryResponse } from "@inventra/api-types";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  status?: "default" | "success" | "warning" | "destructive";
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, status = "default", subtitle }) => {
  const statusColors = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-danger",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-1">{title}</p>
          <p className={`text-2xl font-bold ${statusColors[status]} mb-1`}>{value}</p>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-surface-muted ${statusColors[status]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};

interface ApplicationItemProps {
  businessName: string;
  applicantName: string;
  submittedAt: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}

const ApplicationItem: React.FC<ApplicationItemProps> = ({
  businessName,
  applicantName,
  submittedAt,
  status,
}) => {
  const statusConfig = {
    PENDING_REVIEW: { icon: Clock, label: "Pending", variant: "warning" as const },
    APPROVED: { icon: CheckCircle2, label: "Approved", variant: "success" as const },
    REJECTED: { icon: XCircle, label: "Rejected", variant: "destructive" as const },
  };

  const config = statusConfig[status] || statusConfig.PENDING_REVIEW;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-subtle hover:bg-surface-muted transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{businessName}</p>
        <p className="text-xs text-secondary">{applicantName}</p>
        <p className="text-xs text-muted mt-0.5">{new Date(submittedAt).toLocaleDateString()}</p>
      </div>
      <Badge variant={config.variant} className="flex items-center gap-1.5">
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </Badge>
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const [applications, setApplications] = useState<OnboardingApplicationSummaryResponse[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      try {
        setIsLoading(true);
        // Fetch all onboarding applications
        const res = await apiClient.get<
          { content?: OnboardingApplicationSummaryResponse[]; totalElements?: number } | OnboardingApplicationSummaryResponse[]
        >("/api/v1/admin/onboarding/applications");

        if (!isMounted) return;

        let apps: OnboardingApplicationSummaryResponse[] = [];
        let total = 0;

        if (res.data && "content" in res.data && res.data.content) {
          apps = res.data.content;
          total = res.data.totalElements ?? apps.length;
        } else if (Array.isArray(res.data)) {
          apps = res.data;
          total = apps.length;
        }

        setApplications(apps);
        setTotalCount(total);
        setPendingCount(apps.filter((a) => a.status === "PENDING_REVIEW").length);
      } catch {
        // Backend unavailable or auth failed
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingApplications = applications.filter((a) => a.status === "PENDING_REVIEW");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Platform Dashboard</h1>
          <p className="text-sm text-secondary">
            Global administrative governance for onboarding applications and platform status
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Activity className="h-4 w-4 text-success animate-pulse" />
          <span className="font-medium text-success">Platform Operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Applications"
          value={isLoading ? "—" : pendingCount}
          icon={ShieldCheck}
          status={pendingCount > 0 ? "warning" : "default"}
          subtitle="Awaiting administrative verification"
        />
        <StatCard
          title="Total Applications"
          value={isLoading ? "—" : totalCount}
          icon={Building2}
          subtitle="All submitted pharmacy applications"
        />
        <StatCard
          title="Tenant Businesses"
          value="—"
          icon={Store}
          subtitle="Platform API available in Phase F9"
        />
        <StatCard
          title="Global Users"
          value="—"
          icon={Users}
          subtitle="Platform API available in Phase F9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Requiring Review */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-primary">Applications Pending Review</h2>
              <p className="text-xs text-secondary mt-0.5">
                Pharmacy registrations requiring license and credential verification
              </p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="warning" className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {pendingCount} Pending
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="py-8 text-center">
                <Spinner size="md" />
              </div>
            ) : pendingApplications.length > 0 ? (
              pendingApplications.slice(0, 5).map((app) => (
                <ApplicationItem
                  key={app.id}
                  businessName={app.businessName}
                  applicantName={app.applicantName}
                  submittedAt={app.submittedAt}
                  status={app.status}
                />
              ))
            ) : (
              <div className="text-center py-8 text-sm text-muted">
                <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-40 text-primary" />
                <p className="font-medium text-secondary">No pending applications</p>
                <p className="text-xs mt-0.5">All pharmacy onboarding applications have been processed.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-subtle flex items-center justify-between">
            <Link
              to="/admin/applications"
              className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-1.5"
            >
              <span>Go to Applications Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-xs text-muted font-mono">{applications.length} loaded</span>
          </div>
        </Card>

        {/* Quick Actions & Governance */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-primary mb-1">Quick Actions</h2>
            <p className="text-xs text-secondary mb-4">Active administrative consoles</p>
          <div className="space-y-3">
              <Link
                to="/admin/applications"
                className="flex items-center gap-3 p-3 rounded-lg border border-subtle hover:border-primary hover:bg-surface-muted transition-all group"
              >
                <div className="p-2 rounded bg-primary-subtle text-primary border border-primary-border">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary group-hover:text-primary-hover">
                    Review Applications
                  </p>
                  <p className="text-[11px] text-secondary truncate">
                    Approve or reject pharmacy onboarding
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/admin/subscriptions"
                className="flex items-center gap-3 p-3 rounded-lg border border-subtle hover:border-primary hover:bg-surface-muted transition-all group"
              >
                <div className="p-2 rounded bg-primary-subtle text-primary border border-primary-border">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary group-hover:text-primary-hover">
                    Manage Subscriptions
                  </p>
                  <p className="text-[11px] text-secondary truncate">
                    Plans, pricing &amp; payment governance
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-subtle">
            <div className="flex items-center justify-between text-xs text-muted font-mono">
              <span>Inventra Platform v1.0.0</span>
              <span className="text-success">REST Online</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
