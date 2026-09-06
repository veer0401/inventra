import React from "react";
import { StatusBadge } from "@inventra/ui";
import type { ProductStatus, CategoryStatus } from "@inventra/api-types";

export interface ProductStatusBadgeProps {
  status: ProductStatus | CategoryStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const ProductStatusBadge: React.FC<ProductStatusBadgeProps> = ({
  status,
  className,
  showIcon = true,
}) => {
  return <StatusBadge status={status} className={className} showIcon={showIcon} />;
};
