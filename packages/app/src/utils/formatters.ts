/**
 * Standard utility formatters for Inventra Web
 */

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === "") {
    return "₹0.00";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return "₹0.00";
  }
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(isoString);
  }
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return String(dateString);
  }
}
