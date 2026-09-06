import React from "react";
import { Link } from "react-router-dom";
import { Eye, Edit3, Pill, AlertCircle } from "lucide-react";
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  TableSkeleton,
} from "@inventra/ui";
import { ProductStatusBadge } from "./ProductStatusBadge";
import type { ProductSummaryResponse } from "@inventra/api-types";
import { useAuthStore } from "../../stores/authStore";

export interface ProductTableProps {
  products: ProductSummaryResponse[];
  isLoading?: boolean;
  onEdit?: (product: ProductSummaryResponse) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading = false,
}) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const canManage = ["OWNER", "MANAGER"].includes(activeContext?.role || "");

  if (isLoading) {
    return <TableSkeleton rows={5} columns={5} />;
  }

  if (products.length === 0) {
    return null; // Empty state handled by parent CatalogPage
  }

  return (
    <div className="border border-subtle rounded-lg bg-surface shadow-card overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pharmaceutical Product</TableHead>
              <TableHead>Dosage & Strength</TableHead>
              <TableHead>Packaging Units</TableHead>
              <TableHead className="text-right">Tax Rate</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                {/* Product Name & Medical Details */}
                <TableCell className="max-w-[280px]">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-primary-subtle text-primary border border-primary-border mt-0.5 shrink-0">
                      <Pill className="h-3.5 w-3.5" />
                    </div>
                    <div className="truncate">
                      <Link
                        to={`/catalog/products/${product.id}`}
                        className="font-semibold text-primary hover:text-primary-hover transition-colors truncate block text-xs"
                      >
                        {product.name}
                      </Link>
                      <div className="flex items-center gap-1.5 text-[11px] text-secondary mt-0.5 truncate">
                        {product.genericName && (
                          <span className="truncate italic">{product.genericName}</span>
                        )}
                        {product.brandName && product.genericName && <span>•</span>}
                        {product.brandName && (
                          <span className="text-secondary font-medium">{product.brandName}</span>
                        )}
                      </div>
                      {product.prescriptionRequired && (
                        <div className="flex items-center gap-1 text-[10px] text-warning mt-0.5 font-medium">
                          <AlertCircle className="h-3 w-3" />
                          <span>Prescription Required (Rx)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Dosage Form & Strength */}
                <TableCell>
                  <div className="space-y-0.5">
                    <Badge variant="outline" className="text-[10px] font-mono py-0">
                      {product.dosageForm}
                    </Badge>
                    {product.strength && (
                      <div className="text-[11px] font-mono text-secondary pl-0.5">
                        {product.strength}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Packaging Units */}
                <TableCell>
                  <div className="text-[11px] space-y-0.5 text-secondary">
                    <div>
                      <span className="text-muted">Base: </span>
                      <span className="font-medium text-primary">{product.baseUnit}</span>
                    </div>
                    {product.sellingUnit && (
                      <div className="text-muted text-[10px]">
                        <span>Selling: {product.sellingUnit} </span>
                        {product.unitsPerSellingUnit > 1 && (
                          <span className="font-mono text-primary font-semibold">({product.unitsPerSellingUnit}x)</span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Tax Rate (Right-aligned with tabular numbers) */}
                <TableCellNumeric>
                  <span>
                    {product.taxRate !== undefined ? `${product.taxRate}%` : "0%"}
                  </span>
                  <span className="block text-[10px] text-muted font-normal">GST</span>
                </TableCellNumeric>

                {/* Status Badge */}
                <TableCell className="text-center">
                  <ProductStatusBadge status={product.status} />
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/catalog/products/${product.id}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    {canManage && (
                      <Link to={`/catalog/products/${product.id}/edit`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Edit Product"
                          aria-label="Edit Product"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Stacked Card List View */}
      <div className="md:hidden divide-y divide-subtle">
        {products.map((product) => (
          <div key={product.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <Link
                  to={`/catalog/products/${product.id}`}
                  className="font-semibold text-primary text-xs hover:text-primary-hover transition-colors block"
                >
                  {product.name}
                </Link>
                {product.genericName && (
                  <p className="text-[11px] text-secondary italic">{product.genericName}</p>
                )}
              </div>
              <ProductStatusBadge status={product.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-secondary pt-1 border-t border-subtle">
              <div>
                <span className="text-muted block text-[10px]">Dosage / Form</span>
                <span className="font-mono text-primary">{product.dosageForm} {product.strength}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">Units</span>
                <span className="text-primary">{product.baseUnit} ({product.sellingUnit || "Standard"})</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-secondary">
                Tax: <strong className="text-primary">{product.taxRate || 0}%</strong>
              </span>

              <div className="flex items-center gap-2">
                <Link to={`/catalog/products/${product.id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    View
                  </Button>
                </Link>
                {canManage && (
                  <Link to={`/catalog/products/${product.id}/edit`}>
                    <Button variant="secondary" size="sm" className="h-7 text-xs">
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
