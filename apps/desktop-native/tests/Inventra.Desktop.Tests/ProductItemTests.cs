using System;
using Inventra.Desktop.Core.Domain.Inventory;
using Xunit;

namespace Inventra.Desktop.Tests;

public class ProductItemTests
{
    [Theory]
    [InlineData(0, "OUT OF STOCK", "Danger")]
    [InlineData(-5, "OUT OF STOCK", "Danger")]
    [InlineData(8, "LOW STOCK", "Warning")]
    [InlineData(14, "LOW STOCK", "Warning")]
    [InlineData(15, "IN STOCK", "Success")]
    [InlineData(100, "IN STOCK", "Success")]
    public void StockStatus_ClassifiesCorrectly(double stock, string expectedStatus, string expectedClass)
    {
        var product = new ProductItem { CurrentStock = stock };
        Assert.Equal(expectedStatus, product.StockStatus);
        Assert.Equal(expectedClass, product.StockStatusClass);
    }

    [Fact]
    public void BatchItem_DetectsExpiredAndNearExpiry()
    {
        var expiredBatch = new BatchItem { ExpiryDate = "2020-01" };
        Assert.True(expiredBatch.IsExpired);
        Assert.False(expiredBatch.IsNearExpiry);

        var futureBatch = new BatchItem { ExpiryDate = "2030-12" };
        Assert.False(futureBatch.IsExpired);
        Assert.False(futureBatch.IsNearExpiry);
    }
}
