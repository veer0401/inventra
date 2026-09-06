import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Edit,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { CustomerFormModal } from "../../components/customers/CustomerFormModal";
import { usePosCartStore } from "../../stores/posCartStore";
import type { CustomerResponse, SaleResponse, SaleReturnResponse } from "@inventra/api-types";

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPosCustomer = usePosCartStore((state) => state.setCustomer);

  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "returns">("overview");

  // Sales tab state
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [salesPage, setSalesPage] = useState(0);
  const [salesTotalPages, setSalesTotalPages] = useState(0);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Returns tab state
  const [returns, setReturns] = useState<SaleReturnResponse[]>([]);
  const [returnsPage, setReturnsPage] = useState(0);
  const [returnsTotalPages, setReturnsTotalPages] = useState(0);
  const [isLoadingReturns, setIsLoadingReturns] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchCustomerProfile = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await customerApi.getCustomer(id);
      setCustomer(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load customer profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [id]);

  // Load sales history on tab activation
  useEffect(() => {
    if (!id || activeTab !== "sales") return;
    const fetchSales = async () => {
      try {
        setIsLoadingSales(true);
        const res = await customerApi.getCustomerSales(id, salesPage, 10);
        setSales(res.content);
        setSalesTotalPages(res.totalPages);
      } catch (err) {
        // Log or handle error
      } finally {
        setIsLoadingSales(false);
      }
    };
    fetchSales();
  }, [id, activeTab, salesPage]);

  // Load returns history on tab activation
  useEffect(() => {
    if (!id || activeTab !== "returns") return;
    const fetchReturns = async () => {
      try {
        setIsLoadingReturns(true);
        const res = await customerApi.getCustomerReturns(id, returnsPage, 10);
        setReturns(res.content);
        setReturnsTotalPages(res.totalPages);
      } catch (err) {
        // Log or handle error
      } finally {
        setIsLoadingReturns(false);
      }
    };
    fetchReturns();
  }, [id, activeTab, returnsPage]);

  const handleStartSale = () => {
    if (!customer) return;
    setPosCustomer({
      id: customer.id,
      name: customer.fullName,
      phone: customer.phone,
    });
    navigate("/pos");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg mb-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Customer profile not found"}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customers</span>
        </button>
      </div>
    );
  }

  const stats = customer.statistics;

  return (
    <div className="space-y-6 p-6">
      {/* Back button & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customer Directory</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle transition-colors shadow-sm"
          >
            <Edit className="h-4 w-4 text-text-muted" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={handleStartSale}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity shadow-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>New Sale at POS</span>
          </button>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {customer.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text-primary">{customer.fullName}</h1>
                <span className="rounded-md bg-surface-subtle px-2 py-0.5 font-mono text-xs font-semibold text-text-secondary border border-border">
                  {customer.customerCode}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.status === "ACTIVE"
                      ? "bg-success-subtle text-success-fg border border-success-border"
                      : customer.status === "INACTIVE"
                      ? "bg-warning-subtle text-warning-fg border border-warning-border"
                      : "bg-destructive-subtle text-destructive-fg border border-destructive-border"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted mt-2">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${customer.phone}`} className="font-mono hover:text-primary">
                    {customer.phone}
                  </a>
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${customer.email}`} className="hover:text-primary">
                      {customer.email}
                    </a>
                  </span>
                )}
                {customer.gstin && (
                  <span className="flex items-center gap-1 font-mono uppercase">
                    <span>GSTIN:</span> {customer.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Total Purchases</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold text-text-primary">
            ₹{(stats?.totalSpendAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-text-muted mt-1 block">Lifetime revenue</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Completed Invoices</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold text-text-primary">{stats?.totalSalesCount ?? 0}</p>
          <span className="text-[11px] text-text-muted mt-1 block">Orders placed</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Total Returns</span>
            <RotateCcw className="h-4 w-4 text-warning-fg" />
          </div>
          <p className="mt-2 text-xl font-bold text-text-primary">{stats?.totalReturnsCount ?? 0}</p>
          <span className="text-[11px] text-text-muted mt-1 block">
            Refunds: ₹{(stats?.totalRefundAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Last Visit</span>
            <Calendar className="h-4 w-4 text-text-muted" />
          </div>
          <p className="mt-2 text-sm font-semibold text-text-primary">
            {stats?.lastPurchaseDate
              ? new Date(stats.lastPurchaseDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
          <span className="text-[11px] text-text-muted mt-1 block">Most recent invoice</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border bg-surface-subtle px-6">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              Account Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "sales"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              Purchase History ({stats?.totalSalesCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("returns")}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "returns"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              Returns History ({stats?.totalReturnsCount ?? 0})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Contact & Location Card */}
              <div className="rounded-lg border border-border p-4 space-y-3 bg-surface-subtle/30">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Address & Contact Details
                </h3>
                <div className="space-y-2 text-sm text-text-primary">
                  <div>
                    <span className="text-xs text-text-muted block">Phone Number:</span>
                    <span className="font-mono">{customer.phone}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Email Address:</span>
                    <span>{customer.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">Billing / Residential Address:</span>
                    <span>{customer.address || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block">GSTIN / Tax Registration:</span>
                    <span className="font-mono uppercase">{customer.gstin || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Account Meta Card */}
              <div className="rounded-lg border border-border p-4 space-y-3 bg-surface-subtle/30">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Account & Dispensing Notes
                </h3>
                <div className="space-y-2 text-sm text-text-primary">
                  <div>
                    <span className="text-xs text-text-muted block">Clinical / Dispensing Remarks:</span>
                    <p className="text-text-secondary bg-surface p-2.5 rounded border border-border text-xs min-h-[60px]">
                      {customer.notes || "No clinical remarks or dispensing preferences recorded."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div>
                      <span className="text-text-muted block">Registered On:</span>
                      <span>
                        {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Last Profile Update:</span>
                      <span>
                        {new Date(customer.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales History Tab */}
          {activeTab === "sales" && (
            <div>
              {isLoadingSales ? (
                <div className="py-12 text-center text-text-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm">Loading purchase history...</p>
                </div>
              ) : sales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-text-primary">
                    <thead className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="py-3 px-4">Sale / Invoice #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.map((sale) => (
                        <tr
                          key={sale.id}
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          className="hover:bg-surface-subtle cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold font-mono text-text-primary">{sale.saleNumber}</div>
                            <div className="text-xs text-text-muted font-mono">{sale.invoiceNumber}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-text-secondary">{sale.saleDate}</td>
                          <td className="py-3.5 px-4 text-xs text-text-secondary">{sale.lines?.length || 0} line(s)</td>
                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            ₹{sale.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                sale.status === "COMPLETED"
                                  ? "bg-success-subtle text-success-fg border border-success-border"
                                  : sale.status === "PARTIALLY_RETURNED"
                                  ? "bg-warning-subtle text-warning-fg border border-warning-border"
                                  : "bg-destructive-subtle text-destructive-fg border border-destructive-border"
                              }`}
                            >
                              {sale.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sales/${sale.id}`);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            >
                              <span>Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Sales Pagination */}
                  {salesTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border pt-4 mt-2 text-xs text-text-secondary">
                      <span>Showing Page {salesPage + 1} of {salesTotalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={salesPage === 0}
                          onClick={() => setSalesPage((p) => Math.max(0, p - 1))}
                          className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={salesPage >= salesTotalPages - 1}
                          onClick={() => setSalesPage((p) => p + 1)}
                          className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-text-muted">
                  <Receipt className="h-8 w-8 mx-auto text-text-muted opacity-40 mb-2" />
                  <p className="text-sm font-medium">No sales recorded for this customer yet</p>
                  <button
                    type="button"
                    onClick={handleStartSale}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg hover:opacity-90"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Start First Sale
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Returns History Tab */}
          {activeTab === "returns" && (
            <div>
              {isLoadingReturns ? (
                <div className="py-12 text-center text-text-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm">Loading return history...</p>
                </div>
              ) : returns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-text-primary">
                    <thead className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="py-3 px-4">Return #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Refund Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {returns.map((ret) => (
                        <tr
                          key={ret.id}
                          onClick={() => navigate(`/returns/${ret.id}`)}
                          className="hover:bg-surface-subtle cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold font-mono text-text-primary">{ret.returnNumber}</td>
                          <td className="py-3.5 px-4 text-xs text-text-secondary">{ret.returnDate}</td>
                          <td className="py-3.5 px-4 text-xs text-text-secondary max-w-xs truncate">{ret.reason}</td>
                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            ₹{ret.totalRefundAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success-fg border border-success-border">
                              {ret.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/returns/${ret.id}`);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                            >
                              <span>Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Returns Pagination */}
                  {returnsTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border pt-4 mt-2 text-xs text-text-secondary">
                      <span>Showing Page {returnsPage + 1} of {returnsTotalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={returnsPage === 0}
                          onClick={() => setReturnsPage((p) => Math.max(0, p - 1))}
                          className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={returnsPage >= returnsTotalPages - 1}
                          onClick={() => setReturnsPage((p) => p + 1)}
                          className="rounded border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-surface-subtle"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-text-muted">
                  <RotateCcw className="h-8 w-8 mx-auto text-text-muted opacity-40 mb-2" />
                  <p className="text-sm font-medium">No sales returns recorded for this customer</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditOpen && (
        <CustomerFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false);
            fetchCustomerProfile();
          }}
          customer={customer}
        />
      )}
    </div>
  );
};
