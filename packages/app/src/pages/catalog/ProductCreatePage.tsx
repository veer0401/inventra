import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button, useToast } from "@inventra/ui";
import { ProductForm } from "../../components/catalog/ProductForm";
import { catalogApi } from "../../services/catalogApi";
import { globalMedicineApi } from "../../services/globalMedicineApi";
import { useAuthStore } from "../../stores/authStore";
import type { CreateProductInput } from "@inventra/validation";

export const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const globalId = searchParams.get("globalId");
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;

  const { data: globalMed, isLoading: isGlobalLoading } = useQuery({
    queryKey: ["global-medicine-prefetch", globalId],
    queryFn: () => globalMedicineApi.getGlobalMedicine(globalId!),
    enabled: Boolean(globalId),
  });

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
        globalProductId: data.globalProductId || undefined,
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

      {isGlobalLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading global medicine formulation...</span>
        </div>
      ) : (
        <ProductForm
          key={globalMed ? globalMed.id : "new"}
          initialData={
            globalMed
              ? {
                  id: "",
                  businessId: businessId || "",
                  categoryId: "",
                  globalProductId: globalMed.id,
                  name: globalMed.name,
                  genericName: globalMed.genericName,
                  brandName: globalMed.brandName || "",
                  manufacturer: globalMed.manufacturer || "",
                  dosageForm: globalMed.dosageForm,
                  strength: globalMed.strength || "",
                  baseUnit: globalMed.baseUnit,
                  sellingUnit: globalMed.sellingUnit,
                  unitsPerSellingUnit: globalMed.unitsPerSellingUnit,
                  hsnCode: globalMed.hsnCode || "",
                  taxRate: globalMed.taxRate,
                  isTaxInclusive: true,
                  prescriptionRequired: globalMed.prescriptionRequired,
                  status: "ACTIVE",
                  identifiers: globalMed.barcode
                    ? [
                        {
                          id: "",
                          productId: "",
                          identifierType: "BARCODE",
                          identifierValue: globalMed.barcode,
                          isPrimary: true,
                          createdAt: "",
                        },
                      ]
                    : [],
                  createdAt: "",
                  updatedAt: "",
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          serverError={serverError}
          onCancel={() => navigate("/catalog")}
        />
      )}
    </div>
  );
};
