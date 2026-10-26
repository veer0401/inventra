using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Core.Domain.Catalog;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Imports;
using Inventra.Desktop.Infrastructure.Sync;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class InventoryWorkspaceViewModel : ViewModelBase
{
    private readonly IProductRepository _productRepository;
    private readonly IOfflineQueueRepository _queueRepository;
    private readonly IIdentitySessionService _identityService;
    private readonly IInventraApiClient _apiClient;
    private readonly IImportQueueService _importQueue;
    private readonly SyncCoordinator _syncCoordinator;
    private readonly IGlobalMedicineCacheRepository _globalCacheRepository;
    private readonly ICloudConnectivityService _connectivityService;
    private readonly IAppLogger _logger;
    private readonly IAuthorizationService _authService;

    [ObservableProperty]
    private int _selectedTabIndex = 0;

    [ObservableProperty]
    private string _searchQuery = string.Empty;

    [ObservableProperty]
    private bool _lowStockOnly = false;

    [ObservableProperty]
    private ProductItem? _selectedProduct;

    [ObservableProperty]
    private ObservableCollection<ProductItem> _products = new();

    [ObservableProperty]
    private ObservableCollection<BatchItem> _selectedProductBatches = new();

    // --- BATCHES REGISTRY STATE ---
    [ObservableProperty]
    private ObservableCollection<BatchItem> _allBatches = new();

    [ObservableProperty]
    private string _batchSearchQuery = string.Empty;

    [ObservableProperty]
    private bool _expiringSoonOnly = false;

    [ObservableProperty]
    private bool _expiredOnly = false;

    [ObservableProperty]
    private int _totalBatchCount;

    [ObservableProperty]
    private int _expiringSoonBatchCount;

    [ObservableProperty]
    private int _expiredBatchCount;

    [ObservableProperty]
    private int _totalSkuCount;

    [ObservableProperty]
    private int _lowStockCount;

    [ObservableProperty]
    private int _outOfStockCount;

    [ObservableProperty]
    private double _totalUnitsStock;

    [ObservableProperty]
    private string _notificationMessage = string.Empty;

    // --- ADD MEDICINE CHOOSER STATE ---
    [ObservableProperty]
    private bool _showAddMedicineChoice = false;

    // --- CREATE MEDICINE LOCALLY DIALOG STATE ---
    [ObservableProperty]
    private bool _showCreateDialog = false;

    [ObservableProperty]
    private string _newName = string.Empty;

    [ObservableProperty]
    private string _newGenericName = string.Empty;

    [ObservableProperty]
    private string _newBrandName = string.Empty;

    [ObservableProperty]
    private string _newManufacturer = string.Empty;

    [ObservableProperty]
    private string _newDosageForm = "TABLET";

    [ObservableProperty]
    private string _newStrength = string.Empty;

    [ObservableProperty]
    private string _newSellingUnit = "STRIP";

    [ObservableProperty]
    private decimal _newTaxRate = 12.0m;

    [ObservableProperty]
    private decimal _newSellingPrice = 0m;

    [ObservableProperty]
    private decimal _newMrp = 0m;

    [ObservableProperty]
    private bool _newPrescriptionRequired = false;

    [ObservableProperty]
    private string _newBarcode = string.Empty;

    [ObservableProperty]
    private string _newInitialBatchNumber = string.Empty;

    [ObservableProperty]
    private string _newExpiryDate = string.Empty;

    [ObservableProperty]
    private double _newInitialStock = 0.0;

    // --- GLOBAL MEDICINE CATALOG WORKFLOW STATE ---
    [ObservableProperty]
    private bool _showGlobalCatalogDialog = false;

    [ObservableProperty]
    private string _globalSearchQuery = string.Empty;

    [ObservableProperty]
    private ObservableCollection<GlobalMedicineItem> _globalSearchResults = new();

    [ObservableProperty]
    private GlobalMedicineItem? _selectedGlobalMedicine;

    [ObservableProperty]
    private bool _isGlobalLoading = false;

    [ObservableProperty]
    private string _globalStatusMessage = string.Empty;

    [ObservableProperty]
    private string _globalAvailabilityState = "Connected";

    [ObservableProperty]
    private string _globalAvailabilityBg = "#F0FDF4";

    [ObservableProperty]
    private string _globalAvailabilityFg = "#166534";

    [ObservableProperty]
    private string _globalAvailabilityBorder = "#BBF7D0";

    [ObservableProperty]
    private bool _isCloudOnline = true;

    [ObservableProperty]
    private bool _hasSelectedMedicinePreview = false;

    // --- IMPORT SUCCESS CONFIRMATION STATE ---
    [ObservableProperty]
    private bool _showImportSuccessModal = false;

    [ObservableProperty]
    private string _importedProductName = string.Empty;

    [ObservableProperty]
    private string _importedProductId = string.Empty;

    // --- INWARD STOCK ADJUSTMENT DIALOG STATE ---
    [ObservableProperty]
    private bool _showAddStockDialog = false;

    [ObservableProperty]
    private string _stockAddBatchNumber = string.Empty;

    [ObservableProperty]
    private string _stockAddExpiry = string.Empty;

    [ObservableProperty]
    private double _stockAddQuantity = 10;

    [ObservableProperty]
    private decimal _stockAddPurchasePrice = 0m;

    // --- EDIT MEDICINE DIALOG STATE ---
    [ObservableProperty]
    private bool _showEditProductDialog = false;

    [ObservableProperty]
    private string _editProductId = string.Empty;

    [ObservableProperty]
    private string _editProductCode = string.Empty;

    [ObservableProperty]
    private string _editProductName = string.Empty;

    [ObservableProperty]
    private string _editProductGenericName = string.Empty;

    [ObservableProperty]
    private string _editProductDosageForm = "TABLET";

    [ObservableProperty]
    private string _editProductStrength = string.Empty;

    [ObservableProperty]
    private string _editProductSellingUnit = "STRIP";

    [ObservableProperty]
    private decimal _editProductTaxRate = 12.0m;

    [ObservableProperty]
    private decimal _editProductSellingPrice = 0m;

    [ObservableProperty]
    private decimal _editProductMrp = 0m;

    [ObservableProperty]
    private bool _editProductPrescriptionRequired = false;

    public InventoryWorkspaceViewModel(
        IProductRepository productRepository,
        IOfflineQueueRepository queueRepository,
        IIdentitySessionService identityService,
        IInventraApiClient apiClient,
        IGlobalMedicineCacheRepository globalCacheRepository,
        ICloudConnectivityService connectivityService,
        IAppLogger logger,
        IAuthorizationService authService,
        IImportQueueService importQueue,
        SyncCoordinator syncCoordinator)
    {
        _importQueue = importQueue;
        _syncCoordinator = syncCoordinator;
        _productRepository = productRepository;
        _queueRepository = queueRepository;
        _identityService = identityService;
        _apiClient = apiClient;
        _globalCacheRepository = globalCacheRepository;
        _connectivityService = connectivityService;
        _logger = logger;
        _authService = authService;

        _connectivityService.StateChanged += (_, _) => UpdateAvailabilityState();
        UpdateAvailabilityState();
    }

    public async Task InitializeAsync()
    {
        await LoadProductsAsync();
    }

    partial void OnSelectedTabIndexChanged(int value)
    {
        if (value == 2)
        {
            _ = LoadAllBatchesAsync();
        }
    }

    partial void OnSearchQueryChanged(string value) => _ = LoadProductsAsync();
    partial void OnLowStockOnlyChanged(bool value) => _ = LoadProductsAsync();
    partial void OnSelectedProductChanged(ProductItem? value) => _ = LoadBatchesForSelectedProductAsync(value);
    partial void OnSelectedGlobalMedicineChanged(GlobalMedicineItem? value)
    {
        HasSelectedMedicinePreview = value != null;
    }

    partial void OnBatchSearchQueryChanged(string value) => _ = LoadAllBatchesAsync();
    partial void OnExpiringSoonOnlyChanged(bool value) => _ = LoadAllBatchesAsync();
    partial void OnExpiredOnlyChanged(bool value) => _ = LoadAllBatchesAsync();

    [RelayCommand]
    public void SwitchToMedicines() => SelectedTabIndex = 0;

    [RelayCommand]
    public void SwitchToStock() => SelectedTabIndex = 1;

    [RelayCommand]
    public void SwitchToBatches()
    {
        SelectedTabIndex = 2;
        _ = LoadAllBatchesAsync();
    }

    [RelayCommand]
    public async Task LoadAllBatchesAsync()
    {
        var session = await _identityService.GetSessionAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId;

        // 1. Synchronize batches from cloud when online
        if (_connectivityService.IsOnline && session != null && session.IsAuthenticated)
        {
            try
            {
                var page = await _apiClient.ListInventoryBatchesAsync(storeId: storeId, page: 0, size: 200);
                if (page?.Content != null)
                {
                    foreach (var b in page.Content)
                    {
                        var batch = new BatchItem
                        {
                            Id = b.Id,
                            BusinessId = b.BusinessId,
                            StoreId = b.StoreId,
                            ProductId = b.ProductId,
                            BatchNumber = b.BatchNumber,
                            ExpiryDate = b.ExpiryDate,
                            AvailableQuantity = (double)b.AvailableQuantity,
                            SellingPrice = b.SellingPrice,
                            Mrp = b.Mrp,
                            PurchasePrice = b.PurchasePrice ?? 0m,
                            ManufacturingDate = b.ManufacturingDate,
                            ProductName = b.ProductName ?? "Product",
                            ProductCode = string.Empty
                        };
                        await _productRepository.UpsertBatchAsync(batch);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error(LogCategory.INVENTORY, "Failed to synchronize batches from cloud", ex);
            }
        }

        // 2. Query SQLite
        var items = await _productRepository.GetAllBatchesAsync(bizId, storeId, BatchSearchQuery, ExpiringSoonOnly, ExpiredOnly);
        AllBatches.Clear();
        foreach (var b in items)
        {
            AllBatches.Add(b);
        }

        // 3. Totals
        var all = await _productRepository.GetAllBatchesAsync(bizId, storeId);
        TotalBatchCount = all.Count;
        ExpiringSoonBatchCount = all.Count(b => b.IsNearExpiry);
        ExpiredBatchCount = all.Count(b => b.IsExpired);
    }

    // --- EDIT MEDICINE WORKFLOW ---

    [RelayCommand]
    public void OpenEditProduct(ProductItem? item)
    {
        var target = item ?? SelectedProduct;
        if (target == null) return;

        try
        {
            _authService.RequirePermission(AppPermissions.ProductEdit);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        EditProductId = target.Id;
        EditProductCode = target.Code;
        EditProductName = target.Name;
        EditProductGenericName = target.GenericName ?? string.Empty;
        EditProductDosageForm = target.DosageForm;
        EditProductStrength = target.Strength ?? string.Empty;
        EditProductSellingUnit = target.SellingUnit;
        EditProductTaxRate = target.TaxRate;
        EditProductSellingPrice = target.SellingPrice;
        EditProductMrp = target.Mrp;
        EditProductPrescriptionRequired = target.PrescriptionRequired;

        ShowEditProductDialog = true;
    }

    [RelayCommand]
    public void CloseEditProductDialog()
    {
        ShowEditProductDialog = false;
    }

    [RelayCommand]
    public async Task SaveEditProductAsync()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.ProductEdit);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        if (string.IsNullOrWhiteSpace(EditProductName))
        {
            NotificationMessage = "Product name cannot be empty.";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        var existing = await _productRepository.GetProductByIdAsync(EditProductId);
        if (existing == null)
        {
            NotificationMessage = "Product not found.";
            return;
        }

        var updated = new ProductItem
        {
            Id = existing.Id,
            BusinessId = existing.BusinessId,
            StoreId = existing.StoreId,
            Code = existing.Code,
            Name = EditProductName.Trim(),
            GenericName = string.IsNullOrWhiteSpace(EditProductGenericName) ? null : EditProductGenericName.Trim(),
            DosageForm = EditProductDosageForm,
            Strength = string.IsNullOrWhiteSpace(EditProductStrength) ? null : EditProductStrength.Trim(),
            BaseUnit = existing.BaseUnit,
            SellingUnit = EditProductSellingUnit,
            UnitsPerSellingUnit = existing.UnitsPerSellingUnit,
            TaxRate = EditProductTaxRate,
            IsTaxInclusive = existing.IsTaxInclusive,
            PrescriptionRequired = EditProductPrescriptionRequired,
            SellingPrice = EditProductSellingPrice,
            Mrp = EditProductMrp > 0 ? EditProductMrp : EditProductSellingPrice,
            CurrentStock = existing.CurrentStock,
            UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // 1. Update SQLite
        await _productRepository.UpdateProductAsync(updated);

        // 2. Cloud update or offline queue
        if (_connectivityService.IsOnline && session != null && session.IsAuthenticated)
        {
            try
            {
                var req = new UpdateProductApiRequest(
                    Name: updated.Name,
                    GenericName: updated.GenericName,
                    BrandName: null,
                    Manufacturer: null,
                    DosageForm: updated.DosageForm,
                    Strength: updated.Strength,
                    BaseUnit: updated.BaseUnit,
                    SellingUnit: updated.SellingUnit,
                    UnitsPerSellingUnit: (int)updated.UnitsPerSellingUnit,
                    HsnCode: null,
                    TaxRate: updated.TaxRate,
                    IsTaxInclusive: updated.IsTaxInclusive,
                    PrescriptionRequired: updated.PrescriptionRequired
                );
                await _apiClient.UpdateProductAsync(updated.Id, req);
            }
            catch (Exception ex)
            {
                _logger.Warn(LogCategory.INVENTORY, $"Cloud update failed for {updated.Id}, enqueueing offline sync: {ex.Message}");
                await _queueRepository.EnqueueOperationAsync(
                    bizId,
                    storeId,
                    device.DeviceId,
                    userId,
                    "PRODUCT_UPDATE",
                    JsonSerializer.Serialize(updated),
                    Guid.NewGuid().ToString()
                );
            }
        }
        else
        {
            await _queueRepository.EnqueueOperationAsync(
                bizId,
                storeId,
                device.DeviceId,
                userId,
                "PRODUCT_UPDATE",
                JsonSerializer.Serialize(updated),
                Guid.NewGuid().ToString()
            );
        }

        ShowEditProductDialog = false;
        NotificationMessage = $"Product '{updated.Name}' updated successfully.";
        await LoadProductsAsync();
    }

    [RelayCommand]
    public async Task LoadProductsAsync()
    {
        var session = await _identityService.GetSessionAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId;

        // 1. If online and authenticated, synchronize products from cloud catalog into local SQLite
        if (_connectivityService.IsOnline && session != null && session.IsAuthenticated)
        {
            await SyncProductsFromCloudAsync(bizId, storeId);
        }

        // 2. Load from local SQLite cache
        IReadOnlyList<ProductItem> items;
        if (string.IsNullOrWhiteSpace(SearchQuery))
        {
            items = await _productRepository.GetProductsByBusinessAsync(bizId, storeId);
        }
        else
        {
            items = await _productRepository.SearchProductsByBusinessAsync(bizId, storeId, SearchQuery.Trim());
        }

        if (LowStockOnly)
        {
            items = items.Where(p => p.CurrentStock < 15).ToList();
        }

        Products.Clear();
        foreach (var item in items)
        {
            Products.Add(item);
        }

        // Calculate real KPIs
        var allItems = await _productRepository.GetProductsByBusinessAsync(bizId, storeId);
        TotalSkuCount = allItems.Count;
        LowStockCount = allItems.Count(p => p.CurrentStock is > 0 and < 15);
        OutOfStockCount = allItems.Count(p => p.CurrentStock <= 0);
        TotalUnitsStock = allItems.Sum(p => p.CurrentStock);

        if ((SelectedProduct == null || !Products.Any(p => p.Id == SelectedProduct.Id)) && Products.Count > 0)
        {
            SelectedProduct = Products[0];
        }
        else if (Products.Count == 0)
        {
            SelectedProduct = null;
            SelectedProductBatches.Clear();
        }
    }

    private async Task SyncProductsFromCloudAsync(string businessId, string? storeId)
    {
        try
        {
            var page = await _apiClient.ListProductsAsync(page: 0, size: 200);
            if (page == null || page.Content == null) return;

            foreach (var dto in page.Content)
            {
                var product = new ProductItem
                {
                    Id = dto.Id,
                    BusinessId = businessId,
                    StoreId = storeId,
                    Code = string.IsNullOrEmpty(dto.HsnCode) ? $"PRD-{dto.Id[..Math.Min(8, dto.Id.Length)].ToUpperInvariant()}" : dto.HsnCode,
                    Name = dto.Name,
                    GenericName = dto.GenericName ?? string.Empty,
                    DosageForm = dto.DosageForm ?? "TABLET",
                    Strength = dto.Strength ?? string.Empty,
                    BaseUnit = dto.BaseUnit ?? "Unit",
                    SellingUnit = dto.SellingUnit ?? "Unit",
                    UnitsPerSellingUnit = dto.UnitsPerSellingUnit > 0 ? dto.UnitsPerSellingUnit : 1,
                    TaxRate = dto.TaxRate,
                    IsTaxInclusive = true,
                    PrescriptionRequired = dto.PrescriptionRequired,
                    SellingPrice = 0m,
                    Mrp = 0m,
                    CurrentStock = dto.CurrentStock ?? 0.0,
                    UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                await _productRepository.UpsertProductAsync(product);
            }

            _logger.Info(LogCategory.INVENTORY, $"Cloud catalog synchronization complete: {page.Content.Count} products cached locally.");
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.INVENTORY, "Failed to synchronize products from cloud", ex);
        }
    }

    private async Task LoadBatchesForSelectedProductAsync(ProductItem? product)
    {
        SelectedProductBatches.Clear();
        if (product == null) return;

        var batches = await _productRepository.GetBatchesForProductAsync(product.Id);
        foreach (var b in batches.OrderBy(b => b.ExpiryDate))
        {
            SelectedProductBatches.Add(b);
        }
    }

    // --- ADD MEDICINE CHOOSER WORKFLOW ---

    [RelayCommand]
    public void OpenAddMedicineChoice()
    {
        ShowAddMedicineChoice = true;
    }

    [RelayCommand]
    public void CloseAddMedicineChoice()
    {
        ShowAddMedicineChoice = false;
    }

    [RelayCommand]
    public void SelectSearchGlobalFromChoice()
    {
        ShowAddMedicineChoice = false;
        OpenGlobalCatalogDialog();
    }

    [RelayCommand]
    public void SelectCreateLocallyFromChoice()
    {
        ShowAddMedicineChoice = false;
        OpenCreateMedicineDialog();
    }

    // --- CREATE MEDICINE LOCALLY WORKFLOW ---

    [RelayCommand]
    public void OpenCreateMedicineDialog()
    {
        NewName = string.Empty;
        NewGenericName = string.Empty;
        NewBrandName = string.Empty;
        NewManufacturer = string.Empty;
        NewDosageForm = "TABLET";
        NewStrength = string.Empty;
        NewSellingUnit = "STRIP";
        NewTaxRate = 12.0m;
        NewSellingPrice = 0m;
        NewMrp = 0m;
        NewBarcode = string.Empty;
        NewPrescriptionRequired = false;
        NewInitialBatchNumber = $"B-{DateTime.UtcNow:yyyyMM}-{new Random().Next(100, 999)}";
        NewExpiryDate = DateTime.UtcNow.AddYears(2).ToString("yyyy-MM");
        NewInitialStock = 0;

        ShowCreateDialog = true;
    }

    [RelayCommand]
    public void CloseCreateMedicineDialog()
    {
        ShowCreateDialog = false;
    }

    [RelayCommand]
    public async Task SaveNewProductAsync()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.ProductCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        if (string.IsNullOrWhiteSpace(NewName))
        {
            NotificationMessage = "Product Name is required.";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        var productId = Guid.NewGuid().ToString();
        var code = $"MED-{new Random().Next(10000, 99999)}";
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var product = new ProductItem
        {
            Id = productId,
            BusinessId = bizId,
            StoreId = storeId,
            Code = code,
            Name = NewName.Trim(),
            GenericName = string.IsNullOrWhiteSpace(NewGenericName) ? null : NewGenericName.Trim(),
            DosageForm = NewDosageForm,
            Strength = string.IsNullOrWhiteSpace(NewStrength) ? null : NewStrength.Trim(),
            BaseUnit = "UNIT",
            SellingUnit = NewSellingUnit,
            UnitsPerSellingUnit = 1.0,
            TaxRate = NewTaxRate,
            IsTaxInclusive = true,
            PrescriptionRequired = NewPrescriptionRequired,
            SellingPrice = NewSellingPrice,
            Mrp = NewMrp > 0 ? NewMrp : NewSellingPrice,
            CurrentStock = NewInitialStock,
            UpdatedAt = now
        };

        await _productRepository.UpsertProductAsync(product);

        if (NewInitialStock > 0 && !string.IsNullOrWhiteSpace(NewInitialBatchNumber))
        {
            var batch = new BatchItem
            {
                Id = Guid.NewGuid().ToString(),
                BusinessId = bizId,
                StoreId = storeId,
                ProductId = productId,
                BatchNumber = NewInitialBatchNumber.Trim(),
                ExpiryDate = string.IsNullOrWhiteSpace(NewExpiryDate) ? DateTime.UtcNow.AddYears(2).ToString("yyyy-MM") : NewExpiryDate.Trim(),
                AvailableQuantity = NewInitialStock,
                SellingPrice = NewSellingPrice,
                Mrp = NewMrp > 0 ? NewMrp : NewSellingPrice
            };
            await _productRepository.UpsertBatchAsync(batch);
        }

        // Queue offline sync operation
        var payload = JsonSerializer.Serialize(new
        {
            productId,
            name = product.Name,
            genericName = product.GenericName,
            brandName = NewBrandName,
            manufacturer = NewManufacturer,
            dosageForm = product.DosageForm,
            strength = product.Strength,
            barcode = NewBarcode,
            sellingPrice = product.SellingPrice,
            mrp = product.Mrp,
            stock = product.CurrentStock
        });

        await _queueRepository.EnqueueOperationAsync(
            bizId,
            storeId,
            device.DeviceId,
            userId,
            "PRODUCT_CREATED",
            payload,
            Guid.NewGuid().ToString()
        );

        _logger.Info(LogCategory.INVENTORY, $"Created local medicine '{product.Name}' (ID: {product.Id}) for business '{bizId}'");

        ShowCreateDialog = false;
        NotificationMessage = $"Medicine '{product.Name}' created locally and queued for sync.";
        await LoadProductsAsync();
    }

    // --- GLOBAL MEDICINE CATALOG WORKFLOW ---

    [RelayCommand]
    public void OpenGlobalCatalogDialog()
    {
        GlobalSearchQuery = string.Empty;
        GlobalSearchResults.Clear();
        SelectedGlobalMedicine = null;
        HasSelectedMedicinePreview = false;

        UpdateAvailabilityState();

        ShowGlobalCatalogDialog = true;
    }

    [RelayCommand]
    public void CloseGlobalCatalogDialog()
    {
        ShowGlobalCatalogDialog = false;
    }

    private void UpdateAvailabilityState()
    {
        void Apply()
        {
            IsCloudOnline = _connectivityService.IsOnline;
            if (IsCloudOnline)
            {
                GlobalAvailabilityState = "Global Catalog Connected";
                GlobalAvailabilityBg = "#F0FDF4";
                GlobalAvailabilityFg = "#166534";
                GlobalAvailabilityBorder = "#BBF7D0";
                GlobalStatusMessage = "Search for platform master medicines by brand name, active molecule, or manufacturer.";
            }
            else
            {
                GlobalAvailabilityState = "Global Catalog Offline — cloud catalog unavailable";
                GlobalAvailabilityBg = "#FEF2F2";
                GlobalAvailabilityFg = "#991B1B";
                GlobalAvailabilityBorder = "#FECACA";
                GlobalStatusMessage = "Operating in offline mode. You can create medicines locally or search previously cached references.";
            }
        }

        if (Avalonia.Threading.Dispatcher.UIThread.CheckAccess())
        {
            Apply();
        }
        else
        {
            Avalonia.Threading.Dispatcher.UIThread.Post(Apply);
        }
    }

    [RelayCommand]
    public async Task SearchGlobalCatalogAsync()
    {
        if (string.IsNullOrWhiteSpace(GlobalSearchQuery))
        {
            GlobalStatusMessage = "Please enter a medicine or generic search term.";
            return;
        }

        IsGlobalLoading = true;
        SelectedGlobalMedicine = null;
        HasSelectedMedicinePreview = false;
        GlobalStatusMessage = "Querying Global Medicine Catalog...";

        try
        {
            await _identityService.GetSessionAsync();
            if (!_connectivityService.IsOnline)
            {
                await _connectivityService.CheckConnectivityNowAsync();
            }

            // 1. If online, perform live server-side search with diagnostics
            if (_connectivityService.IsOnline)
            {
                var queryResult = await _apiClient.QueryGlobalMedicinesWithDiagnosticsAsync(GlobalSearchQuery.Trim());

                if (queryResult.Success && queryResult.Data != null)
                {
                    GlobalSearchResults.Clear();
                    var domainItems = new List<GlobalMedicineItem>();

                    foreach (var dto in queryResult.Data.Content)
                    {
                        var item = MapDtoToDomain(dto);
                        domainItems.Add(item);
                        GlobalSearchResults.Add(item);
                    }

                    // Cache results locally in SQLite for resilience
                    if (domainItems.Count > 0)
                    {
                        await _globalCacheRepository.UpsertCachedMedicinesAsync(domainItems);
                    }

                    GlobalStatusMessage = domainItems.Count > 0
                        ? $"Found {domainItems.Count} matching reference medicines (Latency: {queryResult.DurationMs}ms)."
                        : $"No medicines found in Global Catalog for '{GlobalSearchQuery.Trim()}'.";

                    GlobalAvailabilityState = $"Global Catalog Connected ({queryResult.DurationMs}ms)";
                    GlobalAvailabilityBg = "#F0FDF4";
                    GlobalAvailabilityFg = "#166534";
                    GlobalAvailabilityBorder = "#BBF7D0";
                    return;
                }

                // If query returned error, update state explicitly
                GlobalAvailabilityState = $"Cloud service unavailable ({queryResult.StatusCode})";
                GlobalAvailabilityBg = "#FFFBEB";
                GlobalAvailabilityFg = "#92400E";
                GlobalAvailabilityBorder = "#FDE68A";
                GlobalStatusMessage = $"Catalog query failed: {queryResult.ErrorMessage}. Searching local offline cache...";
            }
            else
            {
                GlobalAvailabilityState = "Global Catalog Offline — cloud catalog unavailable";
                GlobalAvailabilityBg = "#FEF2F2";
                GlobalAvailabilityFg = "#991B1B";
                GlobalAvailabilityBorder = "#FECACA";
            }

            // 2. Fallback to local SQLite cache
            var cached = await _globalCacheRepository.SearchCachedMedicinesAsync(GlobalSearchQuery.Trim());
            GlobalSearchResults.Clear();
            foreach (var m in cached)
            {
                GlobalSearchResults.Add(m);
            }

            if (cached.Count > 0)
            {
                GlobalStatusMessage = $"Showing {cached.Count} results from local offline reference cache.";
            }
            else
            {
                GlobalStatusMessage = _connectivityService.IsOnline
                    ? $"No medicines found matching '{GlobalSearchQuery.Trim()}'."
                    : $"Offline: No cached reference medicines match '{GlobalSearchQuery.Trim()}'. You can create this medicine locally.";
            }
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.CATALOG, "SearchGlobalCatalogAsync failed", ex);
            GlobalStatusMessage = $"Search error: {ex.Message}";
        }
        finally
        {
            IsGlobalLoading = false;
        }
    }

    [RelayCommand]
    public void SelectGlobalMedicine(GlobalMedicineItem? medicine)
    {
        SelectedGlobalMedicine = medicine;
    }

    [RelayCommand]
    public async Task ImportSelectedGlobalMedicineAsync()
    {
        if (SelectedGlobalMedicine == null) return;
        await QuickImportMedicineAsync(SelectedGlobalMedicine);
    }

    [RelayCommand]
    public async Task QuickImportMedicineAsync(GlobalMedicineItem? globalMed)
    {
        if (globalMed == null) return;

        try
        {
            _authService.RequirePermission(AppPermissions.ProductCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        // 1. Prevent duplicate imports: check if already exists by name in business catalog
        var existingProducts = await _productRepository.GetProductsByBusinessAsync(bizId, storeId);
        var existing = existingProducts.FirstOrDefault(p =>
            string.Equals(p.Name, globalMed.Name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            NotificationMessage = $"Medicine '{globalMed.Name}' has already been imported into your catalog (Code: {existing.Code}).";
            ShowGlobalCatalogDialog = false;
            SelectedProduct = existing;
            return;
        }

        // 2. Queue it. The import runs in the background (now if the server is reachable, otherwise as soon as it is),
        // and the catalog product is created only once the server has created it, so it always has the server's id.
        await QueueImportAsync(bizId, storeId, new[] { globalMed });
        ShowGlobalCatalogDialog = false;
    }

    [RelayCommand]
    public async Task QueueAllGlobalResultsAsync()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.ProductCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        if (session == null || GlobalSearchResults.Count == 0) return;
        await QueueImportAsync(session.BusinessId, session.StoreId, GlobalSearchResults.ToList());
    }

    private async Task QueueImportAsync(string bizId, string? storeId, IReadOnlyCollection<GlobalMedicineItem> medicines)
    {
        var added = await _importQueue.EnqueueAsync(bizId, medicines);
        var skipped = medicines.Count - added;
        _ = _syncCoordinator.TriggerAsync(); // starts at once when online; otherwise waits for the connection

        var where = _connectivityService.IsOnline
            ? "Importing in the background."
            : "You are offline: it will import automatically when the server is reachable.";
        NotificationMessage = added == 0
            ? "Already queued. Open Settings → Sync Center to pause or review imports."
            : $"{added} medicine(s) queued. {where}" + (skipped > 0 ? $" {skipped} already queued." : string.Empty);

        _logger.Info(LogCategory.CATALOG, $"Queued {added} global medicine import(s) for business '{bizId}'.");
    }

    [RelayCommand]
    public void OpenImportedProduct()
    {
        ShowImportSuccessModal = false;
        SelectedProduct = Products.FirstOrDefault(p => p.Id == ImportedProductId);
    }

    [RelayCommand]
    public void AddStockForImportedProduct()
    {
        ShowImportSuccessModal = false;
        SelectedProduct = Products.FirstOrDefault(p => p.Id == ImportedProductId);
        OpenAddStockDialog();
    }

    [RelayCommand]
    public void CloseImportSuccessModal()
    {
        ShowImportSuccessModal = false;
    }

    // --- INWARD STOCK ADJUSTMENT WORKFLOW ---

    [RelayCommand]
    public void OpenAddStockDialog()
    {
        if (SelectedProduct == null) return;

        StockAddBatchNumber = $"BATCH-{DateTime.UtcNow:yyyyMM}-{new Random().Next(100, 999)}";
        StockAddExpiry = DateTime.UtcNow.AddYears(2).ToString("yyyy-MM");
        StockAddQuantity = 50;
        StockAddPurchasePrice = SelectedProduct.SellingPrice > 0 ? SelectedProduct.SellingPrice * 0.8m : 40m;

        ShowAddStockDialog = true;
    }

    [RelayCommand]
    public void CloseAddStockDialog()
    {
        ShowAddStockDialog = false;
    }

    [RelayCommand]
    public async Task SaveInwardStockAsync()
    {
        if (SelectedProduct == null || StockAddQuantity <= 0) return;

        try
        {
            _authService.RequirePermission(AppPermissions.InventoryAdjust);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        var batchId = Guid.NewGuid().ToString();
        var batch = new BatchItem
        {
            Id = batchId,
            BusinessId = bizId,
            StoreId = storeId,
            ProductId = SelectedProduct.Id,
            BatchNumber = string.IsNullOrWhiteSpace(StockAddBatchNumber) ? $"B-{DateTime.UtcNow:yyyyMMdd}" : StockAddBatchNumber.Trim(),
            ExpiryDate = string.IsNullOrWhiteSpace(StockAddExpiry) ? DateTime.UtcNow.AddYears(2).ToString("yyyy-MM") : StockAddExpiry.Trim(),
            AvailableQuantity = StockAddQuantity,
            SellingPrice = SelectedProduct.SellingPrice,
            Mrp = SelectedProduct.Mrp
        };

        await _productRepository.UpsertBatchAsync(batch);
        await _productRepository.AddStockAsync(SelectedProduct.Id, batchId, (int)StockAddQuantity);

        // Queue offline synchronization
        await _queueRepository.EnqueueOperationAsync(
            bizId,
            storeId,
            device.DeviceId,
            userId,
            "STOCK_INWARD",
            $"{{\"productId\":\"{SelectedProduct.Id}\",\"batchId\":\"{batchId}\",\"batchNumber\":\"{batch.BatchNumber}\",\"quantity\":{StockAddQuantity}}}",
            Guid.NewGuid().ToString()
        );

        _logger.Info(LogCategory.INVENTORY, $"Received {StockAddQuantity} units into stock for '{SelectedProduct.Name}' (Batch: {batch.BatchNumber})");

        ShowAddStockDialog = false;
        NotificationMessage = $"Inward receipt complete: +{StockAddQuantity} units added to {SelectedProduct.Name}.";
        await LoadProductsAsync();
    }

    [RelayCommand]
    public async Task AddTenStockAsync() => await AdjustStockInternalAsync(10);

    [RelayCommand]
    public async Task AddFiftyStockAsync() => await AdjustStockInternalAsync(50);

    private async Task AdjustStockInternalAsync(int units)
    {
        if (SelectedProduct == null) return;

        try
        {
            _authService.RequirePermission(AppPermissions.InventoryAdjust);
        }
        catch (UnauthorizedAccessException ex)
        {
            NotificationMessage = $"Access Denied: {ex.Message}";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        string? batchId = null;
        if (SelectedProductBatches.Count > 0)
        {
            batchId = SelectedProductBatches[0].Id;
        }

        await _productRepository.AddStockAsync(SelectedProduct.Id, batchId, units);

        await _queueRepository.EnqueueOperationAsync(
            bizId,
            storeId,
            device.DeviceId,
            userId,
            "STOCK_ADJUSTMENT",
            $"{{\"productId\":\"{SelectedProduct.Id}\",\"adjustment\":{units},\"reason\":\"Inward replenishment\"}}",
            Guid.NewGuid().ToString()
        );

        NotificationMessage = $"Stock updated: +{units} units for {SelectedProduct.Name}.";
        await LoadProductsAsync();
    }

    private static GlobalMedicineItem MapDtoToDomain(GlobalMedicineApiDto dto)
    {
        return new GlobalMedicineItem
        {
            Id = dto.Id,
            Name = dto.Name,
            GenericName = dto.GenericName,
            BrandName = dto.BrandName,
            Manufacturer = dto.Manufacturer,
            DosageForm = dto.DosageForm ?? "TABLET",
            Strength = dto.Strength,
            BaseUnit = dto.BaseUnit ?? "UNIT",
            SellingUnit = dto.SellingUnit ?? "STRIP",
            UnitsPerSellingUnit = dto.UnitsPerSellingUnit > 0 ? dto.UnitsPerSellingUnit : 1,
            HsnCode = dto.HsnCode,
            TaxRate = dto.TaxRate > 0 ? dto.TaxRate : 12.0m,
            PrescriptionRequired = dto.PrescriptionRequired,
            Barcode = dto.Barcode,
            Description = dto.Description
        };
    }
}
