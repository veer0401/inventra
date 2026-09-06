import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Plus,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  Building2,
  Calendar,
} from "lucide-react";
import { transferApi } from "../../services/transferApi";
import { TransferStatusBadge, Button, Card, Input, Spinner, EmptyState, Select, Pagination } from "@inventra/ui";
import { ContextualHelpModal } from "../../components/common/ContextualHelpModal";
import type { TransferStatus } from "@inventra/api-types";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "" },
  { label: "Requested", value: "REQUESTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "Partially Received", value: "PARTIALLY_RECEIVED" },
  { label: "Fully Received", value: "FULLY_RECEIVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export const TransfersPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(0);
  const [pageSize, setPageSize] = React.useState<number>(15);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["transfers", statusFilter, page],
    queryFn: () =>
      transferApi.listTransfers({
        status: statusFilter ? (statusFilter as TransferStatus) : undefined,
        page,
        size: pageSize,
      }),
  });

  const transfers = data?.content || [];
  const totalPages = data?.totalPages || 0;

  const filteredTransfers = React.useMemo(() => {
    if (!searchQuery.trim()) return transfers;
    const q = searchQuery.toLowerCase();
    return transfers.filter(
      (t) =>
        t.transferNumber.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  }, [transfers, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Inter-Store Transfers
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage stock movement, fulfillment dispatch, in-transit batches, and branch receipts
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
            onClick={() => navigate("/transfers/new")}
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Request Transfer</span>
          </Button>
          <ContextualHelpModal topic="transfers" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transfer number, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="sm:col-span-4">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading store transfers...</p>
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/30 bg-destructive/5 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground">Failed to Load Transfers</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There was an error communicating with the backend transfer service.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : filteredTransfers.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <EmptyState
            icon={<ArrowLeftRight className="h-8 w-8 text-muted-foreground" />}
            title="No Transfer Records Found"
            description={
              statusFilter || searchQuery
                ? "No transfers match the selected filter criteria. Try resetting filters."
                : "Create an inter-store transfer request to initiate stock movement between retail branches."
            }
            action={
              statusFilter || searchQuery ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate("/transfers/new")} className="gap-1">
                  <Plus className="h-4 w-4" />
                  <span>Initiate First Transfer</span>
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border/80 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Transfer Number</th>
                    <th className="py-3 px-4">Source Branch</th>
                    <th className="py-3 px-4">Destination Branch</th>
                    <th className="py-3 px-4">Lines / Items</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTransfers.map((transfer) => (
                    <tr
                      key={transfer.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/transfers/${transfer.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {transfer.transferNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[160px] font-mono text-xs">{transfer.sourceStoreId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[160px] font-mono text-xs">
                            {transfer.destinationStoreId}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {transfer.lines?.length || 0}
                        </span>{" "}
                        items
                      </td>
                      <td className="py-3.5 px-4">
                        <TransferStatusBadge status={transfer.status} />
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(transfer.requestedAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/transfers/${transfer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredTransfers.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalElements={data?.totalElements}
              pageSize={pageSize}
              pageSizeOptions={[10, 15, 25, 50]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(0);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
