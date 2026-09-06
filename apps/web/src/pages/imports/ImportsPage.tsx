import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Calendar,
  Layers,
  Users,
  Building2,
  Boxes,
} from "lucide-react";
import { importApi } from "../../services/importApi";
import { StatusBadge, Button, Card, Input, Spinner, EmptyState } from "@inventra/ui";
import type { ImportDomain, ImportJobStatus } from "@inventra/api-types";

const DOMAIN_FILTERS: { label: string; value: string }[] = [
  { label: "All Domains", value: "" },
  { label: "Product Master Catalog", value: "PRODUCT_CATALOG" },
  { label: "Customer Directory", value: "CUSTOMERS" },
  { label: "Supplier Directory", value: "SUPPLIERS" },
  { label: "Opening Stock & Inventory", value: "INVENTORY" },
];

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Posted to Ledger", value: "POSTED" },
  { label: "Partially Posted", value: "PARTIALLY_POSTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export const ImportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [domainFilter, setDomainFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(0);
  const pageSize = 15;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["imports-list", domainFilter, statusFilter, page],
    queryFn: () =>
      importApi.listImports({
        domain: domainFilter ? (domainFilter as ImportDomain) : undefined,
        status: statusFilter ? (statusFilter as ImportJobStatus) : undefined,
        page,
        size: pageSize,
      }),
  });

  const importJobs = data?.content || [];
  const totalPages = data?.totalPages || 0;

  const getDomainIcon = (domain: ImportDomain) => {
    switch (domain) {
      case "PRODUCT_CATALOG":
        return <Layers className="h-4 w-4 text-blue-500" />;
      case "CUSTOMERS":
        return <Users className="h-4 w-4 text-emerald-500" />;
      case "SUPPLIERS":
        return <Building2 className="h-4 w-4 text-amber-500" />;
      case "INVENTORY":
        return <Boxes className="h-4 w-4 text-purple-500" />;
      default:
        return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDomainLabel = (domain: ImportDomain) => {
    switch (domain) {
      case "PRODUCT_CATALOG":
        return "Products Catalog";
      case "CUSTOMERS":
        return "Customers";
      case "SUPPLIERS":
        return "Suppliers";
      case "INVENTORY":
        return "Opening Inventory";
      default:
        return domain;
    }
  };

  const filteredJobs = React.useMemo(() => {
    if (!searchQuery.trim()) return importJobs;
    const q = searchQuery.toLowerCase();
    return importJobs.filter(
      (job) =>
        job.originalFilename.toLowerCase().includes(q) ||
        job.importDomain.toLowerCase().includes(q)
    );
  }, [importJobs, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Universal Ingestion & Data Import
              </h1>
              <p className="text-sm text-muted-foreground">
                Zero Direct Mutation pipeline for bulk importing master catalogs, contacts, and inventory drafts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => navigate("/imports/new")}
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Upload New CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search filename or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="sm:col-span-3">
          <select
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value);
              setPage(0);
            }}
            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {DOMAIN_FILTERS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading import jobs...</p>
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/30 bg-destructive/5 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground">Failed to Load Import Jobs</h3>
          <p className="text-sm text-muted-foreground">Could not connect to the ingestion service.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <EmptyState
            icon={<UploadCloud className="h-8 w-8 text-muted-foreground" />}
            title="No Import Jobs Found"
            description={
              domainFilter || statusFilter || searchQuery
                ? "No import jobs match your filters. Try clearing filter selections."
                : "Upload CSV files to ingest product catalogs, customer directories, suppliers, or opening stock."
            }
            action={
              domainFilter || statusFilter || searchQuery ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDomainFilter("");
                    setStatusFilter("");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate("/imports/new")} className="gap-1">
                  <Plus className="h-4 w-4" />
                  <span>Start First Ingestion</span>
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border/80 uppercase">
                <tr>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Rows Breakdown</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-muted/25 transition-colors cursor-pointer"
                    onClick={() => navigate(`/imports/${job.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        {getDomainIcon(job.importDomain)}
                        <span>{getDomainLabel(job.importDomain)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-medium text-foreground">
                      {job.originalFilename}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">{job.totalRows} total</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {job.validRows} valid
                        </span>
                        {job.invalidRows > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-destructive font-bold">
                              {job.invalidRows} errors
                            </span>
                          </>
                        )}
                        {job.skippedRows > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {job.skippedRows} skipped
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(job.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/imports/${job.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{job.status === "PENDING_REVIEW" ? "Review & Verify" : "View"}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
