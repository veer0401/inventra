import React from "react";
import {
  LayoutDashboard,
  Boxes,
  Layers,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  Truck,
  Building2,
  BarChart3,
  Smartphone,
  Users,
  Settings,
  ShieldAlert,
  UploadCloud,
  Package,
  FileText,
  UserSquare,
} from "lucide-react";

export interface NavChildItemDef {
  id: string;
  label: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  allowedRoles?: string[];
}

export interface NavItemDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  shortcut?: string;
  allowedRoles?: string[];
  children?: NavChildItemDef[];
}

export interface NavGroupDef {
  id: string;
  title: string;
  items: NavItemDef[];
}

export const CANONICAL_NAVIGATION_GROUPS: NavGroupDef[] = [
  {
    id: "work",
    title: "WORK",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        shortcut: "G D",
      },
      {
        id: "work-sales",
        label: "Sales",
        icon: ShoppingCart,
        allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
        children: [
          {
            id: "pos",
            label: "Point of Sale (POS)",
            to: "/pos",
            icon: ShoppingCart,
            shortcut: "G O",
            allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
          },
          {
            id: "sales",
            label: "Sales & Invoices",
            to: "/sales",
            icon: Receipt,
            shortcut: "G L",
            allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
          },
          {
            id: "returns",
            label: "Returns",
            to: "/returns",
            icon: ArrowLeftRight,
            shortcut: "G R",
            allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
          },
        ],
      },
      {
        id: "customers",
        label: "Customers",
        to: "/customers",
        icon: UserSquare,
        shortcut: "G U",
        allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
      },
    ],
  },
  {
    id: "inventory",
    title: "INVENTORY",
    items: [
      {
        id: "inventory-group",
        label: "Inventory",
        icon: Boxes,
        allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
        children: [
          {
            id: "inventory-overview",
            label: "Stock Overview",
            to: "/inventory",
            icon: Boxes,
            shortcut: "G I",
            allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
          },
          {
            id: "batches",
            label: "Batches & FEFO",
            to: "/inventory/batches",
            icon: Package,
            shortcut: "G B",
            allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
          },
          {
            id: "movements",
            label: "Stock Movements",
            to: "/inventory/movements",
            icon: ArrowLeftRight,
            allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST"],
          },
        ],
      },
      {
        id: "transfers",
        label: "Transfers",
        to: "/transfers",
        icon: ArrowLeftRight,
        shortcut: "G X",
        allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR"],
      },
    ],
  },
  {
    id: "purchasing",
    title: "PURCHASING",
    items: [
      {
        id: "purchasing-group",
        label: "Purchasing",
        icon: FileText,
        allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
        children: [
          {
            id: "purchase-orders",
            label: "Purchase Orders",
            to: "/purchasing/orders",
            icon: FileText,
            shortcut: "G P",
            allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
          },
          {
            id: "goods-receipts",
            label: "Goods Receipts (GRN)",
            to: "/goods-receipts",
            icon: Truck,
            allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
          },
          {
            id: "purchase-invoices",
            label: "Invoices",
            to: "/purchasing/invoices",
            icon: Receipt,
            allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
          },
        ],
      },
      {
        id: "suppliers",
        label: "Suppliers",
        to: "/suppliers",
        icon: Building2,
        shortcut: "G S",
        allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
      },
    ],
  },
  {
    id: "catalog",
    title: "CATALOG",
    items: [
      {
        id: "catalog-group",
        label: "Catalog",
        icon: Layers,
        children: [
          {
            id: "products",
            label: "All Products",
            to: "/catalog",
            icon: Layers,
            shortcut: "G C",
          },
          {
            id: "categories",
            label: "Categories",
            to: "/catalog/categories",
            icon: Boxes,
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    title: "FINANCE",
    items: [
      {
        id: "reports",
        label: "Reports",
        to: "/reports",
        icon: BarChart3,
        shortcut: "G A",
        allowedRoles: ["OWNER", "ADMIN", "MANAGER", "PHARMACIST"],
      },
    ],
  },
  {
    id: "admin",
    title: "ADMIN",
    items: [
      {
        id: "users",
        label: "Users",
        to: "/users",
        icon: Users,
        allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
      },
      {
        id: "devices",
        label: "Devices",
        to: "/devices",
        icon: Smartphone,
        shortcut: "G E",
        allowedRoles: ["OWNER", "ADMIN", "MANAGER"],
      },
      {
        id: "imports",
        label: "Imports",
        to: "/imports",
        icon: UploadCloud,
        shortcut: "G M",
        allowedRoles: ["OWNER", "MANAGER", "ADMIN", "PLATFORM_ADMIN"],
      },
      {
        id: "settings",
        label: "Settings",
        to: "/settings",
        icon: Settings,
        shortcut: "G T",
      },
    ],
  },
  {
    id: "platform",
    title: "PLATFORM",
    items: [
      {
        id: "onboarding-approvals",
        label: "Applications",
        to: "/admin/onboarding",
        icon: ShieldAlert,
        allowedRoles: ["PLATFORM_ADMIN"],
      },
    ],
  },
];

/**
 * Checks if a specific navigation item is authorized for the given role.
 */
export function isNavAuthorized(item: NavItemDef | NavChildItemDef, role: string): boolean {
  if (role === "PLATFORM_ADMIN") {
    // Platform admin has access to platform and admin items
    if (item.allowedRoles?.includes("PLATFORM_ADMIN")) return true;
  }
  if (!item.allowedRoles || item.allowedRoles.length === 0) {
    return true; // Public to all authenticated users
  }
  return item.allowedRoles.includes(role);
}

/**
 * Returns all navigation groups filtered by the user's role.
 */
export function getAuthorizedNavGroups(role: string): NavGroupDef[] {
  return CANONICAL_NAVIGATION_GROUPS.map((group) => {
    const filteredItems = group.items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => isNavAuthorized(child, role));
          if (filteredChildren.length === 0) return null;
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return isNavAuthorized(item, role) ? item : null;
      })
      .filter((item): item is NavItemDef => item !== null);

    return {
      ...group,
      items: filteredItems,
    };
  }).filter((group) => group.items.length > 0);
}

/**
 * Flat list of all top-level customizable items permitted for the role.
 */
export function getAllAvailableNavItems(role: string): NavItemDef[] {
  const groups = getAuthorizedNavGroups(role);
  const items: NavItemDef[] = [];
  groups.forEach((g) => {
    g.items.forEach((item) => {
      items.push(item);
    });
  });
  return items;
}
