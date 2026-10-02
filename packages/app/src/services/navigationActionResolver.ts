/**
 * Navigation Action Resolver for Inventra Intelligence.
 * Translates canonical destination identifiers from the NLP engine into
 * concrete, permission-guarded application routes.
 */

export interface DestinationRouteConfig {
  destination: string;
  route: string;
  label: string;
  allowedRoles?: string[]; // If undefined, accessible to any authenticated role
}

export interface NavigationResolution {
  isSupported: boolean;
  isAllowed: boolean;
  destination: string;
  route?: string;
  label?: string;
  reason?: string;
}

/**
 * Registry of canonical destinations mapped to validated application routes.
 * Mirrors the canonical destinations recognized by the backend DestinationRegistry.
 */
export const DESTINATION_ROUTE_MAP: Record<string, DestinationRouteConfig> = {
  DASHBOARD: {
    destination: "DASHBOARD",
    route: "/dashboard",
    label: "Dashboard",
  },
  INVENTORY: {
    destination: "INVENTORY",
    route: "/inventory",
    label: "Store Inventory",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST", "STAFF"],
  },
  BATCHES: {
    destination: "BATCHES",
    route: "/inventory/batches",
    label: "Batches & FEFO",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "CASHIER", "PHARMACIST", "STAFF"],
  },
  CATALOG: {
    destination: "CATALOG",
    route: "/catalog",
    label: "Product Catalog",
  },
  CUSTOMERS: {
    destination: "CUSTOMERS",
    route: "/customers",
    label: "Customer Directory",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
  },
  PURCHASING: {
    destination: "PURCHASING",
    route: "/purchasing/orders",
    label: "Purchase Orders",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
  },
  SUPPLIERS: {
    destination: "SUPPLIERS",
    route: "/suppliers",
    label: "Suppliers & Vendors",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR", "PHARMACIST"],
  },
  POS: {
    destination: "POS",
    route: "/pos",
    label: "Point of Sale (POS)",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
  },
  SALES: {
    destination: "SALES",
    route: "/sales",
    label: "Sales History",
    allowedRoles: ["OWNER", "MANAGER", "CASHIER", "PHARMACIST", "STAFF", "INVENTORY_OPERATOR"],
  },
  TRANSFERS: {
    destination: "TRANSFERS",
    route: "/transfers",
    label: "Store Transfers",
    allowedRoles: ["OWNER", "MANAGER", "INVENTORY_OPERATOR"],
  },
  DEVICES: {
    destination: "DEVICES",
    route: "/devices",
    label: "Registered Devices",
    allowedRoles: ["OWNER", "ADMIN", "MANAGER", "PLATFORM_ADMIN"],
  },
  IMPORTS: {
    destination: "IMPORTS",
    route: "/imports",
    label: "Universal Data Import",
    allowedRoles: ["OWNER", "MANAGER", "ADMIN", "PLATFORM_ADMIN"],
  },
  REPORTS: {
    destination: "REPORTS",
    route: "/reports",
    label: "Reports & Analytics",
    allowedRoles: ["OWNER", "ADMIN", "MANAGER", "PHARMACIST"],
  },
  SETTINGS: {
    destination: "SETTINGS",
    route: "/settings",
    label: "Workstation Settings",
  },
};

/**
 * Resolves a canonical destination string to a validated route and checks role authorization.
 */
export function resolveNavigationAction(
  rawDestination: string | undefined | null,
  userRole?: string
): NavigationResolution {
  if (!rawDestination) {
    return {
      isSupported: false,
      isAllowed: false,
      destination: "",
      reason: "No destination provided",
    };
  }

  const normalizedKey = rawDestination.trim().toUpperCase();
  const config = DESTINATION_ROUTE_MAP[normalizedKey];

  if (!config) {
    return {
      isSupported: false,
      isAllowed: false,
      destination: normalizedKey,
      reason: `Destination '${normalizedKey}' is not mapped to an active route in this workstation.`,
    };
  }

  // Check role authorization if restricted
  if (config.allowedRoles && config.allowedRoles.length > 0) {
    if (!userRole || !config.allowedRoles.includes(userRole)) {
      return {
        isSupported: true,
        isAllowed: false,
        destination: config.destination,
        route: config.route,
        label: config.label,
        reason: `Access Restricted: Current role '${userRole || "UNKNOWN"}' does not have permission to view ${config.label}.`,
      };
    }
  }

  return {
    isSupported: true,
    isAllowed: true,
    destination: config.destination,
    route: config.route,
    label: config.label,
  };
}
