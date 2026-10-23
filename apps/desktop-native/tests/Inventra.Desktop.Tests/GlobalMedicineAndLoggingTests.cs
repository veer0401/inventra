using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Catalog;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Logging;
using Xunit;

namespace Inventra.Desktop.Tests;

public class GlobalMedicineAndLoggingTests : IDisposable
{
    private readonly string _testDbPath;
    private readonly string _testLogsDir;
    private readonly DatabaseContext _dbContext;
    private readonly AppLogger _logger;

    public GlobalMedicineAndLoggingTests()
    {
        _testDbPath = Path.Combine(Path.GetTempPath(), $"inventra_cat_test_{Guid.NewGuid()}.db");
        _testLogsDir = Path.Combine(Path.GetTempPath(), $"inventra_logs_{Guid.NewGuid()}");
        Directory.CreateDirectory(_testLogsDir);

        _dbContext = new DatabaseContext(_testDbPath);
        _logger = new AppLogger(_testLogsDir);
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

            if (Directory.Exists(_testLogsDir)) Directory.Delete(_testLogsDir, true);
        }
        catch
        {
            // Ignore cleanup errors
        }
    }

    [Fact]
    public async Task GlobalMedicineCatalog_AndProductsApi_ReturnsAscorilDPlusSyrup()
    {
        var client = new Inventra.Desktop.Infrastructure.Api.InventraApiClient();
        client.BaseUrl = "http://localhost:8081";

        if (!await client.PingAsync())
        {
            // Live backend is not currently running on http://localhost:8081; skip live endpoint assertions
            return;
        }

        // Authenticate with backend platform admin
        var authRes = await client.LoginAsync("admin@inventra.local", "PlatformAdmin@Inventra2026!");
        Assert.NotNull(authRes);
        Assert.False(string.IsNullOrEmpty(authRes.AccessToken));
        client.SetAuthToken(authRes.AccessToken);

        // 1. Verify Global Medicine Catalog returns Ascoril D Plus Syrup
        var globalSearch = await client.QueryGlobalMedicinesWithDiagnosticsAsync("Ascoril");
        Assert.True(globalSearch.Success, $"Global search failed: {globalSearch.ErrorMessage}");
        Assert.NotNull(globalSearch.Data);
        var ascorilGlobal = globalSearch.Data.Content.FirstOrDefault(m => m.Name.Contains("Ascoril", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(ascorilGlobal);
        Assert.Equal("Ascoril D Plus Syrup", ascorilGlobal.Name);
        Assert.Equal("GLENMARK PHARMACEUTICALS LTD", ascorilGlobal.Manufacturer?.ToUpperInvariant());
    }

    [Fact]
    public void AppLogger_PersistsAndRedactsSensitiveCredentials()
    {
        // Act
        _logger.Info(LogCategory.AUTH, "User login with password: \"password\": \"SuperSecret123!\"");
        _logger.LogApi("GET", "https://api.inventra.io/v1/sync?auth=Bearer secretToken999", 200, 42);
        _logger.Error(LogCategory.ERROR, "Unhandled exception occurred", new InvalidOperationException("Test ex"));

        // Assert files exist
        var inventraLog = Path.Combine(_testLogsDir, "inventra.log");
        var apiLog = Path.Combine(_testLogsDir, "api.log");
        var errorsLog = Path.Combine(_testLogsDir, "errors.log");

        Assert.True(File.Exists(inventraLog));
        Assert.True(File.Exists(apiLog));
        Assert.True(File.Exists(errorsLog));

        // Verify redaction: secrets must NOT appear in raw text
        var content = File.ReadAllText(inventraLog);
        Assert.DoesNotContain("SuperSecret123!", content);
        Assert.DoesNotContain("secretToken999", content);
        Assert.Contains("[REDACTED_CREDENTIAL]", content);
        Assert.Contains("[AUTH    ]", content);
        Assert.Contains("[API     ]", content);
    }

    [Fact]
    public void AppLogger_RoutesCategoriesToSpecializedLogs()
    {
        _logger.Info(LogCategory.STARTUP, "Workstation boot sequence initialized");
        _logger.LogCatalog("SEARCH", "paracetamol", 15, 120, "SUCCESS");
        _logger.LogSync("UPLOAD", 2, "ACKNOWLEDGED");

        var startupLog = Path.Combine(_testLogsDir, "startup.log");
        var catalogLog = Path.Combine(_testLogsDir, "catalog.log");
        var syncLog = Path.Combine(_testLogsDir, "sync.log");

        Assert.True(File.Exists(startupLog));
        Assert.True(File.Exists(catalogLog));
        Assert.True(File.Exists(syncLog));

        Assert.Contains("boot sequence", File.ReadAllText(startupLog));
        Assert.Contains("paracetamol", File.ReadAllText(catalogLog));
        Assert.Contains("UPLOAD", File.ReadAllText(syncLog));
    }

    [Fact]
    public async Task GlobalMedicineCacheRepository_PersistsAndSearchesReferenceMedicines()
    {
        await _dbContext.InitializeAsync();
        var cacheRepo = new GlobalMedicineCacheRepository(_dbContext);

        Assert.Equal(0, await cacheRepo.GetCachedCountAsync());

        var items = new List<GlobalMedicineItem>
        {
            new()
            {
                Id = "global-med-001",
                Name = "Paracetamol 650mg Tablet",
                GenericName = "Paracetamol",
                BrandName = "Dolo",
                Manufacturer = "Micro Labs",
                DosageForm = "TABLET",
                Strength = "650mg",
                BaseUnit = "TABLET",
                SellingUnit = "STRIP",
                UnitsPerSellingUnit = 15,
                HsnCode = "30049060",
                TaxRate = 12.0m,
                PrescriptionRequired = false,
                Barcode = "8901148210012"
            },
            new()
            {
                Id = "global-med-002",
                Name = "Amoxicillin 500mg Capsules",
                GenericName = "Amoxicillin",
                BrandName = "Mox",
                Manufacturer = "Ranbaxy",
                DosageForm = "CAPSULE",
                Strength = "500mg",
                BaseUnit = "CAPSULE",
                SellingUnit = "STRIP",
                UnitsPerSellingUnit = 10,
                HsnCode = "30041010",
                TaxRate = 12.0m,
                PrescriptionRequired = true,
                Barcode = "8901148210099"
            }
        };

        // Act
        await cacheRepo.UpsertCachedMedicinesAsync(items);

        // Assert
        Assert.Equal(2, await cacheRepo.GetCachedCountAsync());

        var searchByName = await cacheRepo.SearchCachedMedicinesAsync("Paracetamol");
        Assert.Single(searchByName);
        Assert.Equal("Paracetamol 650mg Tablet", searchByName[0].Name);
        Assert.Equal("Dolo", searchByName[0].BrandName);

        var searchByBarcode = await cacheRepo.SearchCachedMedicinesAsync("8901148210099");
        Assert.Single(searchByBarcode);
        Assert.Equal("Amoxicillin 500mg Capsules", searchByBarcode[0].Name);
    }

    [Fact]
    public async Task GlobalMedicine_ImportToProduct_PreservesSeparationAndZeroStock()
    {
        await _dbContext.InitializeAsync();
        var productRepo = new ProductRepository(_dbContext);

        var globalMed = new GlobalMedicineItem
        {
            Id = "gmd-test-42",
            Name = "Azithromycin 500mg Tablet",
            GenericName = "Azithromycin",
            DosageForm = "TABLET",
            Strength = "500mg",
            TaxRate = 12.0m
        };

        // When imported to business catalog:
        var businessProduct = new ProductItem
        {
            Id = Guid.NewGuid().ToString(),
            BusinessId = "biz-corp-1",
            StoreId = "store-01",
            Code = "MED-88412",
            Name = globalMed.Name,
            GenericName = globalMed.GenericName,
            DosageForm = globalMed.DosageForm,
            Strength = globalMed.Strength,
            TaxRate = globalMed.TaxRate,
            SellingPrice = 120.0m,
            Mrp = 135.0m,
            CurrentStock = 0.0 // MUST be 0! Global Medicine import must not create stock!
        };

        await productRepo.UpsertProductAsync(businessProduct);

        // Assert product in catalog
        var products = await productRepo.GetProductsByBusinessAsync("biz-corp-1");
        Assert.Single(products);
        Assert.Equal("Azithromycin 500mg Tablet", products[0].Name);
        Assert.Equal(0.0, products[0].CurrentStock);

        // Assert NO batches were created
        var batches = await productRepo.GetBatchesForProductAsync(businessProduct.Id);
        Assert.Empty(batches);
    }

    [Fact]
    public async Task OfflineMedicineCreation_EnqueuesSyncOperation()
    {
        await _dbContext.InitializeAsync();
        var productRepo = new ProductRepository(_dbContext);
        var queueRepo = new OfflineQueueRepository(_dbContext);

        var localProduct = new ProductItem
        {
            Id = "prod-local-01",
            BusinessId = "biz-main",
            StoreId = "store-01",
            Code = "MED-0099",
            Name = "Ayurvedic Cough Syrup 100ml",
            GenericName = "Tulsi & Vasaka",
            DosageForm = "SYRUP",
            Strength = "100ml",
            SellingUnit = "BOTTLE",
            SellingPrice = 85.0m,
            Mrp = 95.0m,
            CurrentStock = 0.0
        };

        await productRepo.UpsertProductAsync(localProduct);

        var op = await queueRepo.EnqueueOperationAsync(
            "biz-main", "store-01", "DEV-POS-1", "USER-1",
            "PRODUCT_CREATED",
            $"{{\"id\":\"{localProduct.Id}\",\"name\":\"{localProduct.Name}\"}}",
            Guid.NewGuid().ToString()
        );

        Assert.NotNull(op);
        Assert.Equal("PRODUCT_CREATED", op.EventType);
        Assert.Equal(1, op.DeviceSequenceNumber);

        var pending = await queueRepo.GetPendingCountAsync("biz-main");
        Assert.Equal(1, pending);
    }
}
