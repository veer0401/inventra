using System;

namespace Inventra.Desktop.Core.Domain.Gst;

public enum GstCalculationMode
{
    Exclusive,
    Inclusive
}

public enum GstTransactionType
{
    IntraState, // CGST + SGST (50% each)
    InterState  // IGST (100%)
}

public sealed record GstCalculationResult(
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstRate,
    decimal CgstAmount,
    decimal SgstRate,
    decimal SgstAmount,
    decimal IgstRate,
    decimal IgstAmount,
    decimal TotalTaxAmount,
    decimal TotalAmount
);

public static class GstCalculator
{
    public static GstCalculationResult Calculate(
        decimal unitPrice,
        decimal quantity,
        decimal discountAmount,
        decimal gstRate,
        GstCalculationMode mode,
        GstTransactionType transactionType)
    {
        if (quantity < 0) throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity cannot be negative.");
        if (unitPrice < 0) throw new ArgumentOutOfRangeException(nameof(unitPrice), "Unit price cannot be negative.");
        if (gstRate < 0) throw new ArgumentOutOfRangeException(nameof(gstRate), "GST rate cannot be negative.");

        decimal gross = unitPrice * quantity;
        decimal netBeforeTax = Math.Max(0m, gross - discountAmount);

        decimal taxableAmount;
        decimal totalTax;
        decimal totalAmount;

        if (mode == GstCalculationMode.Inclusive)
        {
            // Net is total inclusive of tax
            totalAmount = Math.Round(netBeforeTax, 2, MidpointRounding.AwayFromZero);
            if (gstRate > 0)
            {
                taxableAmount = Math.Round(totalAmount / (1m + (gstRate / 100m)), 2, MidpointRounding.AwayFromZero);
                totalTax = totalAmount - taxableAmount;
            }
            else
            {
                taxableAmount = totalAmount;
                totalTax = 0m;
            }
        }
        else
        {
            // Net is taxable base
            taxableAmount = Math.Round(netBeforeTax, 2, MidpointRounding.AwayFromZero);
            totalTax = Math.Round(taxableAmount * (gstRate / 100m), 2, MidpointRounding.AwayFromZero);
            totalAmount = taxableAmount + totalTax;
        }

        decimal cgstRate = 0m;
        decimal cgstAmount = 0m;
        decimal sgstRate = 0m;
        decimal sgstAmount = 0m;
        decimal igstRate = 0m;
        decimal igstAmount = 0m;

        if (transactionType == GstTransactionType.IntraState)
        {
            cgstRate = gstRate / 2m;
            sgstRate = gstRate / 2m;
            cgstAmount = Math.Round(totalTax / 2m, 2, MidpointRounding.AwayFromZero);
            sgstAmount = totalTax - cgstAmount; // Balance cents accurately
        }
        else
        {
            igstRate = gstRate;
            igstAmount = totalTax;
        }

        return new GstCalculationResult(
            TaxableAmount: taxableAmount,
            GstRate: gstRate,
            CgstRate: cgstRate,
            CgstAmount: cgstAmount,
            SgstRate: sgstRate,
            SgstAmount: sgstAmount,
            IgstRate: igstRate,
            IgstAmount: igstAmount,
            TotalTaxAmount: totalTax,
            TotalAmount: totalAmount
        );
    }
}
