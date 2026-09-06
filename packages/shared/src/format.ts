const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const defaultQtyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/**
 * Format monetary amount in Indian Rupees (INR)
 * e.g. 1250.5 -> "₹1,250.50"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0.00";
  }
  return inrFormatter.format(amount);
}

/**
 * Format quantity with fixed or dynamic decimals
 * e.g. 15.000 -> "15", 15.5 -> "15.5"
 */
export function formatQuantity(quantity: number | null | undefined, maxDecimals = 3): string {
  if (quantity === null || quantity === undefined || isNaN(quantity)) {
    return "0";
  }
  if (maxDecimals === 3) {
    return defaultQtyFormatter.format(quantity);
  }
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(quantity);
}

/**
 * Format ISO date string into Indian Standard Time date
 * e.g. "2026-08-25T12:30:00Z" -> "25 Aug 2026"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return dateFormatter.format(date);
  } catch {
    return "-";
  }
}

/**
 * Format ISO date string into Indian Standard Time with time
 * e.g. "2026-08-25T12:30:00Z" -> "25 Aug 2026, 06:00:00 pm"
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return dateTimeFormatter.format(date);
  } catch {
    return "-";
  }
}
