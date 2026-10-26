using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Inventra.Desktop.Core.Domain.Purchasing;

/// <summary>
/// Client-side validation for supplier records. Length limits mirror the backend's CreateSupplierRequest
/// so a record that passes here is not rejected by the server for size or missing-field reasons.
/// </summary>
public static class SupplierValidator
{
    private static readonly Regex GstinPattern = new(
        "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$", RegexOptions.Compiled);

    private static readonly Regex EmailPattern = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    public static IReadOnlyList<string> Validate(SupplierItem s)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(s.SupplierCode)) errors.Add("Supplier code is required.");
        else if (s.SupplierCode.Trim().Length > 50) errors.Add("Supplier code cannot exceed 50 characters.");

        if (string.IsNullOrWhiteSpace(s.LegalName)) errors.Add("Legal name is required.");
        else if (s.LegalName.Trim().Length > 200) errors.Add("Legal name cannot exceed 200 characters.");

        MaxLength(errors, s.TradeName, 200, "Trade name");
        MaxLength(errors, s.ContactPersonName, 150, "Contact person");
        MaxLength(errors, s.AddressLine1, 255, "Address");
        MaxLength(errors, s.City, 100, "City");
        MaxLength(errors, s.State, 100, "State");
        MaxLength(errors, s.PostalCode, 20, "Postal code");
        MaxLength(errors, s.PhoneNumber, 30, "Phone number");

        if (!string.IsNullOrWhiteSpace(s.Gstin) && !GstinPattern.IsMatch(s.Gstin.Trim().ToUpperInvariant()))
            errors.Add("GSTIN must be a valid 15-character GST number (for example 27AAAAA0000A1Z5).");

        if (!string.IsNullOrWhiteSpace(s.Email))
        {
            if (s.Email.Trim().Length > 150) errors.Add("Email cannot exceed 150 characters.");
            else if (!EmailPattern.IsMatch(s.Email.Trim())) errors.Add("Email address is not valid.");
        }

        if (s.PaymentTermsDays < 0 || s.PaymentTermsDays > 365)
            errors.Add("Payment terms must be between 0 and 365 days.");

        return errors;
    }

    private static void MaxLength(List<string> errors, string? value, int max, string label)
    {
        if (value != null && value.Trim().Length > max)
            errors.Add($"{label} cannot exceed {max} characters.");
    }
}
