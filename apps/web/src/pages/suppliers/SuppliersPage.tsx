import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Card,
  Button,
  Input,
  Badge,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Skeleton,
  Alert,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";
import type { SupplierStatus } from "@inventra/api-types";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";

export const SuppliersPage: React.FC = () => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const {
    data: suppliersPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["suppliers", businessId, { search: searchQuery, page, size: pageSize }],
    queryFn: () =>
      purchasingApi.listSuppliers({
        search: searchQuery,
        page,
        size: pageSize,
      }),
    enabled: !!businessId,
  });

  const getStatusVariant = (status: SupplierStatus) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INACTIVE":
        return "neutral";
      case "BLOCKED":
        return "danger";
      default:
        return "neutral";
    }
  };

  const totalPages = suppliersPage?.totalPages ?? 1;
  const totalElements = suppliersPage?.totalElements ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Suppliers & Vendors
            </h1>
            <Badge variant="outline" className="font-mono text-xs hidden sm:inline-flex">
              BUSINESS REGISTRY
            </Badge>
          </div>
          <p className="text-xs text-secondary mt-1">
            Vendor master registry, drug licenses, GST tax identifiers, and credit terms for{" "}
            <strong className="text-primary">{activeContext?.businessName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canManage && (
            <Link to="/suppliers/new">
              <Button variant="primary" size="sm" className="text-xs">
                <Plus className="h-4 w-4 mr-1" />
                Add Supplier
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <Input
            type="search"
            placeholder="Search supplier code, legal name, trade name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isError ? (
        <Alert variant="danger">
          <div>
            <h4 className="font-semibold text-sm">Failed to load suppliers</h4>
            <p className="text-xs mt-0.5">
              {(error as any)?.message || "An unexpected error occurred while fetching supplier records."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-xs">
              Retry
            </Button>
          </div>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !suppliersPage?.content || suppliersPage.content.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={searchQuery ? "No Matching Suppliers" : "No Suppliers Registered"}
          description={
            searchQuery
              ? `No suppliers matched "${searchQuery}".`
              : "Register your pharmaceutical distributors and manufacturers to begin tracking purchase receipts."
          }
          action={
            canManage && !searchQuery ? (
              <Link to="/suppliers/new">
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Supplier
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-subtle rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Drug License / GSTIN</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliersPage.content.map((s) => (
                  <TableRow key={s.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          to={`/suppliers/${s.id}`}
                          className="font-medium text-sm text-primary hover:text-accent hover:underline flex items-center gap-1.5"
                        >
                          {s.legalName}
                        </Link>
                        {s.tradeName && s.tradeName !== s.legalName && (
                          <span className="text-xs text-muted truncate max-w-xs">{s.tradeName}</span>
                        )}
                        <span className="text-[11px] font-mono text-muted">
                          Code: {s.supplierCode}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {s.supplierType}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-xs font-mono">
                        {s.drugLicenseNumber ? (
                          <span className="text-primary truncate max-w-xs">DL: {s.drugLicenseNumber}</span>
                        ) : (
                          <span className="text-muted">No DL</span>
                        )}
                        {s.gstin && <span className="text-muted text-[11px]">GSTIN: {s.gstin}</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-xs text-secondary">
                        {s.contactPersonName && <span className="font-medium">{s.contactPersonName}</span>}
                        {s.phoneNumber && (
                          <span className="flex items-center gap-1 text-muted text-[11px]">
                            <Phone className="h-2.5 w-2.5" />
                            {s.phoneNumber}
                          </span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1 text-muted text-[11px] truncate max-w-xs">
                            <Mail className="h-2.5 w-2.5" />
                            {s.email}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-secondary">
                      {s.paymentTermsDays > 0 ? `${s.paymentTermsDays} Days` : "Immediate"}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={getStatusVariant(s.status)} label={s.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <Link to={`/suppliers/${s.id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          Profile
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {suppliersPage.content.map((s) => (
              <Card key={s.id} className="p-3.5 border-subtle space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/suppliers/${s.id}`}
                      className="font-medium text-sm text-primary hover:text-accent"
                    >
                      {s.legalName}
                    </Link>
                    <p className="text-[11px] font-mono text-muted">Code: {s.supplierCode}</p>
                  </div>
                  <StatusBadge status={getStatusVariant(s.status)} label={s.status} />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {s.supplierType}
                  </Badge>
                  {s.paymentTermsDays > 0 && (
                    <span className="text-muted text-[11px] font-mono">Terms: {s.paymentTermsDays}d</span>
                  )}
                </div>

                {s.phoneNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-secondary">
                    <Phone className="h-3 w-3 text-muted" />
                    <span>{s.phoneNumber}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-subtle flex justify-end">
                  <Link to={`/suppliers/${s.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                      View Supplier Profile
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-subtle text-xs">
              <span className="text-muted">
                Showing Page <strong className="text-primary">{page + 1}</strong> of{" "}
                <strong className="text-primary">{totalPages}</strong> ({totalElements} suppliers)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isFetching}
                  className="h-8 text-xs"
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
