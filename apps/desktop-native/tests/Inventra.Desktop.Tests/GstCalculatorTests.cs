using System;
using Inventra.Desktop.Core.Domain.Gst;
using Xunit;

namespace Inventra.Desktop.Tests;

public class GstCalculatorTests
{
    [Fact]
    public void Calculate_TaxExclusive_IntraState_CalculatesAccurateCgstAndSgst()
    {
        // Arrange: 10 units at ₹20 each with 12% GST intra-state
        decimal unitPrice = 20.00m;
        decimal quantity = 10m;
        decimal discount = 0m;
        decimal gstRate = 12.0m;

        // Act
        var result = GstCalculator.Calculate(
            unitPrice,
            quantity,
            discount,
            gstRate,
            GstCalculationMode.Exclusive,
            GstTransactionType.IntraState
        );

        // Assert
        Assert.Equal(200.00m, result.TaxableAmount);
        Assert.Equal(24.00m, result.TotalTaxAmount);
        Assert.Equal(6.0m, result.CgstRate);
        Assert.Equal(12.00m, result.CgstAmount);
        Assert.Equal(6.0m, result.SgstRate);
        Assert.Equal(12.00m, result.SgstAmount);
        Assert.Equal(0m, result.IgstAmount);
        Assert.Equal(224.00m, result.TotalAmount);
    }

    [Fact]
    public void Calculate_TaxInclusive_IntraState_BackCalculatesTaxableAndGst()
    {
        // Arrange: ₹118 total MRP inclusive of 18% GST
        decimal unitPrice = 118.00m;
        decimal quantity = 1m;
        decimal discount = 0m;
        decimal gstRate = 18.0m;

        // Act
        var result = GstCalculator.Calculate(
            unitPrice,
            quantity,
            discount,
            gstRate,
            GstCalculationMode.Inclusive,
            GstTransactionType.IntraState
        );

        // Assert
        Assert.Equal(100.00m, result.TaxableAmount);
        Assert.Equal(18.00m, result.TotalTaxAmount);
        Assert.Equal(9.00m, result.CgstAmount);
        Assert.Equal(9.00m, result.SgstAmount);
        Assert.Equal(118.00m, result.TotalAmount);
    }

    [Fact]
    public void Calculate_TaxExclusive_InterState_AppliesFullIgst()
    {
        // Arrange: ₹500 at 18% GST inter-state
        decimal unitPrice = 500.00m;
        decimal quantity = 1m;
        decimal discount = 50.00m; // Net ₹450
        decimal gstRate = 18.0m;

        // Act
        var result = GstCalculator.Calculate(
            unitPrice,
            quantity,
            discount,
            gstRate,
            GstCalculationMode.Exclusive,
            GstTransactionType.InterState
        );

        // Assert
        Assert.Equal(450.00m, result.TaxableAmount);
        Assert.Equal(81.00m, result.TotalTaxAmount);
        Assert.Equal(0m, result.CgstAmount);
        Assert.Equal(0m, result.SgstAmount);
        Assert.Equal(81.00m, result.IgstAmount);
        Assert.Equal(531.00m, result.TotalAmount);
    }
}
