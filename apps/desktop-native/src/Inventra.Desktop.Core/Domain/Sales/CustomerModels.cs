using System;

namespace Inventra.Desktop.Core.Domain.Sales;

public sealed class CustomerItem
{
    public string Id { get; set; } = string.Empty;
    public string BusinessId { get; set; } = string.Empty;
    public string CustomerCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Gstin { get; set; }
    public string? Address { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public long UpdatedAt { get; set; }

    public string PhoneDisplay => string.IsNullOrWhiteSpace(Phone) ? "—" : Phone;
    public string EmailDisplay => string.IsNullOrWhiteSpace(Email) ? "—" : Email;
    public string GstinDisplay => string.IsNullOrWhiteSpace(Gstin) ? "—" : Gstin;
    public string StatusBadgeBg => string.Equals(Status, "ACTIVE", StringComparison.OrdinalIgnoreCase) ? "#F0FDF4" : "#F1F5F9";
    public string StatusBadgeFg => string.Equals(Status, "ACTIVE", StringComparison.OrdinalIgnoreCase) ? "#15803D" : "#64748B";
    public string StatusBadgeBorder => string.Equals(Status, "ACTIVE", StringComparison.OrdinalIgnoreCase) ? "#BBF7D0" : "#CBD5E1";
}
