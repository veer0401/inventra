using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Core.Domain.Gst;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Core.Domain.Sales;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Hardware;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Logging;
using Inventra.Desktop.Infrastructure.Sync;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class PosBillLineViewModel : ObservableObject
{
    public ProductItem Product { get; }

    [ObservableProperty]
    private BatchItem? _selectedBatch;

    [ObservableProperty]
    private double _quantity = 1.0;

    [ObservableProperty]
    private decimal _unitPrice;

    [ObservableProperty]
    private decimal _taxRate;

    [ObservableProperty]
    private decimal _taxableAmount;

    [ObservableProperty]
    private decimal _gstAmount;

    [ObservableProperty]
    private decimal _totalAmount;

    public string ProductName => Product.Name;
    public string FormattedPrice => $"₹{UnitPrice:F2}";
    public string FormattedTaxable => $"₹{TaxableAmount:F2}";
    public string FormattedGst => $"₹{GstAmount:F2}";
    public string FormattedTotal => $"₹{TotalAmount:F2}";

    public PosBillLineViewModel(ProductItem product, BatchItem? batch = null, double quantity = 1.0)
    {
        Product = product;
        SelectedBatch = batch;
        Quantity = quantity;
        UnitPrice = batch != null && batch.SellingPrice > 0 ? batch.SellingPrice : product.SellingPrice;
        TaxRate = product.TaxRate;
        Recalculate();
    }

    public void Recalculate()
    {
        var calc = GstCalculator.Calculate(
            UnitPrice,
            (decimal)Quantity,
            0m,
            TaxRate,
            Product.IsTaxInclusive ? GstCalculationMode.Inclusive : GstCalculationMode.Exclusive,
            GstTransactionType.IntraState
        );

        TaxableAmount = calc.TaxableAmount;
        GstAmount = calc.TotalTaxAmount;
        TotalAmount = calc.TotalAmount;
    }

    partial void OnQuantityChanged(double value) => Recalculate();
    partial void OnUnitPriceChanged(decimal value) => Recalculate();
    partial void OnSelectedBatchChanged(BatchItem? value)
    {
        if (value != null && value.SellingPrice > 0)
        {
            UnitPrice = value.SellingPrice;
        }
        Recalculate();
    }
}

public sealed partial class PosWorkspaceViewModel : ViewModelBase
{
    private readonly IProductRepository _productRepository;
    private readonly ISalesRepository _salesRepository;
    private readonly IOfflineQueueRepository _queueRepository;
    private readonly IIdentitySessionService _identityService;
    private readonly IReceiptPrinterService _printerService;
    private readonly IBarcodeScannerService _scannerService;
    private readonly ISyncEngineService _syncEngineService;
    private readonly IAuthorizationService _authService;
    private readonly IInventraApiClient _apiClient;
    private readonly ICloudConnectivityService _connectivityService;
    private readonly IAppLogger _logger;

    [ObservableProperty]
    private int _selectedPosTab = 0; // 0 = POS Billing, 1 = Sales Register, 2 = Customers Directory

    [ObservableProperty]
    private ObservableCollection<PosBillLineViewModel> _lines = new();

    [ObservableProperty]
    private ObservableCollection<ProductItem> _searchSuggestions = new();

    [ObservableProperty]
    private ObservableCollection<BatchItem> _productBatches = new();

    [ObservableProperty]
    private ObservableCollection<SaleRecord> _recentSales = new();

    // --- CUSTOMERS DIRECTORY STATE ---
    [ObservableProperty]
    private ObservableCollection<CustomerItem> _customers = new();

    [ObservableProperty]
    private CustomerItem? _selectedCustomer;

    [ObservableProperty]
    private string _customerSearchQuery = string.Empty;

    [ObservableProperty]
    private int _totalCustomerCount;

    // --- ADD CUSTOMER MODAL STATE ---
    [ObservableProperty]
    private bool _showAddCustomerDialog = false;

    [ObservableProperty]
    private string _newCustomerName = string.Empty;

    [ObservableProperty]
    private string _newCustomerPhone = string.Empty;

    [ObservableProperty]
    private string _newCustomerEmail = string.Empty;

    [ObservableProperty]
    private string _newCustomerAddress = string.Empty;

    [ObservableProperty]
    private string _newCustomerGstin = string.Empty;

    [ObservableProperty]
    private ProductItem? _selectedSearchProduct;

    [ObservableProperty]
    private BatchItem? _selectedBatch;

    [ObservableProperty]
    private string _searchQuery = string.Empty;

    [ObservableProperty]
    private double _addQuantity = 1.0;

    [ObservableProperty]
    private string _customerName = string.Empty;

    [ObservableProperty]
    private string _customerPhone = string.Empty;

    [ObservableProperty]
    private string _paymentMethod = "CASH";

    [ObservableProperty]
    private decimal _tenderedAmount = 0m;

    [ObservableProperty]
    private decimal _subtotal = 0m;

    [ObservableProperty]
    private decimal _cgstAmount = 0m;

    [ObservableProperty]
    private decimal _sgstAmount = 0m;

    [ObservableProperty]
    private decimal _totalTax = 0m;

    [ObservableProperty]
    private decimal _grandTotal = 0m;

    [ObservableProperty]
    private decimal _changeDue = 0m;

    [ObservableProperty]
    private bool _showSalesRegister = false;

    [ObservableProperty]
    private SaleRecord? _selectedRegisterSale;

    [ObservableProperty]
    private string _statusBanner = string.Empty;

    [ObservableProperty]
    private bool _hasBanner = false;

    public PosWorkspaceViewModel(
        IProductRepository productRepository,
        ISalesRepository salesRepository,
        IOfflineQueueRepository queueRepository,
        IIdentitySessionService identityService,
        IReceiptPrinterService printerService,
        IBarcodeScannerService scannerService,
        ISyncEngineService syncEngineService,
        IAuthorizationService authService,
        IInventraApiClient apiClient,
        ICloudConnectivityService connectivityService,
        IAppLogger logger)
    {
        _productRepository = productRepository;
        _salesRepository = salesRepository;
        _queueRepository = queueRepository;
        _identityService = identityService;
        _printerService = printerService;
        _scannerService = scannerService;
        _syncEngineService = syncEngineService;
        _authService = authService;
        _apiClient = apiClient;
        _connectivityService = connectivityService;
        _logger = logger;

        _scannerService.BarcodeScanned += OnBarcodeScanned;
    }

    public async Task InitializeAsync()
    {
        await LoadRecentSalesAsync();
        await SearchProductsAsync(string.Empty);
    }

    private async void OnBarcodeScanned(object? sender, string barcode)
    {
        var session = await _identityService.GetSessionAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var products = await _productRepository.SearchProductsByBusinessAsync(bizId, session?.StoreId, barcode);
        if (products.Count > 0)
        {
            await AddProductToBillAsync(products[0]);
        }
    }

    [RelayCommand]
    public async Task SearchProductsAsync(string query)
    {
        var session = await _identityService.GetSessionAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";

        var list = string.IsNullOrWhiteSpace(query)
            ? await _productRepository.GetProductsByBusinessAsync(bizId, session?.StoreId)
            : await _productRepository.SearchProductsByBusinessAsync(bizId, session?.StoreId, query);

        SearchSuggestions.Clear();
        foreach (var p in list.Take(25))
        {
            SearchSuggestions.Add(p);
        }
    }

    partial void OnSearchQueryChanged(string value)
    {
        _ = SearchProductsAsync(value);
    }

    partial void OnSelectedSearchProductChanged(ProductItem? value)
    {
        if (value == null)
        {
            ProductBatches.Clear();
            SelectedBatch = null;
            return;
        }

        _ = LoadBatchesAsync(value.Id);
    }

    private async Task LoadBatchesAsync(string productId)
    {
        var batches = await _productRepository.GetBatchesForProductAsync(productId);
        ProductBatches.Clear();
        foreach (var b in batches.OrderBy(b => b.ExpiryDate))
        {
            ProductBatches.Add(b);
        }
        SelectedBatch = ProductBatches.FirstOrDefault();
    }

    [RelayCommand]
    public async Task AddSelectedItemToBillAsync()
    {
        if (SelectedSearchProduct == null) return;
        await AddProductToBillAsync(SelectedSearchProduct, SelectedBatch, AddQuantity);
        AddQuantity = 1.0;
        SearchQuery = string.Empty;
    }

    public async Task AddProductToBillAsync(ProductItem product, BatchItem? batch = null, double quantity = 1.0)
    {
        if (batch == null)
        {
            var batches = await _productRepository.GetBatchesForProductAsync(product.Id);
            batch = batches.OrderBy(b => b.ExpiryDate).FirstOrDefault();
        }

        // Check if item already exists in bill
        var existing = Lines.FirstOrDefault(l => l.Product.Id == product.Id && l.SelectedBatch?.Id == batch?.Id);
        if (existing != null)
        {
            existing.Quantity += quantity;
            existing.Recalculate();
        }
        else
        {
            var line = new PosBillLineViewModel(product, batch, quantity);
            Lines.Add(line);
        }

        RecalculateTotals();
    }

    [RelayCommand]
    public void RemoveLine(PosBillLineViewModel line)
    {
        Lines.Remove(line);
        RecalculateTotals();
    }

    [RelayCommand]
    public void ClearBill()
    {
        Lines.Clear();
        CustomerName = string.Empty;
        CustomerPhone = string.Empty;
        TenderedAmount = 0m;
        RecalculateTotals();
    }

    private void RecalculateTotals()
    {
        Subtotal = Lines.Sum(l => l.TaxableAmount);
        TotalTax = Lines.Sum(l => l.GstAmount);
        CgstAmount = Math.Round(TotalTax / 2m, 2, MidpointRounding.AwayFromZero);
        SgstAmount = TotalTax - CgstAmount;
        GrandTotal = Math.Round(Lines.Sum(l => l.TotalAmount), 2, MidpointRounding.AwayFromZero);

        if (TenderedAmount > 0)
        {
            ChangeDue = Math.Max(0m, TenderedAmount - GrandTotal);
        }
        else
        {
            ChangeDue = 0m;
        }
    }

    partial void OnTenderedAmountChanged(decimal value) => RecalculateTotals();

    [RelayCommand]
    public async Task CompleteSaleAsync()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.SaleCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            ShowBanner($"Access Denied: {ex.Message}");
            return;
        }

        if (Lines.Count == 0)
        {
            ShowBanner("Cannot checkout an empty bill. Add medicines first.");
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();

        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        var invoiceNum = await _salesRepository.GenerateNextInvoiceNumberAsync(storeId);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var sale = new SaleRecord
        {
            Id = Guid.NewGuid().ToString(),
            BusinessId = bizId,
            StoreId = storeId,
            DeviceId = device.DeviceId,
            UserId = userId,
            InvoiceNumber = invoiceNum,
            CustomerName = string.IsNullOrWhiteSpace(CustomerName) ? null : CustomerName.Trim(),
            CustomerPhone = string.IsNullOrWhiteSpace(CustomerPhone) ? null : CustomerPhone.Trim(),
            Subtotal = Subtotal,
            TaxAmount = TotalTax,
            DiscountAmount = 0m,
            TotalAmount = GrandTotal,
            PaymentMethod = PaymentMethod,
            PaymentStatus = "COMPLETED",
            SyncStatus = "PENDING",
            CreatedAt = now
        };

        foreach (var l in Lines)
        {
            sale.Items.Add(new SaleItemRecord
            {
                Id = Guid.NewGuid().ToString(),
                SaleId = sale.Id,
                ProductId = l.Product.Id,
                ProductName = l.ProductName,
                BatchId = l.SelectedBatch?.Id,
                BatchNumber = l.SelectedBatch?.BatchNumber,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                TaxRate = l.TaxRate,
                TaxableAmount = l.TaxableAmount,
                TaxAmount = l.GstAmount,
                TotalAmount = l.TotalAmount
            });

            // Deduct stock locally
            await _productRepository.DeductStockForSaleAsync(l.Product.Id, l.SelectedBatch?.Id, l.Quantity);
        }

        // Save sale record
        await _salesRepository.CreateSaleAsync(sale);

        // Print physical / virtual receipt
        var receiptBytes = _printerService.GenerateSaleReceipt(
            sale,
            session?.BusinessName ?? "Inventra Pharmacy",
            session?.Gstin ?? "",
            session?.StoreName ?? "Retail Counter",
            device.DeviceCode
        );
        await _printerService.PrintBytesAsync(receiptBytes);

        // Queue offline sync operation
        var payload = JsonSerializer.Serialize(new
        {
            saleId = sale.Id,
            invoiceNumber = sale.InvoiceNumber,
            totalAmount = sale.TotalAmount,
            taxAmount = sale.TaxAmount,
            itemsCount = sale.Items.Count
        });

        await _queueRepository.EnqueueOperationAsync(
            bizId,
            storeId,
            device.DeviceId,
            userId,
            "SALE_COMPLETED",
            payload,
            Guid.NewGuid().ToString()
        );

        // Background trigger sync if cloud is reachable
        _ = _syncEngineService.RunSyncCycleAsync(bizId, device.DeviceId);

        ShowBanner($"Sale #{invoiceNum} completed! Total: ₹{GrandTotal:F2}. Receipt printed.");
        ClearBill();
        await LoadRecentSalesAsync();
    }

    [RelayCommand]
    public async Task LoadRecentSalesAsync()
    {
        var session = await _identityService.GetSessionAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var sales = await _salesRepository.GetRecentSalesAsync(bizId, session?.StoreId);

        RecentSales.Clear();
        foreach (var s in sales)
        {
            RecentSales.Add(s);
        }
    }

    [RelayCommand]
    public void ToggleRegisterView()
    {
        ShowSalesRegister = !ShowSalesRegister;
        SelectedPosTab = ShowSalesRegister ? 1 : 0;
        if (ShowSalesRegister)
        {
            _ = LoadRecentSalesAsync();
        }
    }

    partial void OnCustomerSearchQueryChanged(string value) => _ = LoadCustomersAsync();

    partial void OnSelectedPosTabChanged(int value)
    {
        if (value == 1)
        {
            ShowSalesRegister = true;
            _ = LoadRecentSalesAsync();
        }
        else if (value == 2)
        {
            ShowSalesRegister = false;
            _ = LoadCustomersAsync();
        }
        else
        {
            ShowSalesRegister = false;
        }
    }

    [RelayCommand]
    public void SwitchToBilling() => SelectedPosTab = 0;

    [RelayCommand]
    public void SwitchToRegister() => SelectedPosTab = 1;

    [RelayCommand]
    public void SwitchToCustomers()
    {
        SelectedPosTab = 2;
        _ = LoadCustomersAsync();
    }

    [RelayCommand]
    public void OpenAddCustomerDialog()
    {
        NewCustomerName = string.Empty;
        NewCustomerPhone = string.Empty;
        NewCustomerEmail = string.Empty;
        NewCustomerAddress = string.Empty;
        NewCustomerGstin = string.Empty;
        ShowAddCustomerDialog = true;
    }

    [RelayCommand]
    public void CloseAddCustomerDialog()
    {
        ShowAddCustomerDialog = false;
    }

    [RelayCommand]
    public async Task SaveCustomerAsync()
    {
        if (string.IsNullOrWhiteSpace(NewCustomerName))
        {
            ShowBanner("Customer name is required.");
            return;
        }

        if (string.IsNullOrWhiteSpace(NewCustomerPhone))
        {
            ShowBanner("Customer phone number is required.");
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";
        var storeId = session?.StoreId ?? "STORE-01";
        var userId = session?.UserId ?? "USER-DEFAULT";

        var customerId = Guid.NewGuid().ToString();
        var code = $"CUST-{new Random().Next(1000, 9999)}";
        var customer = new CustomerItem
        {
            Id = customerId,
            BusinessId = bizId,
            CustomerCode = code,
            FullName = NewCustomerName.Trim(),
            Phone = NewCustomerPhone.Trim(),
            Email = string.IsNullOrWhiteSpace(NewCustomerEmail) ? null : NewCustomerEmail.Trim(),
            Gstin = string.IsNullOrWhiteSpace(NewCustomerGstin) ? null : NewCustomerGstin.Trim(),
            Status = "ACTIVE",
            UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // 1. Save SQLite
        await _salesRepository.UpsertCustomerAsync(customer);

        // 2. Cloud API or offline queue
        if (_connectivityService.IsOnline && session != null && session.IsAuthenticated)
        {
            try
            {
                var req = new CreateCustomerApiRequest(
                    CustomerCode: customer.CustomerCode,
                    FullName: customer.FullName,
                    Phone: customer.Phone,
                    Email: customer.Email,
                    Address: string.IsNullOrWhiteSpace(NewCustomerAddress) ? null : NewCustomerAddress.Trim(),
                    Gstin: customer.Gstin,
                    Notes: null
                );
                await _apiClient.CreateCustomerAsync(req);
            }
            catch (Exception ex)
            {
                _logger.Warn(LogCategory.POS, $"Cloud customer creation failed, enqueued offline: {ex.Message}");
                await _queueRepository.EnqueueOperationAsync(
                    bizId,
                    storeId,
                    device.DeviceId,
                    userId,
                    "CUSTOMER_CREATE",
                    JsonSerializer.Serialize(customer),
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
                "CUSTOMER_CREATE",
                JsonSerializer.Serialize(customer),
                Guid.NewGuid().ToString()
            );
        }

        ShowAddCustomerDialog = false;
        ShowBanner($"Customer '{customer.FullName}' registered successfully.");
        await LoadCustomersAsync();
    }

    [RelayCommand]
    public async Task LoadCustomersAsync()
    {
        var session = await _identityService.GetSessionAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";

        // 1. Cloud sync when online
        if (_connectivityService.IsOnline && session != null && session.IsAuthenticated)
        {
            try
            {
                var page = await _apiClient.ListCustomersAsync(CustomerSearchQuery);
                if (page?.Content != null)
                {
                    foreach (var dto in page.Content)
                    {
                        var cust = new CustomerItem
                        {
                            Id = dto.Id,
                            BusinessId = bizId,
                            CustomerCode = dto.CustomerCode ?? $"CUST-{dto.Id[..Math.Min(6, dto.Id.Length)].ToUpperInvariant()}",
                            FullName = dto.FullName,
                            Phone = dto.Phone,
                            Email = dto.Email,
                            Gstin = dto.Gstin,
                            Status = dto.Status ?? "ACTIVE",
                            UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                        };
                        await _salesRepository.UpsertCustomerAsync(cust);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error(LogCategory.POS, "Failed to synchronize customers from cloud", ex);
            }
        }

        // 2. Load from SQLite
        var items = await _salesRepository.GetCustomersAsync(bizId, CustomerSearchQuery);
        Customers.Clear();
        foreach (var c in items)
        {
            Customers.Add(c);
        }

        var all = await _salesRepository.GetCustomersAsync(bizId);
        TotalCustomerCount = all.Count;
    }

    [RelayCommand]
    public void SelectCustomerForBill(CustomerItem? customer)
    {
        var target = customer ?? SelectedCustomer;
        if (target == null) return;
        CustomerName = target.FullName;
        CustomerPhone = target.Phone;
        SelectedPosTab = 0;
        ShowBanner($"Customer '{target.FullName}' selected for billing.");
    }

    public void ShowBanner(string message)
    {
        StatusBanner = message;
        HasBanner = true;
    }

    [RelayCommand]
    public void DismissBanner()
    {
        HasBanner = false;
        StatusBanner = string.Empty;
    }
}
