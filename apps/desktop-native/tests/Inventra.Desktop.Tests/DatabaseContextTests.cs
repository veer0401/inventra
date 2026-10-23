using System;
using System.IO;
using System.Threading.Tasks;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Xunit;

namespace Inventra.Desktop.Tests;

public class DatabaseContextTests : IDisposable
{
    private readonly string _testDbPath;
    private readonly DatabaseContext _dbContext;

    public DatabaseContextTests()
    {
        _testDbPath = Path.Combine(Path.GetTempPath(), $"inventra_test_{Guid.NewGuid()}.db");
        _dbContext = new DatabaseContext(_testDbPath);
    }

    public void Dispose()
    {
        try
        {
            if (File.Exists(_testDbPath)) File.Delete(_testDbPath);
            var wal = _testDbPath + "-wal";
            if (File.Exists(wal)) File.Delete(wal);
            var shm = _testDbPath + "-shm";
            if (File.Exists(shm)) File.Delete(shm);
        }
        catch
        {
            // Ignore temp file cleanup errors
        }
    }

    [Fact]
    public async Task InitializeAsync_CreatesEmptyCatalog()
    {
        // Act
        await _dbContext.InitializeAsync();

        // Assert: Production catalog must start completely empty
        var repo = new ProductRepository(_dbContext);
        var products = await repo.GetAllProductsAsync();

        Assert.Empty(products);

        // Verify real product creation works without seed dependency
        var newProduct = new Inventra.Desktop.Core.Domain.Inventory.ProductItem
        {
            Id = "prod-test-01",
            BusinessId = "biz-test",
            Code = "MED-001",
            Name = "Paracetamol 500mg",
            GenericName = "Paracetamol",
            DosageForm = "TABLET",
            SellingUnit = "STRIP",
            TaxRate = 12.0m,
            SellingPrice = 30.0m,
            Mrp = 35.0m,
            CurrentStock = 50.0
        };
        await repo.UpsertProductAsync(newProduct);

        var retrieved = await repo.GetProductByIdAsync("prod-test-01");
        Assert.NotNull(retrieved);
        Assert.Equal("Paracetamol 500mg", retrieved.Name);
        Assert.Equal(50.0, retrieved.CurrentStock);
    }

    [Fact]
    public async Task SalesRepository_CreatesAndPersistsSaleWithStockDeduction()
    {
        await _dbContext.InitializeAsync();
        var productRepo = new ProductRepository(_dbContext);
        var salesRepo = new SalesRepository(_dbContext);

        // Seed a real local product with batch
        var product = new Inventra.Desktop.Core.Domain.Inventory.ProductItem
        {
            Id = "prod-sale-test",
            BusinessId = "biz-01",
            Code = "MED-002",
            Name = "Cetirizine 10mg",
            SellingPrice = 20.0m,
            TaxRate = 12.0m,
            CurrentStock = 100.0
        };
        await productRepo.UpsertProductAsync(product);

        var batch = new Inventra.Desktop.Core.Domain.Inventory.BatchItem
        {
            Id = "batch-sale-test",
            BusinessId = "biz-01",
            StoreId = "store-01",
            ProductId = product.Id,
            BatchNumber = "BATCH-001",
            ExpiryDate = "2028-12",
            AvailableQuantity = 100.0,
            SellingPrice = 20.0m,
            Mrp = 25.0m
        };
        await productRepo.UpsertBatchAsync(batch);

        // Create a real sale
        var invoiceNo = await salesRepo.GenerateNextInvoiceNumberAsync("store-01");
        var saleRecord = new Inventra.Desktop.Core.Domain.Sales.SaleRecord
        {
            Id = Guid.NewGuid().ToString(),
            BusinessId = "biz-01",
            StoreId = "store-01",
            InvoiceNumber = invoiceNo,
            CustomerName = "John Doe",
            Subtotal = 40.0m,
            TaxAmount = 4.80m,
            TotalAmount = 44.80m,
            PaymentMethod = "CASH",
            PaymentStatus = "PAID",
            Items = new System.Collections.Generic.List<Inventra.Desktop.Core.Domain.Sales.SaleItemRecord>
            {
                new()
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductId = product.Id,
                    ProductName = product.Name,
                    BatchId = batch.Id,
                    BatchNumber = batch.BatchNumber,
                    Quantity = 2.0,
                    UnitPrice = 20.0m,
                    TaxRate = 12.0m,
                    TotalAmount = 44.80m
                }
            }
        };

        var created = await salesRepo.CreateSaleAsync(saleRecord);
        Assert.NotNull(created);

        // Deduct stock for the sale
        await productRepo.DeductStockForSaleAsync(product.Id, batch.Id, 2.0);

        var updatedProduct = await productRepo.GetProductByIdAsync(product.Id);
        Assert.Equal(98.0, updatedProduct!.CurrentStock);

        var recentSales = await salesRepo.GetRecentSalesAsync("biz-01", "store-01");
        Assert.Single(recentSales);
        Assert.Equal(invoiceNo, recentSales[0].InvoiceNumber);
    }

    [Fact]
    public async Task OfflineQueue_EnforcesMonotonicSequenceNumbersAndChecksum()
    {
        await _dbContext.InitializeAsync();
        var queueRepo = new OfflineQueueRepository(_dbContext);

        var op1 = await queueRepo.EnqueueOperationAsync(
            "BIZ-TEST", "STORE-TEST", "DEV-01", "USER-01",
            "SALE_COMPLETED", "{\"amount\": 150}", "IDEM-001");

        var op2 = await queueRepo.EnqueueOperationAsync(
            "BIZ-TEST", "STORE-TEST", "DEV-01", "USER-01",
            "SALE_COMPLETED", "{\"amount\": 250}", "IDEM-002");

        Assert.Equal(1, op1.DeviceSequenceNumber);
        Assert.Equal(2, op2.DeviceSequenceNumber);
        Assert.Equal(64, op1.PayloadChecksum.Length); // 64 hex chars = SHA-256

        var pendingCount = await queueRepo.GetPendingCountAsync("BIZ-TEST");
        Assert.Equal(2, pendingCount);
    }
}
