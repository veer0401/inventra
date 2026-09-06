import React, { useState } from "react";
import { Copy, Check, Plus, Barcode as BarcodeIcon, Tag } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Select,
  Alert,
  useToast,
} from "@inventra/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addProductIdentifierSchema, type AddProductIdentifierInput } from "@inventra/validation";
import type { ProductIdentifierResponse } from "@inventra/api-types";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";

export interface ProductIdentifiersListProps {
  productId?: string;
  identifiers: ProductIdentifierResponse[];
  onIdentifierAdded?: () => void;
  readOnly?: boolean;
}

export const ProductIdentifiersList: React.FC<ProductIdentifiersListProps> = ({
  productId,
  identifiers,
  onIdentifierAdded,
  readOnly = false,
}) => {
  const toast = useToast();
  const activeContext = useAuthStore((state) => state.activeContext);
  const canManage = !readOnly && ["OWNER", "MANAGER"].includes(activeContext?.role || "");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddProductIdentifierInput>({
    resolver: zodResolver(addProductIdentifierSchema),
    defaultValues: {
      identifierType: "BARCODE",
      identifierValue: "",
      isPrimary: false,
    },
  });

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    toast.success(`Copied ${value} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const onAddSubmit = async (data: AddProductIdentifierInput) => {
    if (!productId) return;
    setSubmitError(null);
    try {
      await catalogApi.addProductIdentifier(productId, {
        identifierType: data.identifierType,
        identifierValue: data.identifierValue.trim(),
        isPrimary: data.isPrimary,
      });
      toast.success("Product identifier attached.");
      setDialogOpen(false);
      reset();
      onIdentifierAdded?.();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add identifier.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <BarcodeIcon className="h-3.5 w-3.5 text-primary" />
          <span>Product Identifiers ({identifiers.length})</span>
        </h4>

        {canManage && productId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            leftIcon={<Plus className="h-3 w-3" />}
            className="h-7 text-xs"
          >
            Add Identifier
          </Button>
        )}
      </div>

      {identifiers.length === 0 ? (
        <div className="p-4 rounded-md bg-surface-muted border border-subtle text-muted text-xs text-center">
          No barcodes or SKU identifiers registered for this item.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {identifiers.map((item) => (
            <div
              key={item.id || item.identifierValue}
              className="flex items-center justify-between p-2.5 rounded-md bg-surface border border-subtle text-xs shadow-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Tag className="h-3.5 w-3.5 text-muted shrink-0" />
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-primary font-semibold truncate">
                      {item.identifierValue}
                    </span>
                    {item.isPrimary && (
                      <Badge variant="accent" className="text-[9px] py-0 px-1 font-mono">
                        PRIMARY
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted mt-0.5">
                    {item.identifierType}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(item.identifierValue, item.id || item.identifierValue)}
                className="p-1.5 rounded hover:bg-surface-muted text-muted hover:text-primary transition-colors ml-2 shrink-0"
                title="Copy identifier value"
                aria-label="Copy identifier value"
              >
                {copiedId === (item.id || item.identifierValue) ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Identifier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5 text-primary" />
            Attach Product Identifier
          </DialogTitle>
          <DialogDescription>
            Register an additional barcode, manufacturer SKU, or global GTIN identifier to this master item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4 py-2">
          {submitError && <Alert variant="danger">{submitError}</Alert>}

          <FormField
            label="Identifier Type"
            htmlFor="identifierType"
            required
            error={errors.identifierType?.message}
          >
            <Select
              id="identifierType"
              disabled={isSubmitting}
              error={Boolean(errors.identifierType)}
              {...register("identifierType")}
            >
              <option value="BARCODE">Barcode (Standard 1D/2D)</option>
              <option value="SKU">Stock Keeping Unit (SKU)</option>
              <option value="EAN_13">EAN-13</option>
              <option value="UPC">UPC</option>
              <option value="MANUFACTURER_CODE">Manufacturer Part Code</option>
            </Select>
          </FormField>

          <FormField
            label="Identifier Value / Scanned Code"
            htmlFor="identifierValue"
            required
            error={errors.identifierValue?.message}
          >
            <Input
              id="identifierValue"
              placeholder="e.g. 8901234567890"
              className="font-mono"
              disabled={isSubmitting}
              error={Boolean(errors.identifierValue)}
              {...register("identifierValue")}
            />
          </FormField>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimary"
              className="h-4 w-4 rounded border-strong bg-surface text-primary focus:ring-focus cursor-pointer"
              disabled={isSubmitting}
              {...register("isPrimary")}
            />
            <label htmlFor="isPrimary" className="text-xs text-primary font-medium cursor-pointer">
              Mark as Primary Barcode for POS Scanning
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Attach Identifier
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
