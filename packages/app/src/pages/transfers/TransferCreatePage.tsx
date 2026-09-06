import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Alert,
  useToast,
  Spinner,
  Select,
} from "@inventra/ui";
import { transferApi } from "../../services/transferApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Boxes,
  AlertCircle,
} from "lucide-react";
import type { CreateTransferRequest } from "@inventra/api-types";

interface EditableTransferLine {
  id: string;
  productId: string;
  requestedQuantity: number;
  notes: string;
}

export const TransferCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const memberships = useAuthStore((state) => state.memberships);
  const activeContext = useAuthStore((state) => state.activeContext);
  const currentStoreId = activeContext?.storeId;

  // Stores available to user or business
  const stores = memberships[0]?.stores || [];

  const [sourceStoreId, setSourceStoreId] = useState<string>("");
  const [destinationStoreId, setDestinationStoreId] = useState<string>(currentStoreId || "");
  const [notes, setNotes] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Line items state
  const [lines, setLines] = useState<EditableTransferLine[]>([
    {
      id: crypto.randomUUID(),
      productId: "",
      requestedQuantity: 1,
      notes: "",
    },
  ]);

  // Fetch Products for selection
  const { data: productsData } = useQuery({
    queryKey: ["products-list-for-transfer"],
    queryFn: () => catalogApi.listProducts(0, 200),
  });

  const products = productsData?.content || [];

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "",
        requestedQuantity: 1,
        notes: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast.warning("A transfer request must have at least one line item.", "Minimum Required");
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, updates: Partial<EditableTransferLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  // Mutation to create transfer
  const createMutation = useMutation({
    mutationFn: (req: CreateTransferRequest) => transferApi.createTransfer(req),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success(`Transfer ${data.transferNumber} has been successfully requested.`, "Transfer Created");
      navigate(`/transfers/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to create transfer";
      setErrorMessage(msg);
      toast.error(msg, "Creation Failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sourceStoreId) {
      setErrorMessage("Please select a Source Branch to request inventory from.");
      return;
    }

    if (!destinationStoreId) {
      setErrorMessage("Please select a Destination Branch to receive inventory.");
      return;
    }

    if (sourceStoreId === destinationStoreId) {
      setErrorMessage("Source Branch and Destination Branch cannot be the same store.");
      return;
    }

    // Validate lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId) {
        setErrorMessage(`Line #${i + 1}: Please select a product.`);
        return;
      }
      if (!line.requestedQuantity || line.requestedQuantity <= 0) {
        setErrorMessage(`Line #${i + 1}: Requested quantity must be greater than 0.`);
        return;
      }
    }

    const payload: CreateTransferRequest = {
      sourceStoreId,
      destinationStoreId,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        requestedQuantity: Number(l.requestedQuantity),
        notes: l.notes.trim() || undefined,
      })),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/transfers")}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Transfers</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Request Inter-Store Transfer
          </h1>
          <p className="text-sm text-muted-foreground">
            Initiate stock requisition from another retail branch or main warehouse
          </p>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Selection Card */}
        <Card className="p-6 space-y-5">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Store Routing Context</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Source Branch */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Source Branch (Fulfilling Store) <span className="text-danger">*</span>
              </label>
              <Select
                value={sourceStoreId}
                onChange={(e) => setSourceStoreId(e.target.value)}
                required
              >
                <option value="">-- Select Source Store --</option>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId} disabled={s.storeId === destinationStoreId}>
                    {s.storeName} ({s.storeCode})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">
                Branch that will authorize, pick batches, and ship stock.
              </p>
            </div>

            {/* Destination Branch */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Destination Branch (Receiving Store) <span className="text-danger">*</span>
              </label>
              <Select
                value={destinationStoreId}
                onChange={(e) => setDestinationStoreId(e.target.value)}
                required
              >
                <option value="">-- Select Destination Store --</option>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId} disabled={s.storeId === sourceStoreId}>
                    {s.storeName} ({s.storeCode})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">
                Branch requesting stock and receiving the delivery.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Transfer Requisition Notes (Optional)
            </label>
            <Input
              placeholder="e.g. Urgent stock replenishment for high-demand prescription items"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        {/* Transfer Line Items Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <span>Requested Products & Quantities</span>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Item Line</span>
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={line.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-lg border border-border/70 bg-muted/20 items-center"
              >
                <div className="md:col-span-1 text-xs font-mono font-bold text-muted-foreground">
                  #{idx + 1}
                </div>

                {/* Product Dropdown */}
                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Product</label>
                  <Select
                    value={line.productId}
                    onChange={(e) => updateLine(line.id, { productId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Medicine / Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.strength ? `(${p.strength})` : ""} - {p.dosageForm}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Requested Qty */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Req Qty</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.requestedQuantity}
                    onChange={(e) =>
                      updateLine(line.id, { requestedQuantity: Math.max(1, Number(e.target.value)) })
                    }
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Line Notes */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Notes</label>
                  <Input
                    placeholder="Optional note"
                    value={line.notes}
                    onChange={(e) => updateLine(line.id, { notes: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Delete button */}
                <div className="md:col-span-1 flex justify-end pt-5 md:pt-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(line.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/transfers")}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="gap-2 bg-primary text-primary-foreground shadow-sm px-6"
          >
            {createMutation.isPending && <Spinner className="h-4 w-4" />}
            <span>Submit Transfer Requisition</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
