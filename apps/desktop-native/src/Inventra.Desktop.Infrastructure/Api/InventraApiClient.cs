using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace Inventra.Desktop.Infrastructure.Api;

public sealed record LoginApiRequest(
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("password")] string Password,
    [property: JsonPropertyName("deviceId")] string? DeviceId = null,
    [property: JsonPropertyName("deviceCode")] string? DeviceCode = null,
    [property: JsonPropertyName("deviceType")] string DeviceType = "DESKTOP",
    [property: JsonPropertyName("platformOs")] string PlatformOs = "Windows",
    [property: JsonPropertyName("appVersion")] string AppVersion = "1.0.0"
);

public sealed record ApiResponseWrapper<T>(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("data")] T? Data,
    [property: JsonPropertyName("message")] string? Message
);

/// <summary>
/// Outcome of a write call. A rejection (4xx) means the server refused the data and retrying will not help;
/// a transient failure (unreachable, timeout, 5xx) means the write may be retried or queued for later.
/// </summary>
public sealed record ApiResult<T>(T? Data, int StatusCode, string? Error, bool IsTransient, string? ErrorCode = null)
{
    public bool IsSuccess => Data != null && Error == null;
    public bool IsRejected => !IsSuccess && !IsTransient;

    public static ApiResult<T> Ok(T data, int statusCode) => new(data, statusCode, null, false);
    public static ApiResult<T> Rejected(string error, int statusCode, string? errorCode = null) => new(default, statusCode, error, false, errorCode);
    public static ApiResult<T> Transient(string error, int statusCode = 0) => new(default, statusCode, error, true);
}

public sealed record PageResponse<T>(
    [property: JsonPropertyName("content")] List<T> Content,
    [property: JsonPropertyName("totalElements")] long TotalElements,
    [property: JsonPropertyName("totalPages")] int TotalPages,
    [property: JsonPropertyName("size")] int Size,
    [property: JsonPropertyName("number")] int Number
);

public sealed record UserSummaryApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("status")] string? Status
);

public sealed record ActiveContextApiDto(
    [property: JsonPropertyName("businessId")] string? BusinessId,
    [property: JsonPropertyName("businessName")] string? BusinessName,
    [property: JsonPropertyName("storeId")] string? StoreId,
    [property: JsonPropertyName("storeName")] string? StoreName,
    [property: JsonPropertyName("storeCode")] string? StoreCode,
    [property: JsonPropertyName("role")] string? Role,
    [property: JsonPropertyName("deviceId")] string? DeviceId
);

public sealed record StoreSummaryApiDto(
    [property: JsonPropertyName("storeId")] string StoreId,
    [property: JsonPropertyName("storeName")] string StoreName,
    [property: JsonPropertyName("storeCode")] string? StoreCode
);

public sealed record MembershipSummaryApiDto(
    [property: JsonPropertyName("businessId")] string BusinessId,
    [property: JsonPropertyName("businessName")] string BusinessName,
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("stores")] List<StoreSummaryApiDto>? Stores
);

public sealed record AuthApiResponse(
    [property: JsonPropertyName("accessToken")] string AccessToken,
    [property: JsonPropertyName("refreshToken")] string RefreshToken,
    [property: JsonPropertyName("expiresIn")] long ExpiresIn,
    [property: JsonPropertyName("user")] UserSummaryApiDto? User,
    [property: JsonPropertyName("activeContext")] ActiveContextApiDto? ActiveContext,
    [property: JsonPropertyName("memberships")] List<MembershipSummaryApiDto>? Memberships
);

public sealed record RegisterDeviceApiRequest(
    [property: JsonPropertyName("deviceName")] string DeviceName,
    [property: JsonPropertyName("deviceCode")] string DeviceCode,
    [property: JsonPropertyName("deviceType")] string DeviceType = "DESKTOP",
    [property: JsonPropertyName("platformOs")] string PlatformOs = "Windows",
    [property: JsonPropertyName("appVersion")] string AppVersion = "1.0.0"
);

public sealed record DeviceApiResponse(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("deviceName")] string DeviceName,
    [property: JsonPropertyName("deviceCode")] string DeviceCode,
    [property: JsonPropertyName("status")] string Status
);

public sealed record GlobalMedicineApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("genericName")] string? GenericName,
    [property: JsonPropertyName("brandName")] string? BrandName,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("dosageForm")] string? DosageForm,
    [property: JsonPropertyName("strength")] string? Strength,
    [property: JsonPropertyName("baseUnit")] string? BaseUnit,
    [property: JsonPropertyName("sellingUnit")] string? SellingUnit,
    [property: JsonPropertyName("unitsPerSellingUnit")] int UnitsPerSellingUnit,
    [property: JsonPropertyName("hsnCode")] string? HsnCode,
    [property: JsonPropertyName("taxRate")] decimal TaxRate,
    [property: JsonPropertyName("prescriptionRequired")] bool PrescriptionRequired,
    [property: JsonPropertyName("barcode")] string? Barcode,
    [property: JsonPropertyName("description")] string? Description
);

public sealed record ProductApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("genericName")] string? GenericName = null,
    [property: JsonPropertyName("brandName")] string? BrandName = null,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer = null,
    [property: JsonPropertyName("dosageForm")] string? DosageForm = null,
    [property: JsonPropertyName("strength")] string? Strength = null,
    [property: JsonPropertyName("baseUnit")] string? BaseUnit = null,
    [property: JsonPropertyName("sellingUnit")] string? SellingUnit = null,
    [property: JsonPropertyName("unitsPerSellingUnit")] int UnitsPerSellingUnit = 1,
    [property: JsonPropertyName("hsnCode")] string? HsnCode = null,
    [property: JsonPropertyName("taxRate")] decimal TaxRate = 0m,
    [property: JsonPropertyName("prescriptionRequired")] bool PrescriptionRequired = false,
    [property: JsonPropertyName("currentStock")] double? CurrentStock = null,
    [property: JsonPropertyName("businessId")] string? BusinessId = null
);

public sealed record RefreshTokenApiRequest(
    [property: JsonPropertyName("refreshToken")] string RefreshToken
);

public sealed record CreateProductApiRequest(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("genericName")] string? GenericName,
    [property: JsonPropertyName("brandName")] string? BrandName,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("dosageForm")] string DosageForm,
    [property: JsonPropertyName("strength")] string? Strength,
    [property: JsonPropertyName("baseUnit")] string BaseUnit,
    [property: JsonPropertyName("sellingUnit")] string? SellingUnit,
    [property: JsonPropertyName("unitsPerSellingUnit")] int UnitsPerSellingUnit,
    [property: JsonPropertyName("hsnCode")] string? HsnCode,
    [property: JsonPropertyName("taxRate")] decimal TaxRate,
    [property: JsonPropertyName("prescriptionRequired")] bool PrescriptionRequired
);

// --- PURCHASING DTOs ---

public sealed record SupplierApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("supplierCode")] string SupplierCode,
    [property: JsonPropertyName("legalName")] string LegalName,
    [property: JsonPropertyName("tradeName")] string? TradeName,
    [property: JsonPropertyName("gstin")] string? Gstin,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("contactPersonName")] string? ContactPersonName,
    [property: JsonPropertyName("addressLine1")] string? AddressLine1,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("postalCode")] string? PostalCode,
    [property: JsonPropertyName("paymentTermsDays")] int PaymentTermsDays,
    [property: JsonPropertyName("status")] string Status
);

public sealed record CreateSupplierApiRequest(
    [property: JsonPropertyName("supplierCode")] string SupplierCode,
    [property: JsonPropertyName("legalName")] string LegalName,
    [property: JsonPropertyName("tradeName")] string? TradeName,
    [property: JsonPropertyName("supplierType")] string SupplierType,
    [property: JsonPropertyName("gstin")] string? Gstin,
    [property: JsonPropertyName("drugLicenseNumber")] string? DrugLicenseNumber,
    [property: JsonPropertyName("pan")] string? Pan,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("contactPersonName")] string? ContactPersonName,
    [property: JsonPropertyName("addressLine1")] string? AddressLine1,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("postalCode")] string? PostalCode,
    [property: JsonPropertyName("paymentTermsDays")] int PaymentTermsDays,
    [property: JsonPropertyName("notes")] string? Notes
);

public sealed record PurchaseOrderLineApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("productId")] string ProductId,
    [property: JsonPropertyName("productName")] string? ProductName,
    [property: JsonPropertyName("purchaseUnit")] string PurchaseUnit,
    [property: JsonPropertyName("conversionFactor")] int ConversionFactor,
    [property: JsonPropertyName("orderedQuantity")] decimal OrderedQuantity,
    [property: JsonPropertyName("receivedQuantity")] decimal ReceivedQuantity,
    [property: JsonPropertyName("unitPrice")] decimal UnitPrice,
    [property: JsonPropertyName("discountPercentage")] decimal DiscountPercentage,
    [property: JsonPropertyName("taxRate")] decimal TaxRate,
    [property: JsonPropertyName("lineTotal")] decimal LineTotal
);

public sealed record PurchaseOrderApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("businessId")] string BusinessId,
    [property: JsonPropertyName("storeId")] string StoreId,
    [property: JsonPropertyName("supplierId")] string SupplierId,
    [property: JsonPropertyName("supplierName")] string? SupplierName,
    [property: JsonPropertyName("orderNumber")] string OrderNumber,
    [property: JsonPropertyName("orderDate")] string OrderDate,
    [property: JsonPropertyName("expectedDeliveryDate")] string? ExpectedDeliveryDate,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("subtotal")] decimal Subtotal,
    [property: JsonPropertyName("taxAmount")] decimal TaxAmount,
    [property: JsonPropertyName("totalAmount")] decimal TotalAmount,
    [property: JsonPropertyName("lines")] List<PurchaseOrderLineApiDto>? Lines
);

public sealed record CreatePurchaseOrderLineApiRequest(
    [property: JsonPropertyName("productId")] string ProductId,
    [property: JsonPropertyName("supplierProductCode")] string? SupplierProductCode,
    [property: JsonPropertyName("purchaseUnit")] string PurchaseUnit,
    [property: JsonPropertyName("conversionFactor")] int ConversionFactor,
    [property: JsonPropertyName("orderedQuantity")] decimal OrderedQuantity,
    [property: JsonPropertyName("unitPrice")] decimal UnitPrice,
    [property: JsonPropertyName("discountPercentage")] decimal DiscountPercentage,
    [property: JsonPropertyName("taxRate")] decimal TaxRate
);

public sealed record CreatePurchaseOrderApiRequest(
    [property: JsonPropertyName("storeId")] string StoreId,
    [property: JsonPropertyName("supplierId")] string SupplierId,
    [property: JsonPropertyName("orderDate")] string OrderDate,
    [property: JsonPropertyName("expectedDeliveryDate")] string? ExpectedDeliveryDate,
    [property: JsonPropertyName("overallDiscountPercentage")] decimal OverallDiscountPercentage,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("lines")] List<CreatePurchaseOrderLineApiRequest> Lines
);

public sealed record GoodsReceiptLineApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("productId")] string ProductId,
    [property: JsonPropertyName("productName")] string? ProductName,
    [property: JsonPropertyName("receivedQuantity")] decimal ReceivedQuantity,
    [property: JsonPropertyName("rejectedQuantity")] decimal RejectedQuantity,
    [property: JsonPropertyName("batchNumber")] string BatchNumber,
    [property: JsonPropertyName("expiryDate")] string ExpiryDate,
    [property: JsonPropertyName("unitCost")] decimal UnitCost,
    [property: JsonPropertyName("mrp")] decimal Mrp,
    [property: JsonPropertyName("sellingPrice")] decimal SellingPrice
);

public sealed record GoodsReceiptApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("businessId")] string BusinessId,
    [property: JsonPropertyName("storeId")] string StoreId,
    [property: JsonPropertyName("supplierId")] string SupplierId,
    [property: JsonPropertyName("receiptNumber")] string ReceiptNumber,
    [property: JsonPropertyName("vendorDeliveryNote")] string? VendorDeliveryNote,
    [property: JsonPropertyName("receivedDate")] string ReceivedDate,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("lines")] List<GoodsReceiptLineApiDto>? Lines
);

public sealed record CreateGoodsReceiptLineApiRequest(
    [property: JsonPropertyName("purchaseOrderLineId")] string? PurchaseOrderLineId,
    [property: JsonPropertyName("productId")] string ProductId,
    [property: JsonPropertyName("receivedQuantity")] decimal ReceivedQuantity,
    [property: JsonPropertyName("purchaseUnit")] string PurchaseUnit,
    [property: JsonPropertyName("conversionFactor")] int ConversionFactor,
    [property: JsonPropertyName("rejectedQuantity")] decimal RejectedQuantity,
    [property: JsonPropertyName("batchNumber")] string BatchNumber,
    [property: JsonPropertyName("manufacturingDate")] string? ManufacturingDate,
    [property: JsonPropertyName("expiryDate")] string ExpiryDate,
    [property: JsonPropertyName("unitCost")] decimal UnitCost,
    [property: JsonPropertyName("mrp")] decimal Mrp,
    [property: JsonPropertyName("sellingPrice")] decimal SellingPrice,
    [property: JsonPropertyName("taxRate")] decimal TaxRate
);

public sealed record CreateGoodsReceiptApiRequest(
    [property: JsonPropertyName("storeId")] string StoreId,
    [property: JsonPropertyName("supplierId")] string SupplierId,
    [property: JsonPropertyName("purchaseOrderId")] string? PurchaseOrderId,
    [property: JsonPropertyName("vendorDeliveryNote")] string? VendorDeliveryNote,
    [property: JsonPropertyName("receivedDate")] string ReceivedDate,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("idempotencyKey")] string? IdempotencyKey,
    [property: JsonPropertyName("lines")] List<CreateGoodsReceiptLineApiRequest> Lines
);

public sealed record UpdateSupplierApiRequest(
    [property: JsonPropertyName("legalName")] string? LegalName,
    [property: JsonPropertyName("tradeName")] string? TradeName,
    [property: JsonPropertyName("supplierType")] string? SupplierType,
    [property: JsonPropertyName("gstin")] string? Gstin,
    [property: JsonPropertyName("drugLicenseNumber")] string? DrugLicenseNumber,
    [property: JsonPropertyName("pan")] string? Pan,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("contactPersonName")] string? ContactPersonName,
    [property: JsonPropertyName("addressLine1")] string? AddressLine1,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("postalCode")] string? PostalCode,
    [property: JsonPropertyName("paymentTermsDays")] int? PaymentTermsDays
);

public sealed record UpdateProductApiRequest(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("genericName")] string? GenericName,
    [property: JsonPropertyName("brandName")] string? BrandName,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("dosageForm")] string? DosageForm,
    [property: JsonPropertyName("strength")] string? Strength,
    [property: JsonPropertyName("baseUnit")] string? BaseUnit,
    [property: JsonPropertyName("sellingUnit")] string? SellingUnit,
    [property: JsonPropertyName("unitsPerSellingUnit")] int? UnitsPerSellingUnit,
    [property: JsonPropertyName("hsnCode")] string? HsnCode,
    [property: JsonPropertyName("taxRate")] decimal? TaxRate,
    [property: JsonPropertyName("isTaxInclusive")] bool? IsTaxInclusive,
    [property: JsonPropertyName("prescriptionRequired")] bool? PrescriptionRequired
);

public sealed record CustomerApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("customerCode")] string CustomerCode,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("address")] string? Address,
    [property: JsonPropertyName("gstin")] string? Gstin,
    [property: JsonPropertyName("status")] string? Status
);

public sealed record CreateCustomerApiRequest(
    [property: JsonPropertyName("customerCode")] string? CustomerCode,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("address")] string? Address,
    [property: JsonPropertyName("gstin")] string? Gstin,
    [property: JsonPropertyName("notes")] string? Notes
);

public sealed record InventoryBatchApiDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("businessId")] string BusinessId,
    [property: JsonPropertyName("storeId")] string StoreId,
    [property: JsonPropertyName("productId")] string ProductId,
    [property: JsonPropertyName("productName")] string? ProductName,
    [property: JsonPropertyName("batchNumber")] string BatchNumber,
    [property: JsonPropertyName("expiryDate")] string ExpiryDate,
    [property: JsonPropertyName("availableQuantity")] double AvailableQuantity,
    [property: JsonPropertyName("sellingPrice")] decimal SellingPrice,
    [property: JsonPropertyName("mrp")] decimal Mrp,
    [property: JsonPropertyName("purchasePrice")] decimal? PurchasePrice,
    [property: JsonPropertyName("manufacturingDate")] string? ManufacturingDate
);

// Mirrors sync/api/dto/SyncUploadRequest.java: deviceId, syncSessionId, protocolVersion (>= 1),
// clientTimestamp and 1..50 operations are all required, or the server answers 400.
public sealed record SyncUploadApiRequest(
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("syncSessionId")] string SyncSessionId,
    [property: JsonPropertyName("protocolVersion")] int ProtocolVersion,
    [property: JsonPropertyName("clientTimestamp")] string ClientTimestamp,
    [property: JsonPropertyName("operations")] List<SyncOperationApiDto> Operations
);

public sealed record SyncOperationApiDto(
    [property: JsonPropertyName("eventId")] string EventId,
    [property: JsonPropertyName("eventType")] string EventType,
    [property: JsonPropertyName("eventVersion")] int EventVersion,
    [property: JsonPropertyName("deviceSequenceNumber")] long DeviceSequenceNumber,
    [property: JsonPropertyName("occurredAt")] string OccurredAt,
    [property: JsonPropertyName("payloadChecksum")] string PayloadChecksum,
    [property: JsonPropertyName("payload")] JsonElement Payload
);

// Mirrors sync/api/dto/SyncUploadResponse.java and SyncOperationResult.java.
public sealed record SyncUploadApiResponse(
    [property: JsonPropertyName("processedCount")] int ProcessedCount,
    [property: JsonPropertyName("results")] List<SyncOperationResultApiDto> Results
);

public sealed record SyncOperationResultApiDto(
    [property: JsonPropertyName("eventId")] string EventId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("serverEntityId")] string? ServerEntityId,
    [property: JsonPropertyName("errorCode")] string? ErrorCode,
    [property: JsonPropertyName("message")] string? Message,
    [property: JsonPropertyName("retryable")] bool Retryable = false
);

// Mirrors sync/api/dto/SyncDownloadResponse.java and ChangeFeedEntry.java.
public sealed record SyncDownloadApiResponse(
    [property: JsonPropertyName("currentCursor")] long CurrentCursor,
    [property: JsonPropertyName("nextCursor")] long NextCursor,
    [property: JsonPropertyName("hasMore")] bool HasMore,
    [property: JsonPropertyName("changes")] List<SyncChangeApiDto> Changes
);

public sealed record SyncChangeApiDto(
    [property: JsonPropertyName("changeSeq")] long ChangeSeq,
    [property: JsonPropertyName("entityType")] string EntityType,
    [property: JsonPropertyName("entityId")] string EntityId,
    [property: JsonPropertyName("operation")] string Operation,
    [property: JsonPropertyName("entityVersion")] int EntityVersion,
    [property: JsonPropertyName("payload")] JsonElement Payload
);

public sealed record CatalogSearchResult(
    bool Success,
    PageResponse<GlobalMedicineApiDto>? Data,
    string? ErrorMessage,
    int StatusCode,
    long DurationMs,
    bool IsOffline = false
);

public sealed record QuickImportResult(
    bool Success,
    ProductApiDto? Product,
    string? ErrorMessage,
    int StatusCode,
    long DurationMs
);

public sealed record AuthResult(
    bool Success,
    AuthApiResponse? Data,
    string? ErrorCode,
    string? ErrorMessage,
    int StatusCode,
    bool IsDeviceRevoked = false,
    bool IsTokenExpired = false
);

public interface IInventraApiClient
{
    string BaseUrl { get; set; }
    string? LastCatalogRequestUrl { get; }
    int LastCatalogStatusCode { get; }
    string? LastCatalogErrorMessage { get; }
    long LastCatalogDurationMs { get; }
    DateTime? LastCatalogSuccessfulSearchTime { get; }
    int LastCatalogResultCount { get; }

    void SetAuthToken(string? token);
    Task<bool> PingAsync(CancellationToken ct = default);
    Task<AuthApiResponse?> LoginAsync(string email, string password, string? deviceId = null, string? deviceCode = null, CancellationToken ct = default);
    Task<AuthResult> LoginWithResultAsync(string email, string password, string? deviceId = null, string? deviceCode = null, CancellationToken ct = default);
    Task<AuthApiResponse?> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task<AuthResult> RefreshTokenWithResultAsync(string refreshToken, CancellationToken ct = default);
    Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<DeviceApiResponse?> RegisterDeviceAsync(RegisterDeviceApiRequest request, CancellationToken ct = default);
    Task<PageResponse<GlobalMedicineApiDto>?> SearchGlobalMedicinesAsync(string? query, int page = 0, int size = 20, CancellationToken ct = default);
    Task<CatalogSearchResult> QueryGlobalMedicinesWithDiagnosticsAsync(string? query, int page = 0, int size = 20, CancellationToken ct = default);
    Task<ProductApiDto?> QuickImportGlobalMedicineAsync(string globalMedicineId, CancellationToken ct = default);
    Task<QuickImportResult> QuickImportWithDiagnosticsAsync(string globalMedicineId, CancellationToken ct = default);
    Task<PageResponse<ProductApiDto>?> ListProductsAsync(int page = 0, int size = 50, CancellationToken ct = default);
    Task<ProductApiDto?> CreateProductAsync(CreateProductApiRequest request, CancellationToken ct = default);
    Task<ApiResult<SyncUploadApiResponse>> UploadSyncBatchAsync(string deviceId, List<SyncOperationApiDto> ops, CancellationToken ct = default);
    Task<ApiResult<SyncDownloadApiResponse>> DownloadSyncChangesAsync(long cursor, int limit = 100, CancellationToken ct = default);

    // Purchasing & Suppliers
    Task<PageResponse<SupplierApiDto>?> ListSuppliersAsync(string? search = null, int page = 0, int size = 50, CancellationToken ct = default);
    Task<ApiResult<SupplierApiDto>> CreateSupplierAsync(CreateSupplierApiRequest request, CancellationToken ct = default);
    Task<PageResponse<PurchaseOrderApiDto>?> ListPurchaseOrdersAsync(string? storeId = null, string? supplierId = null, string? status = null, int page = 0, int size = 50, CancellationToken ct = default);
    Task<PurchaseOrderApiDto?> GetPurchaseOrderAsync(string id, CancellationToken ct = default);
    Task<PurchaseOrderApiDto?> CreatePurchaseOrderAsync(CreatePurchaseOrderApiRequest request, CancellationToken ct = default);
    Task<PurchaseOrderApiDto?> ConfirmPurchaseOrderAsync(string id, CancellationToken ct = default);
    Task<PageResponse<GoodsReceiptApiDto>?> ListGoodsReceiptsAsync(string? storeId = null, string? supplierId = null, string? status = null, string? purchaseOrderId = null, int page = 0, int size = 50, CancellationToken ct = default);
    Task<GoodsReceiptApiDto?> GetGoodsReceiptAsync(string id, CancellationToken ct = default);
    Task<GoodsReceiptApiDto?> CreateGoodsReceiptAsync(CreateGoodsReceiptApiRequest request, CancellationToken ct = default);
    Task<GoodsReceiptApiDto?> PostGoodsReceiptAsync(string id, CancellationToken ct = default);
    Task<ApiResult<SupplierApiDto>> UpdateSupplierAsync(string id, UpdateSupplierApiRequest request, CancellationToken ct = default);
    Task<ProductApiDto?> UpdateProductAsync(string id, UpdateProductApiRequest request, CancellationToken ct = default);
    Task<PageResponse<CustomerApiDto>?> ListCustomersAsync(string? search = null, int page = 0, int size = 50, CancellationToken ct = default);
    Task<CustomerApiDto?> CreateCustomerAsync(CreateCustomerApiRequest request, CancellationToken ct = default);
    Task<PageResponse<InventoryBatchApiDto>?> ListInventoryBatchesAsync(string? storeId = null, int? expiringWithinDays = null, bool expiredOnly = false, int page = 0, int size = 50, CancellationToken ct = default);
}

public sealed class InventraApiClient : IInventraApiClient
{
    private readonly HttpClient _httpClient;
    private readonly Logging.IAppLogger _logger;
    private string _baseUrl = "http://localhost:8081";

    public string? LastCatalogRequestUrl { get; private set; }
    public int LastCatalogStatusCode { get; private set; }
    public string? LastCatalogErrorMessage { get; private set; }
    public long LastCatalogDurationMs { get; private set; }
    public DateTime? LastCatalogSuccessfulSearchTime { get; private set; }
    public int LastCatalogResultCount { get; private set; }

    public InventraApiClient(HttpClient? httpClient = null, Logging.IAppLogger? logger = null)
    {
        _httpClient = httpClient ?? new HttpClient();
        _logger = logger ?? Logging.AppLogger.Instance;
        _httpClient.Timeout = TimeSpan.FromSeconds(5);
        _httpClient.DefaultRequestHeaders.Add("X-Client-Platform", "DESKTOP");
    }

    public string BaseUrl
    {
        get => _baseUrl;
        set => _baseUrl = value.TrimEnd('/');
    }

    public void SetAuthToken(string? token)
    {
        if (string.IsNullOrEmpty(token))
        {
            _httpClient.DefaultRequestHeaders.Authorization = null;
        }
        else
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(6));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
            var response = await _httpClient.GetAsync($"{_baseUrl}/actuator/health", linkedCts.Token);
            sw.Stop();
            _logger.Log(Logging.AppLogLevel.INFO, Logging.LogCategory.API, $"Ping to {_baseUrl}/actuator/health: HTTP {(int)response.StatusCode} in {sw.ElapsedMilliseconds}ms");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.Log(Logging.AppLogLevel.WARN, Logging.LogCategory.API, $"Ping to {_baseUrl}/actuator/health failed after {sw.ElapsedMilliseconds}ms: {ex.Message}");
            return false;
        }
    }

    public async Task<AuthApiResponse?> LoginAsync(string email, string password, string? deviceId = null, string? deviceCode = null, CancellationToken ct = default)
    {
        var result = await LoginWithResultAsync(email, password, deviceId, deviceCode, ct);
        return result.Success ? result.Data : null;
    }

    public async Task<AuthResult> LoginWithResultAsync(string email, string password, string? deviceId = null, string? deviceCode = null, CancellationToken ct = default)
    {
        try
        {
            var req = new LoginApiRequest(email, password, deviceId, deviceCode);
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/auth/login", req, ct);
            var statusCode = (int)response.StatusCode;

            if (response.IsSuccessStatusCode)
            {
                var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<AuthApiResponse>>(cancellationToken: ct);
                if (wrapped?.Data != null && !string.IsNullOrEmpty(wrapped.Data.AccessToken))
                {
                    SetAuthToken(wrapped.Data.AccessToken);
                }
                return new AuthResult(true, wrapped?.Data, null, null, statusCode);
            }

            var errBody = await response.Content.ReadAsStringAsync(ct);
            var (errCode, errMsg) = ParseProblemDetails(errBody, "Authentication failed");
            var isRevoked = string.Equals(errCode, "DEVICE_REVOKED", StringComparison.OrdinalIgnoreCase) ||
                            errBody.Contains("DEVICE_REVOKED", StringComparison.OrdinalIgnoreCase);

            _logger.Log(Logging.AppLogLevel.WARN, Logging.LogCategory.AUTH,
                $"Login failed with HTTP {statusCode}: [{errCode}] {errMsg}");

            return new AuthResult(false, null, errCode, errMsg, statusCode, IsDeviceRevoked: isRevoked);
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.AUTH, "Error during cloud login request", ex);
            return new AuthResult(false, null, "NETWORK_ERROR", ex.Message, 0);
        }
    }

    public async Task<AuthApiResponse?> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var res = await RefreshTokenWithResultAsync(refreshToken, ct);
        return res.Success ? res.Data : null;
    }

    public async Task<AuthResult> RefreshTokenWithResultAsync(string refreshToken, CancellationToken ct = default)
    {
        try
        {
            var req = new RefreshTokenApiRequest(refreshToken);
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/auth/refresh", req, ct);
            var statusCode = (int)response.StatusCode;

            if (response.IsSuccessStatusCode)
            {
                var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<AuthApiResponse>>(cancellationToken: ct);
                if (wrapped?.Data != null && !string.IsNullOrEmpty(wrapped.Data.AccessToken))
                {
                    SetAuthToken(wrapped.Data.AccessToken);
                    _logger.Log(Logging.AppLogLevel.INFO, Logging.LogCategory.AUTH, "Session access token refreshed successfully");
                }
                return new AuthResult(true, wrapped?.Data, null, null, statusCode);
            }

            var errBody = await response.Content.ReadAsStringAsync(ct);
            var (errCode, errMsg) = ParseProblemDetails(errBody, "Session refresh failed");
            var isRevoked = string.Equals(errCode, "DEVICE_REVOKED", StringComparison.OrdinalIgnoreCase) ||
                            errBody.Contains("DEVICE_REVOKED", StringComparison.OrdinalIgnoreCase);
            var isExpired = string.Equals(errCode, "TOKEN_EXPIRED", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(errCode, "TOKEN_REUSE_DETECTED", StringComparison.OrdinalIgnoreCase) ||
                            statusCode == 401;

            _logger.Log(Logging.AppLogLevel.WARN, Logging.LogCategory.AUTH,
                $"Session token refresh failed with HTTP {statusCode}: [{errCode}] {errMsg}");

            return new AuthResult(false, null, errCode, errMsg, statusCode, IsDeviceRevoked: isRevoked, IsTokenExpired: isExpired);
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.AUTH, "Error refreshing session access token", ex);
            return new AuthResult(false, null, "NETWORK_ERROR", ex.Message, 0);
        }
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        try
        {
            var req = new RefreshTokenApiRequest(refreshToken);
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/auth/logout", req, ct);
            SetAuthToken(null);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.AUTH, "Error notifying cloud of logout", ex);
            SetAuthToken(null);
            return false;
        }
    }

    private static (string ErrorCode, string ErrorMessage) ParseProblemDetails(string rawJson, string defaultMsg)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;
            string code = "AUTH_FAILED";
            string msg = defaultMsg;

            if (root.TryGetProperty("errorCode", out var codeEl) && codeEl.GetString() is { Length: > 0 } c)
                code = c;
            else if (root.TryGetProperty("title", out var titleEl) && titleEl.GetString() is { Length: > 0 } t)
                code = t;

            if (root.TryGetProperty("detail", out var detailEl) && detailEl.GetString() is { Length: > 0 } d)
                msg = d;
            else if (root.TryGetProperty("message", out var msgEl) && msgEl.GetString() is { Length: > 0 } m)
                msg = m;

            return (code, msg);
        }
        catch
        {
            return ("API_ERROR", defaultMsg);
        }
    }

    public async Task<DeviceApiResponse?> RegisterDeviceAsync(RegisterDeviceApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/devices/register", request, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<DeviceApiResponse>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch
        {
            return null;
        }
    }

    public async Task<PageResponse<GlobalMedicineApiDto>?> SearchGlobalMedicinesAsync(string? query, int page = 0, int size = 20, CancellationToken ct = default)
    {
        var result = await QueryGlobalMedicinesWithDiagnosticsAsync(query, page, size, ct);
        return result.Data;
    }

    public async Task<CatalogSearchResult> QueryGlobalMedicinesWithDiagnosticsAsync(string? query, int page = 0, int size = 20, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var url = string.IsNullOrWhiteSpace(query)
            ? $"{_baseUrl}/api/v1/catalog/global-medicines?page={page}&size={size}"
            : $"{_baseUrl}/api/v1/catalog/global-medicines?query={Uri.EscapeDataString(query.Trim())}&page={page}&size={size}";

        LastCatalogRequestUrl = url;

        try
        {
            _logger.Log(Logging.AppLogLevel.INFO, Logging.LogCategory.CATALOG, $"Initiating global medicine search: query='{query}', page={page}, size={size}");
            var response = await _httpClient.GetAsync(url, ct);
            sw.Stop();
            LastCatalogDurationMs = sw.ElapsedMilliseconds;
            LastCatalogStatusCode = (int)response.StatusCode;

            _logger.LogApi("GET", url, (int)response.StatusCode, sw.ElapsedMilliseconds);

            if (!response.IsSuccessStatusCode)
            {
                string errorReason = response.StatusCode switch
                {
                    System.Net.HttpStatusCode.Unauthorized => "Authentication required: Session expired or invalid credentials.",
                    System.Net.HttpStatusCode.Forbidden => "Access denied: User does not have catalog browsing permissions.",
                    System.Net.HttpStatusCode.NotFound => "Global medicine catalog endpoint not found (404).",
                    System.Net.HttpStatusCode.InternalServerError => "Cloud server error (500). Please check backend service logs.",
                    _ => $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                };

                LastCatalogErrorMessage = errorReason;
                _logger.LogCatalog("SEARCH", query ?? "", 0, sw.ElapsedMilliseconds, "FAILED", errorReason);
                return new CatalogSearchResult(false, null, errorReason, (int)response.StatusCode, sw.ElapsedMilliseconds);
            }

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<GlobalMedicineApiDto>>>(cancellationToken: ct);
            var pageData = wrapped?.Data;
            int count = pageData?.Content?.Count ?? 0;

            LastCatalogResultCount = count;
            LastCatalogErrorMessage = null;
            LastCatalogSuccessfulSearchTime = DateTime.UtcNow;

            _logger.LogCatalog("SEARCH", query ?? "", count, sw.ElapsedMilliseconds, "SUCCESS");
            return new CatalogSearchResult(true, pageData, null, (int)response.StatusCode, sw.ElapsedMilliseconds);
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            LastCatalogDurationMs = sw.ElapsedMilliseconds;
            LastCatalogStatusCode = 0;
            var err = $"Cloud service unreachable: {ex.Message}";
            LastCatalogErrorMessage = err;
            _logger.LogCatalog("SEARCH", query ?? "", 0, sw.ElapsedMilliseconds, "OFFLINE", err);
            return new CatalogSearchResult(false, null, err, 0, sw.ElapsedMilliseconds, IsOffline: true);
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            LastCatalogDurationMs = sw.ElapsedMilliseconds;
            LastCatalogStatusCode = 0;
            var err = "Catalog request timed out after 5 seconds.";
            LastCatalogErrorMessage = err;
            _logger.LogCatalog("SEARCH", query ?? "", 0, sw.ElapsedMilliseconds, "TIMEOUT", err);
            return new CatalogSearchResult(false, null, err, 0, sw.ElapsedMilliseconds, IsOffline: true);
        }
        catch (Exception ex)
        {
            sw.Stop();
            LastCatalogDurationMs = sw.ElapsedMilliseconds;
            LastCatalogStatusCode = 0;
            var err = $"Unexpected error querying catalog: {ex.Message}";
            LastCatalogErrorMessage = err;
            _logger.Error(Logging.LogCategory.CATALOG, "Unexpected error in SearchGlobalMedicinesAsync", ex);
            return new CatalogSearchResult(false, null, err, 0, sw.ElapsedMilliseconds, IsOffline: true);
        }
    }

    public async Task<ProductApiDto?> QuickImportGlobalMedicineAsync(string globalMedicineId, CancellationToken ct = default)
    {
        var result = await QuickImportWithDiagnosticsAsync(globalMedicineId, ct);
        return result.Product;
    }

    public async Task<QuickImportResult> QuickImportWithDiagnosticsAsync(string globalMedicineId, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var url = $"{_baseUrl}/api/v1/catalog/global-medicines/{globalMedicineId}/quick-import";

        try
        {
            _logger.Log(Logging.AppLogLevel.INFO, Logging.LogCategory.CATALOG, $"Initiating quick-import for global medicine: {globalMedicineId}");
            var response = await _httpClient.PostAsync(url, null, ct);
            sw.Stop();

            _logger.LogApi("POST", url, (int)response.StatusCode, sw.ElapsedMilliseconds);

            if (!response.IsSuccessStatusCode)
            {
                string errorReason = response.StatusCode switch
                {
                    System.Net.HttpStatusCode.Unauthorized => "Authentication required to import catalog medicines.",
                    System.Net.HttpStatusCode.Forbidden => "Store role lacks import permissions.",
                    System.Net.HttpStatusCode.Conflict => "This medicine has already been imported into your catalog.",
                    System.Net.HttpStatusCode.NotFound => "Global medicine not found on server.",
                    _ => $"Import failed with HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                };

                _logger.LogCatalog("IMPORT", globalMedicineId, 0, sw.ElapsedMilliseconds, "FAILED", errorReason);
                return new QuickImportResult(false, null, errorReason, (int)response.StatusCode, sw.ElapsedMilliseconds);
            }

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<ProductApiDto>>(cancellationToken: ct);
            _logger.LogCatalog("IMPORT", globalMedicineId, 1, sw.ElapsedMilliseconds, "SUCCESS");
            return new QuickImportResult(true, wrapped?.Data, null, (int)response.StatusCode, sw.ElapsedMilliseconds);
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            var err = $"Cloud service unreachable during import: {ex.Message}";
            _logger.LogCatalog("IMPORT", globalMedicineId, 0, sw.ElapsedMilliseconds, "OFFLINE", err);
            return new QuickImportResult(false, null, err, 0, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            var err = $"Import failed: {ex.Message}";
            _logger.Error(Logging.LogCategory.CATALOG, "Unexpected error in QuickImportWithDiagnosticsAsync", ex);
            return new QuickImportResult(false, null, err, 0, sw.ElapsedMilliseconds);
        }
    }

    public async Task<PageResponse<ProductApiDto>?> ListProductsAsync(int page = 0, int size = 50, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/v1/products?page={page}&size={size}", ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.Log(Logging.AppLogLevel.WARN, Logging.LogCategory.API, $"ListProductsAsync failed with HTTP {(int)response.StatusCode}: {response.ReasonPhrase}");
                return null;
            }

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<ProductApiDto>>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "ListProductsAsync threw exception", ex);
            return null;
        }
    }

    public async Task<ProductApiDto?> CreateProductAsync(CreateProductApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/products", request, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<ProductApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch
        {
            return null;
        }
    }

    public async Task<ApiResult<SyncUploadApiResponse>> UploadSyncBatchAsync(string deviceId, List<SyncOperationApiDto> ops, CancellationToken ct = default)
    {
        try
        {
            var payload = new SyncUploadApiRequest(
                deviceId,
                Guid.NewGuid().ToString(),
                1,
                DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", System.Globalization.CultureInfo.InvariantCulture),
                ops);
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/sync/upload", payload, ct);
            return await ReadWriteResultAsync<SyncUploadApiResponse>(response, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.Error(Logging.LogCategory.API, "UploadSyncBatchAsync failed", ex);
            return ApiResult<SyncUploadApiResponse>.Transient("The server could not be reached.");
        }
    }

    public async Task<ApiResult<SyncDownloadApiResponse>> DownloadSyncChangesAsync(long cursor, int limit = 100, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/v1/sync/download?cursor={cursor}&limit={limit}", ct);
            return await ReadWriteResultAsync<SyncDownloadApiResponse>(response, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.Error(Logging.LogCategory.API, "DownloadSyncChangesAsync failed", ex);
            return ApiResult<SyncDownloadApiResponse>.Transient("The server could not be reached.");
        }
    }

    #region Purchasing & Suppliers

    public async Task<PageResponse<SupplierApiDto>?> ListSuppliersAsync(string? search = null, int page = 0, int size = 50, CancellationToken ct = default)
    {
        try
        {
            var url = $"{_baseUrl}/api/v1/suppliers?page={page}&size={size}";
            if (!string.IsNullOrWhiteSpace(search))
            {
                url += $"&search={Uri.EscapeDataString(search.Trim())}";
            }

            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<SupplierApiDto>>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "ListSuppliersAsync failed", ex);
            return null;
        }
    }

    public async Task<ApiResult<SupplierApiDto>> CreateSupplierAsync(CreateSupplierApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/suppliers", request, ct);
            return await ReadWriteResultAsync<SupplierApiDto>(response, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.Error(Logging.LogCategory.API, "CreateSupplierAsync failed", ex);
            return ApiResult<SupplierApiDto>.Transient("The server could not be reached.");
        }
    }

    // Maps an HTTP response to an ApiResult: 2xx with a body is success, 408/429/5xx is transient,
    // and any other status is a rejection carrying the server's RFC 9457 "detail" text.
    private static async Task<ApiResult<T>> ReadWriteResultAsync<T>(HttpResponseMessage response, CancellationToken ct) where T : class
    {
        var status = (int)response.StatusCode;
        if (response.IsSuccessStatusCode)
        {
            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<T>>(cancellationToken: ct);
            return wrapped?.Data is { } data
                ? ApiResult<T>.Ok(data, status)
                : ApiResult<T>.Transient("The server returned an empty response.", status);
        }

        string? detail = null;
        string? errorCode = null;
        try
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            using var doc = System.Text.Json.JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("detail", out var d) && d.ValueKind == System.Text.Json.JsonValueKind.String)
                detail = d.GetString();
            else if (doc.RootElement.TryGetProperty("message", out var m) && m.ValueKind == System.Text.Json.JsonValueKind.String)
                detail = m.GetString();
            if (doc.RootElement.TryGetProperty("errorCode", out var c) && c.ValueKind == System.Text.Json.JsonValueKind.String)
                errorCode = c.GetString();
        }
        catch (System.Text.Json.JsonException)
        {
            // Non-JSON error body: fall back to the status text.
        }

        var message = string.IsNullOrWhiteSpace(detail) ? $"Server returned {status} {response.ReasonPhrase}." : detail!;
        return status is 408 or 429 or >= 500
            ? ApiResult<T>.Transient(message, status)
            : ApiResult<T>.Rejected(message, status, errorCode);
    }

    public async Task<PageResponse<PurchaseOrderApiDto>?> ListPurchaseOrdersAsync(string? storeId = null, string? supplierId = null, string? status = null, int page = 0, int size = 50, CancellationToken ct = default)
    {
        try
        {
            var url = $"{_baseUrl}/api/v1/purchase-orders?page={page}&size={size}";
            if (!string.IsNullOrEmpty(storeId)) url += $"&storeId={storeId}";
            if (!string.IsNullOrEmpty(supplierId)) url += $"&supplierId={supplierId}";
            if (!string.IsNullOrEmpty(status)) url += $"&status={status}";

            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<PurchaseOrderApiDto>>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "ListPurchaseOrdersAsync failed", ex);
            return null;
        }
    }

    public async Task<PurchaseOrderApiDto?> GetPurchaseOrderAsync(string id, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/v1/purchase-orders/{id}", ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PurchaseOrderApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, $"GetPurchaseOrderAsync failed for {id}", ex);
            return null;
        }
    }

    public async Task<PurchaseOrderApiDto?> CreatePurchaseOrderAsync(CreatePurchaseOrderApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/purchase-orders", request, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PurchaseOrderApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "CreatePurchaseOrderAsync failed", ex);
            return null;
        }
    }

    public async Task<PurchaseOrderApiDto?> ConfirmPurchaseOrderAsync(string id, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/purchase-orders/{id}/confirm", null, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PurchaseOrderApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, $"ConfirmPurchaseOrderAsync failed for {id}", ex);
            return null;
        }
    }

    public async Task<PageResponse<GoodsReceiptApiDto>?> ListGoodsReceiptsAsync(string? storeId = null, string? supplierId = null, string? status = null, string? purchaseOrderId = null, int page = 0, int size = 50, CancellationToken ct = default)
    {
        try
        {
            var url = $"{_baseUrl}/api/v1/goods-receipts?page={page}&size={size}";
            if (!string.IsNullOrEmpty(storeId)) url += $"&storeId={storeId}";
            if (!string.IsNullOrEmpty(supplierId)) url += $"&supplierId={supplierId}";
            if (!string.IsNullOrEmpty(status)) url += $"&status={status}";
            if (!string.IsNullOrEmpty(purchaseOrderId)) url += $"&purchaseOrderId={purchaseOrderId}";

            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<GoodsReceiptApiDto>>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "ListGoodsReceiptsAsync failed", ex);
            return null;
        }
    }

    public async Task<GoodsReceiptApiDto?> GetGoodsReceiptAsync(string id, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/v1/goods-receipts/{id}", ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<GoodsReceiptApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, $"GetGoodsReceiptAsync failed for {id}", ex);
            return null;
        }
    }

    public async Task<GoodsReceiptApiDto?> CreateGoodsReceiptAsync(CreateGoodsReceiptApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/goods-receipts", request, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<GoodsReceiptApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "CreateGoodsReceiptAsync failed", ex);
            return null;
        }
    }

    public async Task<GoodsReceiptApiDto?> PostGoodsReceiptAsync(string id, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/goods-receipts/{id}/post", null, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<GoodsReceiptApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, $"PostGoodsReceiptAsync failed for {id}", ex);
            return null;
        }
    }

    public async Task<ApiResult<SupplierApiDto>> UpdateSupplierAsync(string id, UpdateSupplierApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var content = JsonContent.Create(request);
            var response = await _httpClient.PatchAsync($"{_baseUrl}/api/v1/suppliers/{Uri.EscapeDataString(id)}", content, ct);
            return await ReadWriteResultAsync<SupplierApiDto>(response, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            _logger.Error(Logging.LogCategory.API, $"UpdateSupplierAsync failed for {id}", ex);
            return ApiResult<SupplierApiDto>.Transient("The server could not be reached.");
        }
    }

    public async Task<ProductApiDto?> UpdateProductAsync(string id, UpdateProductApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var content = JsonContent.Create(request);
            var response = await _httpClient.PatchAsync($"{_baseUrl}/api/v1/products/{id}", content, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<ProductApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, $"UpdateProductAsync failed for {id}", ex);
            return null;
        }
    }

    public async Task<PageResponse<CustomerApiDto>?> ListCustomersAsync(string? search = null, int page = 0, int size = 50, CancellationToken ct = default)
    {
        try
        {
            var url = $"{_baseUrl}/api/v1/customers?page={page}&size={size}";
            if (!string.IsNullOrWhiteSpace(search)) url += $"&search={Uri.EscapeDataString(search)}";

            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<CustomerApiDto>>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "ListCustomersAsync failed", ex);
            return null;
        }
    }

    public async Task<CustomerApiDto?> CreateCustomerAsync(CreateCustomerApiRequest request, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/customers", request, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<CustomerApiDto>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "CreateCustomerAsync failed", ex);
            return null;
        }
    }

    public async Task<PageResponse<InventoryBatchApiDto>?> ListInventoryBatchesAsync(string? storeId = null, int? expiringWithinDays = null, bool expiredOnly = false, int page = 0, int size = 50, CancellationToken ct = default)
    {
        try
        {
            var url = $"{_baseUrl}/api/v1/inventory/batches?page={page}&size={size}";
            if (!string.IsNullOrWhiteSpace(storeId)) url += $"&storeId={Uri.EscapeDataString(storeId)}";
            if (expiredOnly) url += "&expiredOnly=true";
            else if (expiringWithinDays.HasValue && expiringWithinDays.Value > 0) url += $"&expiringWithinDays={expiringWithinDays.Value}";

            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            var wrapped = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<PageResponse<InventoryBatchApiDto>>>(cancellationToken: ct);
            return wrapped?.Data;
        }
        catch (Exception ex)
        {
            _logger.Error(Logging.LogCategory.API, "ListInventoryBatchesAsync failed", ex);
            return null;
        }
    }

    #endregion
}
