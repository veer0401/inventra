import React from "react";
import {
  ScanBarcode,
  ShoppingCart,
  Search,
  AlertTriangle,
  Clock,
  FilePlus,
  Truck,
  ArrowLeftRight,
  Receipt,
  UserSquare,
  Building2,
} from "lucide-react";

export interface QuickToolDef {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  to?: string;
  isAction?: boolean; // If true, triggers a specialized modal/action rather than direct route
  actionId?: "openBarcodeScan" | "openCommandPalette";
  allowedRoles?: string[];
  contextualWorkspaces?: string[]; // e.g. "inventory", "sales", "purchasing", "pos"
}

export const CANONICAL_QUICK_TOOLS: QuickToolDef[] = [
  {
    id: "barcode-scan",
    label: "Scan Barcode",
    shortLabel: "Scan",
    description: "Scan product barcode for instant identification or dispensing",
    icon: ScanBarcode,
    shortcut: "F2",
    isAction: true,
    actionId: "openBarcodeScan",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
    contextualWorkspaces: ["pos", "sales", "inventory", "batches"],
  },
  {
    id: "new-sale",
    label: "New Bill / POS",
    shortLabel: "New Sale",
    description: "Open the Point of Sale terminal to create a customer bill",
    icon: ShoppingCart,
    shortcut: "F1",
    to: "/pos",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
    contextualWorkspaces: ["sales", "customers", "dashboard"],
  },
  {
    id: "search-product",
    label: "Find Medicine",
    shortLabel: "Search",
    description: "Global medicine and catalog lookup",
    icon: Search,
    shortcut: "Ctrl+K",
    isAction: true,
    actionId: "openCommandPalette",
    contextualWorkspaces: ["dashboard", "inventory", "catalog"],
  },
  {
    id: "low-stock",
    label: "Low Stock Alert",
    shortLabel: "Low Stock",
    description: "View medicines that have breached reorder thresholds",
    icon: AlertTriangle,
    to: "/inventory",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
    contextualWorkspaces: ["inventory", "purchasing", "dashboard"],
  },
  {
    id: "expiring-batches",
    label: "Expiring Batches",
    shortLabel: "Expiring",
    description: "Audit batches approaching expiration according to FEFO",
    icon: Clock,
    to: "/inventory/batches",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST", "CASHIER"],
    contextualWorkspaces: ["inventory", "batches", "dashboard"],
  },
  {
    id: "new-purchase",
    label: "New Purchase Order",
    shortLabel: "New PO",
    description: "Create a new supplier purchase order",
    icon: FilePlus,
    shortcut: "F4",
    to: "/purchasing/orders",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
    contextualWorkspaces: ["purchasing", "suppliers"],
  },
  {
    id: "receive-goods",
    label: "Receive Goods (GRN)",
    shortLabel: "Receive GRN",
    description: "Inward medicine shipment and verify supplier invoice",
    icon: Truck,
    to: "/goods-receipts",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
    contextualWorkspaces: ["purchasing", "inventory"],
  },
  {
    id: "stock-movement",
    label: "Stock Movement",
    shortLabel: "Movement",
    description: "Audit batch movements and physical inventory adjustments",
    icon: ArrowLeftRight,
    to: "/inventory/movements",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
    contextualWorkspaces: ["inventory"],
  },
  {
    id: "today-sales",
    label: "Today's Sales",
    shortLabel: "Sales Log",
    description: "Review today's completed transactions and invoices",
    icon: Receipt,
    to: "/sales",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
    contextualWorkspaces: ["pos", "sales"],
  },
  {
    id: "customers",
    label: "Customers",
    shortLabel: "Customers",
    description: "Manage registered customers, prescriptions, and credit",
    icon: UserSquare,
    to: "/customers",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF"],
    contextualWorkspaces: ["sales", "pos"],
  },
  {
    id: "suppliers",
    label: "Suppliers",
    shortLabel: "Suppliers",
    description: "Supplier contact book, drug license, and payment ledger",
    icon: Building2,
    to: "/suppliers",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
    contextualWorkspaces: ["purchasing"],
  },
];

/**
 * Checks if a specific quick tool is authorized for the given role.
 */
export function isQuickToolAuthorized(tool: QuickToolDef, role: string): boolean {
  if (role === "PLATFORM_ADMIN") return true;
  if (!tool.allowedRoles || tool.allowedRoles.length === 0) return true;
  return tool.allowedRoles.includes(role);
}

/**
 * Returns all quick tools permitted for the given role.
 */
export function getAuthorizedQuickTools(role: string): QuickToolDef[] {
  return CANONICAL_QUICK_TOOLS.filter((tool) => isQuickToolAuthorized(tool, role));
}
