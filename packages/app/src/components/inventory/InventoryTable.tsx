import React from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  StatusBadge,
  Button,
  Card,
  Badge,
} from "@inventra/ui";
import type { InventoryItemResponse, ProductSummaryResponse } from "@inventra/api-types";
import { Boxes, ArrowRight, SlidersHorizontal, MapPin } from "lucide-react";

export interface InventoryRowData {
  item: InventoryItemResponse;
  product?: ProductSummaryResponse;
}

export interface InventoryTableProps {
  rows: InventoryRowData[];
  onOpenAdjustment?: (item: InventoryItemResponse) => void;
  isLoading?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  rows,
  onOpenAdjustment,
  isLoading = false,
}) => {
  const getStockStatus = (item: InventoryItemResponse): { status: "success" | "warning" | "danger" | "neutral"; label: string } => {
    if (item.currentStock <= 0) {
      return { status: "danger", label: "Out of Stock" };
    }
    if (item.currentStock <= item.reorderLevel) {
      return { status: "warning", label: "Low Stock" };
    }
    return { status: "success", label: "In Stock" };
  };

  if (rows.length === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      {/* Desktop ERP Table View (Hidden on Mobile <768px) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Reorder Point</TableHead>
              <TableHead className="text-center">Tracking</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, product }) => {
              const stockStatus = getStockStatus(item);
              const productName = product?.name || `Product (${item.productId.slice(0, 8)}...)`;
              const genericName = product?.genericName;

              return (
                <TableRow key={item.id} className="hover:bg-surface-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        to={`/inventory/${item.productId}`}
                        className="font-medium text-primary hover:text-accent hover:underline flex items-center gap-1.5"
                      >
                        {productName}
                      </Link>
                      {genericName && (
                        <span className="text-xs text-muted truncate max-w-xs" title={genericName}>
                          {genericName}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {item.locationRack ? (
                      <div className="flex items-center gap-1 text-xs text-secondary">
                        <MapPin className="h-3 w-3 text-muted shrink-0" />
                        <span className="font-mono">{item.locationRack}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </TableCell>

                  <TableCellNumeric className="font-mono text-sm font-semibold">
                    {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </TableCellNumeric>

                  <TableCellNumeric className="font-mono text-xs text-muted">
                    {item.reorderLevel.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </TableCellNumeric>

                  <TableCell className="text-center">
                    {item.isBatchTracked ? (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        <Boxes className="h-2.5 w-2.5 mr-1 text-accent" />
                        Batches
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted font-mono">Simple</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={stockStatus.status} label={stockStatus.label} />
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenAdjustment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenAdjustment(item)}
                          className="h-7 px-2 text-xs"
                          title="Record Stock Adjustment"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                          Adjust
                        </Button>
                      )}
                      <Link to={`/inventory/${item.productId}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          Details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Responsive Cards View (Visible on <768px) */}
      <div className="space-y-3 md:hidden">
        {rows.map(({ item, product }) => {
          const stockStatus = getStockStatus(item);
          const productName = product?.name || `Product (${item.productId.slice(0, 8)}...)`;

          return (
            <Card key={item.id} className="p-3.5 border-subtle space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/inventory/${item.productId}`}
                    className="font-medium text-sm text-primary hover:text-accent"
                  >
                    {productName}
                  </Link>
                  {product?.genericName && (
                    <p className="text-xs text-muted line-clamp-1">{product.genericName}</p>
                  )}
                </div>
                <StatusBadge status={stockStatus.status} label={stockStatus.label} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-subtle text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase">Current Stock</span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {item.currentStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase">Reorder Point</span>
                  <span className="font-mono text-xs text-secondary">
                    {item.reorderLevel.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {item.locationRack && (
                <div className="flex items-center gap-1 text-xs text-muted font-mono">
                  <MapPin className="h-3 w-3" />
                  <span>Rack: {item.locationRack}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
                {onOpenAdjustment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenAdjustment(item)}
                    className="h-8 text-xs flex-1"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                    Adjust
                  </Button>
                )}
                <Link to={`/inventory/${item.productId}`} className="flex-1">
                  <Button variant="primary" size="sm" className="h-8 text-xs w-full">
                    View Batches
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
};
