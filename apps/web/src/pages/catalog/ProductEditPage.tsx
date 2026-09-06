import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCw } from "lucide-react";
import { Button, Alert, useToast } from "@inventra/ui";
import { ProductForm } from "../../components/catalog/ProductForm";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { CreateProductInput } from "@inventra/validation";
import { ApiError } from "@inventra/api-client";

export const ProductEditPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    data: product,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["product", businessId, productId],
    queryFn: () => catalogApi.getProduct(productId!),
    enabled: Boolean(productId && businessId),
  });

  const handleSubmit = async (data: CreateProductInput) => {
    if (!productId) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const updated = await catalogApi.updateProduct(productId, {
        name: data.name?.trim() || undefined,
        genericName: data.genericName?.trim() || undefined,
        brandName: data.brandName?.trim() || undefined,
        manufacturer: data.manufacturer?.trim() || undefined,
        dosageForm: data.dosageForm,
        strength: data.strength?.trim() || undefined,
        categoryId: data.categoryId || undefined,
        baseUnit: data.baseUnit?.trim() || undefined,
        sellingUnit: data.sellingUnit?.trim() || undefined,
        unitsPerSellingUnit: data.unitsPerSellingUnit,
        hsnCode: data.hsnCode?.trim() || undefined,
        taxRate: data.taxRate,
        isTaxInclusive: data.isTaxInclusive,
        prescriptionRequired: data.prescriptionRequired,
        status: data.status,
      });

      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
      queryClient.invalidateQueries({ queryKey: ["product", businessId, productId] });
      toast.success(`Product "${updated.name}" updated successfully.`);
      navigate(`/catalog/products/${productId}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError(
          "This product was modified by another user. Reload the latest version before saving your changes."
        );
      } else {
        setServerError(err instanceof Error ? err.message : "Failed to update product.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-muted flex flex-col items-center justify-center gap-3">
        <RotateCw className="h-6 w-6 animate-spin text-primary" />
        <span>Loading product details for editing...</span>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Link to="/catalog">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Catalog
          </Button>
        </Link>
        <Alert variant="danger" title="Product Not Found">
          {loadError instanceof Error ? loadError.message : "Product could not be loaded."}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link to={`/catalog/products/${productId}`}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Product View
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Master Product</h1>
        <p className="text-xs text-secondary">
          Update pharmaceutical formula, packaging ratios, or tax rates for <strong className="text-primary">{product.name}</strong>.
        </p>
      </div>

      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        serverError={serverError}
        onCancel={() => navigate(`/catalog/products/${productId}`)}
      />
    </div>
  );
};
