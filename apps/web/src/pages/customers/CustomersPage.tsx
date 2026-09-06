import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Search, Phone, Mail, ArrowRight, Edit, Loader2, AlertCircle } from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { CustomerFormModal } from "../../components/customers/CustomerFormModal";
import type { CustomerSummaryResponse, CustomerResponse, CustomerStatus } from "@inventra/api-types";

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  const [data, setData] = useState<{
    content: CustomerSummaryResponse[];
    totalPages: number;
    totalElements: number;
  }>({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerResponse | null>(null);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await customerApi.listCustomers({
        search: search.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        size: pageSize,
      });
      setData({
        content: res.content,
        totalPages: res.totalPages,
        totalElements: res.totalElements,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, page]);

  // Listen for global "new customer" event
  useEffect(() => {
    const handleNewCustomerEvent = () => {
      setEditingCustomer(null);
      setIsFormOpen(true);
    };
    window.addEventListener("inventra:open-new-customer", handleNewCustomerEvent);
    return () => {
      window.removeEventListener("inventra:open-new-customer", handleNewCustomerEvent);
    };
  }, []);

  const handleEditClick = async (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation();
    try {
      const fullCustomer = await customerApi.getCustomer(customerId);
      setEditingCustomer(fullCustomer);
      setIsFormOpen(true);
    } catch (err: any) {
      alert("Failed to load customer details for editing");
    }
  };

  const handleFormSuccess = () => {
    fetchCustomers();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Customer Management</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {data.totalElements} Total
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Patient directory, contact profiles, and commercial purchasing history
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
          <span className="hidden sm:inline-block rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-mono">N C</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name, phone, or customer code..."
            className="w-full rounded-lg border border-border bg-surface-subtle pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(0);
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Data Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading customer directory...</p>
          </div>
        ) : data.content.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-primary">
              <thead className="border-b border-border bg-surface-subtle text-xs font-semibold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.content.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => navigate(`/customers/${cust.id}`)}
                    className="hover:bg-surface-subtle cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {cust.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">{cust.fullName}</div>
                          <div className="text-xs font-mono text-text-muted">{cust.customerCode}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Phone className="h-3.5 w-3.5 text-text-muted" />
                        <span className="font-mono text-xs">{cust.phone}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {cust.email ? (
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Mail className="h-3.5 w-3.5 text-text-muted" />
                          <span className="text-xs truncate max-w-xs">{cust.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          cust.status === "ACTIVE"
                            ? "bg-success-subtle text-success-fg border border-success-border"
                            : cust.status === "INACTIVE"
                            ? "bg-warning-subtle text-warning-fg border border-warning-border"
                            : "bg-destructive-subtle text-destructive-fg border border-destructive-border"
                        }`}
                      >
                        {cust.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-text-muted">
                      {new Date(cust.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleEditClick(e, cust.id)}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${cust.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
                        >
                          <span>Profile</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-text-muted opacity-40 mb-3" />
            <h3 className="text-base font-semibold text-text-primary">No customers found</h3>
            <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
              {search ? `No customer profile matches "${search}"` : "You have not registered any customer profiles yet."}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setIsFormOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span>Register First Customer</span>
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3.5 text-xs text-text-secondary">
            <span>
              Showing Page {page + 1} of {data.totalPages} ({data.totalElements} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {isFormOpen && (
        <CustomerFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
          customer={editingCustomer}
        />
      )}
    </div>
  );
};
