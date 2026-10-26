using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Device;
using Inventra.Desktop.Infrastructure.Hardware;
using Inventra.Desktop.Infrastructure.Sync;
using Xunit;

namespace Inventra.Desktop.Tests;

public class HardwareAndInfrastructureTests : IDisposable
{
    private readonly string _testDbPath;
    private readonly DatabaseContext _dbContext;

    public HardwareAndInfrastructureTests()
    {
        _testDbPath = Path.Combine(Path.GetTempPath(), $"inventra_hw_test_{Guid.NewGuid()}.db");
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
    public async Task DeviceIdentityService_GeneratesAndPersistsMachineIdentity()
    {
        await _dbContext.InitializeAsync();
        var deviceService = new DeviceIdentityService(_dbContext);

        var device1 = await deviceService.GetOrCreateDeviceAsync();
        Assert.NotNull(device1);
        Assert.False(string.IsNullOrWhiteSpace(device1.DeviceId));
        Assert.StartsWith("POS-", device1.DeviceCode);

        // Re-read from another service instance to ensure persistence
        var deviceService2 = new DeviceIdentityService(_dbContext);
        var device2 = await deviceService2.GetOrCreateDeviceAsync();

        Assert.Equal(device1.DeviceId, device2.DeviceId);
        Assert.Equal(device1.DeviceCode, device2.DeviceCode);
    }

    [Fact]
    public void ReceiptPrinterService_GeneratesValidEscPosBytes()
    {
        var printerService = new ReceiptPrinterService();
        var receiptBytes = printerService.GenerateTestReceipt("Inventra Pharmacy", "27AABCU9603R1ZM", "Main Retail Counter");

        Assert.NotEmpty(receiptBytes);
        Assert.True(receiptBytes.Length > 100);

        // Verify ESC/POS init command (0x1B, 0x40)
        Assert.Equal(0x1B, receiptBytes[0]);
        Assert.Equal(0x40, receiptBytes[1]);

        // Verify test receipt text content
        var asciiText = Encoding.ASCII.GetString(receiptBytes);
        Assert.Contains("INVENTRA PHARMACY", asciiText);
        Assert.Contains("27AABCU9603R1ZM", asciiText);
        Assert.Contains("Self-Check", asciiText);

        // Verify real sale receipt generation with actual sale data
        var sale = new Core.Domain.Sales.SaleRecord
        {
            Id = "sale-test-01",
            InvoiceNumber = "INV-2026-0001",
            CustomerName = "Rajesh Sharma",
            Subtotal = 100.0m,
            TaxAmount = 12.0m,
            TotalAmount = 112.0m,
            PaymentMethod = "CASH",
            PaymentStatus = "PAID",
            Items = new System.Collections.Generic.List<Core.Domain.Sales.SaleItemRecord>
            {
                new()
                {
                    ProductName = "Paracetamol 500mg",
                    BatchNumber = "BATCH-X",
                    Quantity = 2,
                    UnitPrice = 50.0m,
                    TaxRate = 12.0m,
                    TotalAmount = 112.0m
                }
            }
        };

        var saleReceiptBytes = printerService.GenerateSaleReceipt(sale, "Inventra Pharmacy", "27AABCU9603R1ZM", "Counter 1", "POS-01");
        var saleAscii = Encoding.ASCII.GetString(saleReceiptBytes);
        Assert.Contains("INV-2026-0001", saleAscii);
        Assert.Contains("Rajesh Sharma", saleAscii);
        Assert.Contains("Paracetamol 500mg", saleAscii);
    }

    [Fact]
    public void BarcodeScannerService_RaisesEventOnScan()
    {
        var scannerService = new BarcodeScannerService();
        string? scannedBarcode = null;

        scannerService.BarcodeScanned += (sender, barcode) =>
        {
            scannedBarcode = barcode;
        };

        scannerService.SimulateScan("8901234567890");
        Assert.Equal("8901234567890", scannedBarcode);
    }

    [Fact]
    public async Task CloudConnectivityService_TransitionsToOfflineWhenUnreachable()
    {
        var apiClient = new InventraApiClient();
        // Point to an unrouted local port to guarantee offline simulation
        apiClient.BaseUrl = "http://127.0.0.1:59999";

        var connectivityService = new CloudConnectivityService(apiClient);
        var isOnline = await connectivityService.CheckConnectivityNowAsync();

        Assert.False(isOnline);
        Assert.Equal(Core.Domain.Identity.ConnectivityState.Offline, connectivityService.CurrentState);
        Assert.Equal("Local Mode (Offline)", connectivityService.StatusDisplay);
    }

    [Fact]
    public async Task SyncEngineService_HandlesOfflineWithoutCrashing()
    {
        await _dbContext.InitializeAsync();
        var queueRepo = new OfflineQueueRepository(_dbContext);
        var apiClient = new InventraApiClient { BaseUrl = "http://127.0.0.1:59999" };
        var syncEngine = new SyncEngineService(queueRepo, apiClient, new PurchasingRepository(_dbContext), new SalesRepository(_dbContext));

        // Queue an operation
        await queueRepo.EnqueueOperationAsync(
            "BIZ-01", "STORE-01", "DEV-01", "USR-01",
            "SALE_COMPLETED", "{\"total\": 100}", "IDEM-TEST");

        // Act: Sync cycle while offline
        var status = await syncEngine.RunSyncCycleAsync("BIZ-01", "DEV-01");

        // Assert: Pending count remains 1, sync engine completes safely
        Assert.Equal(1, status.PendingCount);
        Assert.False(status.IsSyncing);
    }
}
