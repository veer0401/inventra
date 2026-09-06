import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  catalog: "Catalog & Categories",
  products: "Products",
  new: "New Product",
  edit: "Edit Product",
  categories: "Taxonomy Categories",
  inventory: "Inventory & Batches",
  purchasing: "Purchases & GRN",
  suppliers: "Suppliers Ledger",
  pos: "Point of Sale",
  sales: "Sales & Invoicing",
  transfers: "Inter-Store Transfers",
  reports: "Reports & Analytics",
  settings: "Account Settings",
  devices: "POS Devices",
  users: "Staff & Users",
  admin: "Platform Administration",
  onboarding: "Onboarding Applications",
  applications: "Onboarding Applications",
  subscriptions: "Subscription Management",
  payments: "Payment Console",
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === "dashboard")) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted mb-4">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-primary transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>

      {pathSegments.map((segment, index) => {
        const url = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const label = ROUTE_LABELS[segment] || (segment.length > 20 ? segment.substring(0, 8) + "..." : segment.charAt(0).toUpperCase() + segment.slice(1));

        return (
          <React.Fragment key={url}>
            <ChevronRight className="h-3 w-3 text-muted shrink-0" />
            {isLast ? (
              <span className="font-semibold text-primary" aria-current="page">
                {label}
              </span>
            ) : (
              <Link to={url} className="hover:text-primary transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
