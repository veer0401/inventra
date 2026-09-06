import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button, useToast } from "@inventra/ui";
import { ProductForm } from "../../components/catalog/ProductForm";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { CreateProductInput } from "@inventra/validation";

export const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateProductInput) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const filteredIdentifiers = data.identifiers?.filter(
        (id) => id.identifierValue && id.identifierValue.trim() !== ""
      );

      const created = await catalogApi.createProduct({
        name: data.name.trim(),
        genericName: data.genericName?.trim() || undefined,
        brandName: data.brandName?.trim() || undefined,
        manufacturer: data.manufacturer?.trim() || undefined,
        dosageForm: data.dosageForm,
        strength: data.strength?.trim() || undefined,
        categoryId: data.categoryId || undefined,
        baseUnit: data.baseUnit.trim(),
        sellingUnit: data.sellingUnit?.trim() || undefined,
        unitsPerSellingUnit: data.unitsPerSellingUnit,
        hsnCode: data.hsnCode?.trim() || undefined,
        taxRate: data.taxRate,
        isTaxInclusive: data.isTaxInclusive,
        prescriptionRequired: data.prescriptionRequired,
        identifiers: filteredIdentifiers?.length
          ? filteredIdentifiers.map((id) => ({
              identifierType: id.identifierType,
              identifierValue: id.identifierValue.trim().toUpperCase(),
              isPrimary: id.isPrimary,
            }))
          : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
      toast.success(`Product "${created.name}" created successfully.`);
      navigate(`/catalog/products/${created.id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link to="/catalog">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Catalog
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Create Master Product</h1>
        <p className="text-xs text-secondary">
          Register a pharmaceutical item in your business master catalog.
        </p>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        serverError={serverError}
        onCancel={() => navigate("/catalog")}
      />
    </div>
  );
};
