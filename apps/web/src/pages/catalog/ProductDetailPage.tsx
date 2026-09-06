import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit3,
  Pill,
  Package,
  Receipt,
  RotateCw,
  Clock,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
} from "@inventra/ui";
import { ProductStatusBadge } from "../../components/catalog/ProductStatusBadge";
import { ProductIdentifiersList } from "../../components/catalog/ProductIdentifiersList";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const canManage = ["OWNER", "MANAGER"].includes(activeContext?.role || "");

  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["product", businessId, productId],
    queryFn: () => catalogApi.getProduct(productId!),
    enabled: Boolean(productId && businessId),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", businessId],
    queryFn: () => catalogApi.listCategories(),
    enabled: Boolean(businessId),
  });

  const category = categories.find((c) => c.id === product?.categoryId);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-muted flex flex-col items-center justify-center gap-3">
        <RotateCw className="h-6 w-6 animate-spin text-primary" />
        <span>Loading product details...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Link to="/catalog">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Catalog
          </Button>
        </Link>
        <Alert variant="danger" title="Product Not Found">
          {error instanceof Error
            ? error.message
            : "The requested product does not exist or does not belong to your business."}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/catalog">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Catalog
          </Button>
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link to={`/catalog/products/${product.id}/edit`}>
              <Button variant="primary" size="sm" leftIcon={<Edit3 className="h-4 w-4" />}>
                Edit Product
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Identity Banner */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-4 border-b border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-lg bg-primary-subtle border border-primary-border text-primary mt-0.5">
                <Pill className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl text-primary font-bold">{product.name}</CardTitle>
                  <ProductStatusBadge status={product.status} />
                  {product.prescriptionRequired && (
                    <Badge variant="warning" className="text-[10px] font-mono">
                      Rx SCHEDULE DRUG
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary flex-wrap">
                  {product.genericName && (
                    <span>
                      Generic: <strong className="text-primary italic">{product.genericName}</strong>
                    </span>
                  )}
                  {product.brandName && (
                    <>
                      <span>•</span>
                      <span>
                        Brand: <strong className="text-primary">{product.brandName}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-secondary space-y-1">
              <div>Dosage: <strong className="text-primary">{product.dosageForm}</strong></div>
              {product.strength && <div>Strength: <strong className="text-primary">{product.strength}</strong></div>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Identifiers Section */}
          <ProductIdentifiersList
            productId={product.id}
            identifiers={product.identifiers || []}
            onIdentifierAdded={() => {
              queryClient.invalidateQueries({ queryKey: ["product", businessId, productId] });
            }}
          />

          {/* Grid of Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-subtle">
            {/* Packaging & Hierarchy Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Packaging & Hierarchy
              </h4>

              <div className="p-4 rounded-md bg-surface-muted border border-subtle space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Therapeutic Category</span>
                  <span className="font-semibold text-primary">
                    {category ? `${category.name} (${category.code})` : "Uncategorized"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Base Dispensing Unit</span>
                  <span className="font-semibold text-primary">{product.baseUnit}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Selling Pack Unit</span>
                  <span className="font-semibold text-primary">
                    {product.sellingUnit || "Standard"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Units per Selling Pack</span>
                  <span className="font-mono font-semibold text-primary">
                    {product.unitsPerSellingUnit}x
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Manufacturer</span>
                  <span className="font-medium text-secondary">
                    {product.manufacturer || "Not registered"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax & Regulatory Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Tax & Regulatory Classification
              </h4>

              <div className="p-4 rounded-md bg-surface-muted border border-subtle space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">HSN Classification</span>
                  <span className="font-mono font-semibold text-primary">
                    {product.hsnCode || "3004 (General)"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">GST Tax Rate</span>
                  <span className="font-mono font-semibold text-success">
                    {product.taxRate !== undefined ? `${product.taxRate}%` : "0%"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Tax Inclusion</span>
                  <span className="font-medium text-secondary">
                    {product.isTaxInclusive ? "Inclusive in Price" : "Exclusive / Add on Bill"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Prescription Requirement</span>
                  <span className="font-medium text-secondary">
                    {product.prescriptionRequired ? "Mandatory Rx" : "Over The Counter (OTC)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Timestamp Footnote */}
          <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-4 border-t border-subtle">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Created: {new Date(product.createdAt).toLocaleString()}</span>
            </div>
            <span>Last Modified: {new Date(product.updatedAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
