using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sales;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Sync;
using Xunit;

namespace Inventra.Desktop.Tests;

/// <summary>
/// Pins the exact JSON the desktop sends to the backend. The fixtures in <c>Fixtures/</c> are also read by the
/// backend's SyncDesktopContractIntegrationTest, which posts them to a live backend, so a change here that
/// breaks the contract fails on one side or the other. Set UPDATE_FIXTURES=1 to regenerate them.
/// </summary>
public class SyncContractTests
{
    // Placeholder ids shared with the backend test, which swaps them for the ids of entities it creates.
    public const string StoreId = "00000000-0000-0000-0000-0000000000a1";
    public const string ProductId = "00000000-0000-0000-0000-0000000000a2";
    public const string BatchId = "00000000-0000-0000-0000-0000000000a3";
    public const string SupplierId = "00000000-0000-0000-0000-0000000000a4";
    private const string DeviceId = "33333333-3333-3333-3333-333333333333";
    private const string EventId = "22222222-2222-2222-2222-222222222222";
    private const string SessionId = "44444444-4444-4444-4444-444444444444";

    internal static SaleRecord SampleSale(string paymentMethod = "UPI") => new()
    {
        Id = "11111111-1111-1111-1111-111111111111",
        BusinessId = "55555555-5555-5555-5555-555555555555",
        StoreId = StoreId,
        DeviceId = DeviceId,
        UserId = "66666666-6666-6666-6666-666666666666",
        InvoiceNumber = "STR-20261026-0001",
        CustomerName = "Asha Rao",
        CustomerPhone = "9876543210",
        DiscountAmount = 0m,
        TotalAmount = 110.00m,
        PaymentMethod = paymentMethod,
        CreatedAt = 1792996200000, // 2026-10-26 06:30 UTC, the same calendar day in every UTC+0..+14 zone
        Items =
        {
            new SaleItemRecord { ProductId = ProductId, BatchId = BatchId, Quantity = 2.0, UnitPrice = 55.00m }
        }
    };

    private static string FixturePath(string name, bool forWriting)
    {
        if (!forWriting) return Path.Combine(AppContext.BaseDirectory, "Fixtures", name);

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "Inventra.Desktop.Tests.csproj")))
            dir = dir.Parent;
        return Path.Combine(dir!.FullName, "Fixtures", name);
    }

    internal static void AssertMatchesFixture(string name, string actualJson)
    {
        var update = Environment.GetEnvironmentVariable("UPDATE_FIXTURES") == "1";
        if (update) File.WriteAllText(FixturePath(name, forWriting: true), actualJson);

        var expected = File.ReadAllText(FixturePath(name, forWriting: update));
        Assert.Equal(CanonicalJson.Canonicalize(expected), CanonicalJson.Canonicalize(actualJson));
    }

    [Fact]
    public void SaleCreatedPayload_MatchesTheFixtureTheBackendIsTestedWith()
    {
        AssertMatchesFixture("sale-created-payload.json", SaleSyncPayload.Build(SampleSale()));
    }

    internal static PurchaseOrderItem SamplePurchaseOrder() => new()
    {
        Id = "99999999-9999-9999-9999-999999999999",
        BusinessId = "55555555-5555-5555-5555-555555555555",
        StoreId = StoreId,
        SupplierId = SupplierId,
        SupplierName = "Acme Distributors",
        OrderNumber = "PO-261026-1001",
        OrderDate = "2026-10-26",
        Notes = "Urgent",
        CreatedAt = 1792996200000,
        Lines =
        {
            new PurchaseOrderLineItem
            {
                Id = "aaaaaaaa-0000-0000-0000-000000000001", ProductId = ProductId, ProductName = "Amoxicillin",
                OrderedQuantity = 10m, PurchaseUnit = "STRIP", ConversionFactor = 10, UnitPrice = 30m,
                DiscountAmount = 15m, TaxRate = 12m
            }
        }
    };

    [Fact]
    public void PurchaseOrderPayload_MatchesTheFixtureTheBackendIsTestedWith()
    {
        var json = PurchaseOrderSyncPayload.Build(SamplePurchaseOrder());
        AssertMatchesFixture("po-created-payload.json", json);

        using var doc = JsonDocument.Parse(json);
        var line = doc.RootElement.GetProperty("lines")[0];
        Assert.Equal(10, line.GetProperty("conversionFactor").GetInt32());       // 1 strip = 10 base units
        Assert.Equal(30m, line.GetProperty("unitCost").GetDecimal());            // the server's name; the old REST DTO said unitPrice
        Assert.Equal(5m, line.GetProperty("discountPercentage").GetDecimal());   // 15 off 300 gross
        Assert.Equal(0m, doc.RootElement.GetProperty("discountAmount").GetDecimal()); // not counted twice
        Assert.Contains("PO-261026-1001", doc.RootElement.GetProperty("notes").GetString());
        Assert.False(line.TryGetProperty("unitPrice", out _));
    }

    [Fact]
    public void SupplierCreatedPayload_MatchesTheFixtureTheBackendIsTestedWith()
    {
        var request = new CreateSupplierApiRequest(
            "SUP-2610-123", "Acme Distributors", "Acme", "DISTRIBUTOR", "27AAAAA0000A1Z5", null, null,
            "orders@acme.example", "9876543210", "Ravi Kumar", "12 MG Road", "Pune", "Maharashtra", "411001",
            30, "Created on Desktop");

        AssertMatchesFixture("supplier-created-payload.json", JsonSerializer.Serialize(request));
    }

    [Fact]
    public void SaleCreatedPayload_CarriesEveryFieldTheServerNeedsAndNothingItComputes()
    {
        using var doc = JsonDocument.Parse(SaleSyncPayload.Build(SampleSale()));
        var root = doc.RootElement;

        Assert.Equal(StoreId, root.GetProperty("storeId").GetString());
        Assert.Equal("2026-10-26", root.GetProperty("saleDate").GetString());
        Assert.Contains("STR-20261026-0001", root.GetProperty("notes").GetString());

        var line = root.GetProperty("lines")[0];
        Assert.Equal(ProductId, line.GetProperty("productId").GetString());
        Assert.Equal(BatchId, line.GetProperty("batchId").GetString());
        Assert.Equal(2m, line.GetProperty("quantity").GetDecimal());
        Assert.Equal(55.00m, line.GetProperty("unitPrice").GetDecimal());

        var payment = root.GetProperty("payments")[0];
        Assert.Equal("UPI", payment.GetProperty("paymentMethod").GetString());
        Assert.Equal(110.00m, payment.GetProperty("amount").GetDecimal());

        // The server owns these: they must not be supplied by the offline client.
        Assert.False(root.TryGetProperty("idempotencyKey", out _));
        Assert.False(root.TryGetProperty("invoiceNumber", out _));
        Assert.False(root.TryGetProperty("totalAmount", out _));
    }

    [Theory]
    [InlineData("cash", "CASH", false)]
    [InlineData("Card", "CARD", false)]
    [InlineData("UPI", "UPI", false)]
    [InlineData("Credit", "OTHER", true)]
    [InlineData("", "OTHER", true)]
    public void PaymentMethod_MapsToTheBackendEnum_AndKeepsUnknownLabelsInTheNotes(string local, string expected, bool noted)
    {
        Assert.Equal(expected, SaleSyncPayload.MapPaymentMethod(local, out var note));
        Assert.Equal(noted, note != null);

        var sale = SampleSale(local);
        using var doc = JsonDocument.Parse(SaleSyncPayload.Build(sale));
        Assert.Equal(expected, doc.RootElement.GetProperty("payments")[0].GetProperty("paymentMethod").GetString());
        if (noted) Assert.Contains("local payment method", doc.RootElement.GetProperty("notes").GetString());
    }

    [Fact]
    public void UploadEnvelope_HasEveryFieldTheServerRequires_AndMatchesTheFixture()
    {
        var op = new OfflineOperation
        {
            OperationId = EventId,
            EventType = SaleSyncPayload.EventType,
            EventVersion = 1,
            DeviceSequenceNumber = 1,
            PayloadJson = SaleSyncPayload.Build(SampleSale()),
            CreatedAt = 1792996200000
        };

        var dto = SyncEngineService.BuildOperationDto(op);
        Assert.NotNull(dto);
        var request = new SyncUploadApiRequest(DeviceId, SessionId, 1, "2026-10-27T00:00:00.000Z", new List<SyncOperationApiDto> { dto! });
        var json = JsonSerializer.Serialize(request);

        using var doc = JsonDocument.Parse(json);
        foreach (var required in new[] { "deviceId", "syncSessionId", "protocolVersion", "clientTimestamp", "operations" })
            Assert.True(doc.RootElement.TryGetProperty(required, out _), $"upload request is missing '{required}'");

        var sent = doc.RootElement.GetProperty("operations")[0];
        foreach (var required in new[] { "eventId", "eventType", "eventVersion", "deviceSequenceNumber", "occurredAt", "payloadChecksum", "payload" })
            Assert.True(sent.TryGetProperty(required, out _), $"operation is missing '{required}'");

        Assert.Equal("2026-10-26T06:30:00.000Z", sent.GetProperty("occurredAt").GetString());
        Assert.Equal(CanonicalJson.ComputeChecksum(op.PayloadJson), sent.GetProperty("payloadChecksum").GetString());

        AssertMatchesFixture("sync-upload-request-sale.json", json);
    }
}
