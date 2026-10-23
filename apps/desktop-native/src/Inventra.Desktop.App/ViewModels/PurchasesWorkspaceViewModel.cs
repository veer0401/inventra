using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Core.Domain.Gst;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class PurchasesWorkspaceViewModel : ViewModelBase
{
    private readonly IPurchasingRepository _purchasingRepo;
    private readonly IProductRepository _productRepo;
    private readonly IIdentitySessionService _identityService;
    private readonly IInventraApiClient _apiClient;
    private readonly IAuthorizationService _authService;
    private readonly ICloudConnectivityService _connectivityService;
    private readonly IAppLogger _logger;

    public PurchasesWorkspaceViewModel(
        IPurchasingRepository purchasingRepo,
        IProductRepository productRepo,
        IIdentitySessionService identityService,
        IInventraApiClient apiClient,
        IAuthorizationService authService,
        ICloudConnectivityService connectivityService,
        IAppLogger? logger = null)
    {
        _purchasingRepo = purchasingRepo;
        _productRepo = productRepo;
        _identityService = identityService;
        _apiClient = apiClient;
        _authService = authService;
        _connectivityService = connectivityService;
        _logger = logger ?? AppLogger.Instance;
    }

    #region Workspace Navigation & Active Tab

    // 0 = Purchase Register, 1 = New/Edit Purchase, 2 = GRN Inward Register, 3 = Inward Stock Entry, 4 = Suppliers Directory
    [ObservableProperty]
    private int _selectedTabIndex = 0;

    [ObservableProperty]
    private string _notificationMessage = string.Empty;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    [ObservableProperty]
    private bool _isLoading = false;

    #endregion

    #region Purchase Register State

    [ObservableProperty]
    private ObservableCollection<PurchaseOrderItem> _purchases = new();

    [ObservableProperty]
    private PurchaseOrderItem? _selectedPurchase;

    [ObservableProperty]
    private string _purchaseSearchQuery = string.Empty;

    [ObservableProperty]
    private string _purchaseStatusFilter = "ALL";

    [ObservableProperty]
    private int _totalPurchasesCount;

    [ObservableProperty]
    private decimal _totalPurchasesAmount;

    #endregion

    #region New / Edit Purchase Document State

    [ObservableProperty]
    private string _purchaseDocId = Guid.NewGuid().ToString();

    [ObservableProperty]
    private string _purchaseOrderNumber = string.Empty;

    [ObservableProperty]
    private SupplierItem? _selectedDocSupplier;

    [ObservableProperty]
    private string _supplierInvoiceNumber = string.Empty;

    [ObservableProperty]
    private string _purchaseOrderDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [ObservableProperty]
    private int _purchasePaymentTerms = 30;

    [ObservableProperty]
    private string _purchaseNotes = string.Empty;

    [ObservableProperty]
    private bool _isPriceTaxInclusive = false;

    [ObservableProperty]
    private ObservableCollection<PurchaseOrderLineItem> _activePurchaseLines = new();

    [ObservableProperty]
    private decimal _docSubtotal = 0m;

    [ObservableProperty]
    private decimal _docDiscount = 0m;

    [ObservableProperty]
    private decimal _docCgst = 0m;

    [ObservableProperty]
    private decimal _docSgst = 0m;

    [ObservableProperty]
    private decimal _docTotalTax = 0m;

    [ObservableProperty]
    private decimal _docGrandTotal = 0m;

    // Line Entry Row Controls
    [ObservableProperty]
    private string _lineProductSearch = string.Empty;

    [ObservableProperty]
    private ObservableCollection<ProductItem> _matchingProducts = new();

    [ObservableProperty]
    private ProductItem? _selectedCatalogProduct;

    [ObservableProperty]
    private decimal _lineQty = 10m;

    [ObservableProperty]
    private decimal _lineFreeQty = 0m;

    [ObservableProperty]
    private decimal _lineRate = 0m;

    [ObservableProperty]
    private decimal _lineDiscount = 0m;

    [ObservableProperty]
    private decimal _lineTaxRate = 12.0m;

    [ObservableProperty]
    private string _previousPurchasePriceHint = "—";

    #endregion

    #region Goods Receipts (GRN) State

    [ObservableProperty]
    private ObservableCollection<GoodsReceiptItem> _goodsReceipts = new();

    [ObservableProperty]
    private GoodsReceiptItem? _selectedGoodsReceipt;

    [ObservableProperty]
    private string _grnSearchQuery = string.Empty;

    // GRN Inward Entry Form
    [ObservableProperty]
    private string _activeGrnId = Guid.NewGuid().ToString();

    [ObservableProperty]
    private string _activeGrnNumber = string.Empty;

    [ObservableProperty]
    private string? _activeGrnPurchaseId;

    [ObservableProperty]
    private SupplierItem? _activeGrnSupplier;

    [ObservableProperty]
    private string _activeGrnDeliveryNote = string.Empty;

    [ObservableProperty]
    private string _activeGrnReceivedDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [ObservableProperty]
    private string _activeGrnNotes = string.Empty;

    [ObservableProperty]
    private ObservableCollection<GoodsReceiptLineItem> _activeGrnLines = new();

    [ObservableProperty]
    private decimal _activeGrnTotalAmount = 0m;

    // Line Item Inward Entry Dialog / Form
    [ObservableProperty]
    private ProductItem? _grnLineSelectedProduct;

    [ObservableProperty]
    private decimal _grnLineReceivedQty = 10m;

    [ObservableProperty]
    private decimal _grnLineFreeQty = 0m;

    [ObservableProperty]
    private string _grnLineBatchNumber = string.Empty;

    [ObservableProperty]
    private string _grnLineMfgDate = DateTime.UtcNow.AddMonths(-1).ToString("yyyy-MM");

    [ObservableProperty]
    private string _grnLineExpiryDate = DateTime.UtcNow.AddYears(2).ToString("yyyy-MM");

    [ObservableProperty]
    private decimal _grnLineUnitCost = 0m;

    [ObservableProperty]
    private decimal _grnLineMrp = 0m;

    [ObservableProperty]
    private decimal _grnLineSellingPrice = 0m;

    [ObservableProperty]
    private decimal _grnLineTaxRate = 12.0m;

    #endregion

    #region Suppliers Directory State

    [ObservableProperty]
    private ObservableCollection<SupplierItem> _suppliers = new();

    [ObservableProperty]
    private SupplierItem? _selectedSupplier;

    [ObservableProperty]
    private string _supplierSearchQuery = string.Empty;

    // Add / Edit Supplier Modal
    [ObservableProperty]
    private bool _showAddSupplierDialog = false;

    [ObservableProperty]
    private bool _isEditingSupplier = false;

    [ObservableProperty]
    private string? _editingSupplierId = null;

    [ObservableProperty]
    private string _supplierDialogTitle = "Create New Pharmacy Supplier";

    [ObservableProperty]
    private string _newSupplierCode = string.Empty;

    [ObservableProperty]
    private string _newSupplierLegalName = string.Empty;

    [ObservableProperty]
    private string _newSupplierTradeName = string.Empty;

    [ObservableProperty]
    private string _newSupplierGstin = string.Empty;

    [ObservableProperty]
    private string _newSupplierPhone = string.Empty;

    [ObservableProperty]
    private string _newSupplierEmail = string.Empty;

    [ObservableProperty]
    private string _newSupplierContactPerson = string.Empty;

    [ObservableProperty]
    private string _newSupplierAddress = string.Empty;

    [ObservableProperty]
    private string _newSupplierCity = string.Empty;

    [ObservableProperty]
    private string _newSupplierState = string.Empty;

    [ObservableProperty]
    private string _newSupplierPostalCode = string.Empty;

    [ObservableProperty]
    private int _newSupplierPaymentTerms = 30;

    #endregion

    #region Initialization & Loading

    public async Task InitializeAsync()
    {
        await LoadSuppliersAsync();
        await LoadPurchasesAsync();
        await LoadGoodsReceiptsAsync();
    }

    [RelayCommand]
    public async Task LoadPurchasesAsync()
    {
        var session = await _identityService.GetSessionAsync();
        if (session == null) return;

        IsLoading = true;
        try
        {
            var list = await _purchasingRepo.GetPurchasesAsync(session.BusinessId, session.StoreId);

            // Filter if query or status
            var filtered = list.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(PurchaseSearchQuery))
            {
                var q = PurchaseSearchQuery.Trim();
                filtered = filtered.Where(p =>
                    p.OrderNumber.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    p.SupplierName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    (p.SupplierInvoiceNumber != null && p.SupplierInvoiceNumber.Contains(q, StringComparison.OrdinalIgnoreCase)));
            }

            if (!string.Equals(PurchaseStatusFilter, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                filtered = filtered.Where(p => string.Equals(p.Status, PurchaseStatusFilter, StringComparison.OrdinalIgnoreCase));
            }

            Purchases.Clear();
            decimal totalAmt = 0;
            foreach (var p in filtered)
            {
                Purchases.Add(p);
                totalAmt += p.TotalAmount;
            }

            TotalPurchasesCount = Purchases.Count;
            TotalPurchasesAmount = totalAmt;
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "Failed to load purchases", ex);
            ErrorMessage = $"Error loading purchases: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    public async Task LoadGoodsReceiptsAsync()
    {
        var session = await _identityService.GetSessionAsync();
        if (session == null) return;

        try
        {
            var list = await _purchasingRepo.GetGoodsReceiptsAsync(session.BusinessId, session.StoreId);

            if (!string.IsNullOrWhiteSpace(GrnSearchQuery))
            {
                var q = GrnSearchQuery.Trim();
                list = list.Where(g =>
                    g.ReceiptNumber.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    g.SupplierName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    (g.VendorDeliveryNote != null && g.VendorDeliveryNote.Contains(q, StringComparison.OrdinalIgnoreCase))).ToList();
            }

            GoodsReceipts.Clear();
            foreach (var gr in list)
            {
                GoodsReceipts.Add(gr);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "Failed to load goods receipts", ex);
        }
    }

    [RelayCommand]
    public async Task LoadSuppliersAsync()
    {
        var session = await _identityService.GetSessionAsync();
        if (session == null) return;

        try
        {
            // If online, synchronize cloud suppliers into local cache
            if (_connectivityService.IsOnline)
            {
                try
                {
                    var pageRes = await _apiClient.ListSuppliersAsync(page: 0, size: 50);
                    if (pageRes?.Content != null && pageRes.Content.Count > 0)
                    {
                        foreach (var sDto in pageRes.Content)
                        {
                            var sItem = new SupplierItem
                            {
                                Id = sDto.Id,
                                BusinessId = session.BusinessId,
                                SupplierCode = sDto.SupplierCode,
                                LegalName = sDto.LegalName,
                                TradeName = sDto.TradeName,
                                Gstin = sDto.Gstin,
                                PhoneNumber = sDto.PhoneNumber,
                                Email = sDto.Email,
                                ContactPersonName = sDto.ContactPersonName,
                                AddressLine1 = sDto.AddressLine1,
                                City = sDto.City,
                                State = sDto.State,
                                PostalCode = sDto.PostalCode,
                                PaymentTermsDays = sDto.PaymentTermsDays,
                                Status = sDto.Status ?? "ACTIVE"
                            };
                            await _purchasingRepo.UpsertSupplierAsync(sItem);
                        }
                    }
                }
                catch (Exception apiEx)
                {
                    _logger.Warn(LogCategory.API, $"Cloud supplier sync failed: {apiEx.Message}");
                }
            }

            var list = await _purchasingRepo.GetSuppliersAsync(session.BusinessId);

            if (!string.IsNullOrWhiteSpace(SupplierSearchQuery))
            {
                var q = SupplierSearchQuery.Trim();
                list = list.Where(s =>
                    s.LegalName.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    (s.TradeName != null && s.TradeName.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                    (s.Gstin != null && s.Gstin.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                    s.SupplierCode.Contains(q, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            Suppliers.Clear();
            foreach (var s in list)
            {
                Suppliers.Add(s);
            }

            if (SelectedDocSupplier == null && Suppliers.Count > 0)
            {
                SelectedDocSupplier = Suppliers[0];
            }
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "Failed to load suppliers", ex);
        }
    }

    #endregion

    #region Tab Navigation Commands

    [RelayCommand]
    public void SwitchToRegister()
    {
        SelectedTabIndex = 0;
        _ = LoadPurchasesAsync();
    }

    public void OpenPurchaseRegister() => SwitchToRegister();
    public void OpenNewPurchase() => SwitchToNewPurchase();
    public void OpenGrnRegister() => SwitchToGrnRegister();
    public void OpenSuppliers() => SwitchToSuppliers();

    [RelayCommand]
    public async Task OpenPurchaseAsync(PurchaseOrderItem? po)
    {
        if (po == null) return;
        var fullPo = await _purchasingRepo.GetPurchaseByIdAsync(po.Id) ?? po;

        PurchaseDocId = fullPo.Id;
        PurchaseOrderNumber = fullPo.OrderNumber;
        SupplierInvoiceNumber = fullPo.SupplierInvoiceNumber ?? string.Empty;
        PurchaseOrderDate = fullPo.OrderDate;
        PurchasePaymentTerms = fullPo.PaymentTermsDays;
        PurchaseNotes = fullPo.Notes ?? string.Empty;
        SelectedDocSupplier = Suppliers.FirstOrDefault(s => s.Id == fullPo.SupplierId) 
            ?? new SupplierItem { Id = fullPo.SupplierId, LegalName = fullPo.SupplierName };

        ActivePurchaseLines.Clear();
        if (fullPo.Lines != null)
        {
            foreach (var l in fullPo.Lines)
            {
                ActivePurchaseLines.Add(l);
            }
        }
        RecalculateDocumentTotals();
        SelectedTabIndex = 1;
    }

    [RelayCommand]
    public async Task OpenGrnAsync(GoodsReceiptItem? grn)
    {
        if (grn == null) return;
        var fullGrn = await _purchasingRepo.GetGoodsReceiptByIdAsync(grn.Id) ?? grn;

        ActiveGrnId = fullGrn.Id;
        ActiveGrnNumber = fullGrn.ReceiptNumber;
        ActiveGrnPurchaseId = fullGrn.PurchaseOrderId;
        ActiveGrnSupplier = Suppliers.FirstOrDefault(s => s.Id == fullGrn.SupplierId) 
            ?? new SupplierItem { Id = fullGrn.SupplierId, LegalName = fullGrn.SupplierName };
        ActiveGrnDeliveryNote = fullGrn.VendorDeliveryNote ?? string.Empty;
        ActiveGrnReceivedDate = fullGrn.ReceivedDate;
        ActiveGrnNotes = fullGrn.Notes ?? string.Empty;
        ActiveGrnTotalAmount = fullGrn.TotalAmount;

        ActiveGrnLines.Clear();
        if (fullGrn.Lines != null)
        {
            foreach (var l in fullGrn.Lines)
            {
                ActiveGrnLines.Add(l);
            }
        }
        SelectedTabIndex = 3;
    }

    [RelayCommand]
    public void SwitchToNewPurchase()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.PurchaseCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        PurchaseDocId = Guid.NewGuid().ToString();
        PurchaseOrderNumber = $"PO-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}";
        SupplierInvoiceNumber = string.Empty;
        PurchaseOrderDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        PurchasePaymentTerms = SelectedDocSupplier?.PaymentTermsDays ?? 30;
        PurchaseNotes = string.Empty;
        ActivePurchaseLines.Clear();
        ResetLineEntryForm();
        RecalculateDocumentTotals();

        SelectedTabIndex = 1;
    }

    [RelayCommand]
    public void SwitchToGrnRegister()
    {
        SelectedTabIndex = 2;
        _ = LoadGoodsReceiptsAsync();
    }

    [RelayCommand]
    public void SwitchToSuppliers()
    {
        SelectedTabIndex = 4;
        _ = LoadSuppliersAsync();
    }

    #endregion

    #region New Purchase Line Operations

    partial void OnLineProductSearchChanged(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length < 2)
        {
            MatchingProducts.Clear();
            return;
        }

        _ = SearchProductsForLineAsync(value.Trim());
    }

    private async Task SearchProductsForLineAsync(string query)
    {
        var session = await _identityService.GetSessionAsync();
        if (session == null) return;

        try
        {
            var results = await _productRepo.SearchProductsByBusinessAsync(session.BusinessId, session.StoreId, query);
            MatchingProducts.Clear();
            foreach (var r in results.Take(10))
            {
                MatchingProducts.Add(r);
            }
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "Error searching products for purchase line", ex);
        }
    }

    partial void OnSelectedCatalogProductChanged(ProductItem? value)
    {
        if (value == null) return;

        LineTaxRate = value.TaxRate > 0 ? value.TaxRate : 12.0m;
        // Default purchase rate estimation if selling price available
        LineRate = value.SellingPrice > 0 ? Math.Round(value.SellingPrice * 0.75m, 2) : 10m;
        MatchingProducts.Clear();
        LineProductSearch = value.Name;

        // Fetch previous purchase rate
        _ = FetchPreviousPurchaseRateAsync(value.Id);
    }

    private async Task FetchPreviousPurchaseRateAsync(string productId)
    {
        var session = await _identityService.GetSessionAsync();
        if (session == null) return;

        var prev = await _purchasingRepo.GetPreviousPurchasePriceAsync(session.BusinessId, productId);
        if (prev.HasValue)
        {
            PreviousPurchasePriceHint = $"₹{prev.Value:F2}";
            LineRate = prev.Value;
        }
        else
        {
            PreviousPurchasePriceHint = "None (First Purchase)";
        }
    }

    [RelayCommand]
    public void AddLineToPurchase()
    {
        if (SelectedCatalogProduct == null)
        {
            ErrorMessage = "Please search and select a Business Product first.";
            return;
        }

        if (LineQty <= 0)
        {
            ErrorMessage = "Ordered quantity must be greater than zero.";
            return;
        }

        if (LineRate < 0)
        {
            ErrorMessage = "Purchase rate cannot be negative.";
            return;
        }

        ErrorMessage = string.Empty;

        // Calculate line GST
        var mode = IsPriceTaxInclusive ? GstCalculationMode.Inclusive : GstCalculationMode.Exclusive;
        var gstResult = GstCalculator.Calculate(
            LineRate,
            LineQty,
            LineDiscount,
            LineTaxRate,
            mode,
            GstTransactionType.IntraState
        );

        var line = new PurchaseOrderLineItem
        {
            Id = Guid.NewGuid().ToString(),
            PurchaseOrderId = PurchaseDocId,
            ProductId = SelectedCatalogProduct.Id,
            ProductName = SelectedCatalogProduct.Name,
            OrderedQuantity = LineQty,
            FreeQuantity = LineFreeQty,
            PurchaseUnit = SelectedCatalogProduct.SellingUnit ?? "STRIP",
            UnitPrice = LineRate,
            DiscountAmount = LineDiscount,
            TaxRate = LineTaxRate,
            TaxAmount = gstResult.TotalTaxAmount,
            LineTotal = gstResult.TotalAmount,
            IsTaxInclusive = IsPriceTaxInclusive
        };

        ActivePurchaseLines.Add(line);
        RecalculateDocumentTotals();
        ResetLineEntryForm();
    }

    [RelayCommand]
    public void RemovePurchaseLine(PurchaseOrderLineItem? line)
    {
        if (line != null)
        {
            ActivePurchaseLines.Remove(line);
            RecalculateDocumentTotals();
        }
    }

    private void ResetLineEntryForm()
    {
        SelectedCatalogProduct = null;
        LineProductSearch = string.Empty;
        MatchingProducts.Clear();
        LineQty = 10m;
        LineFreeQty = 0m;
        LineRate = 0m;
        LineDiscount = 0m;
        LineTaxRate = 12.0m;
        PreviousPurchasePriceHint = "—";
    }

    private void RecalculateDocumentTotals()
    {
        decimal subtotal = 0m;
        decimal totalTax = 0m;
        decimal totalDiscount = 0m;
        decimal grandTotal = 0m;

        foreach (var l in ActivePurchaseLines)
        {
            subtotal += (l.UnitPrice * l.OrderedQuantity);
            totalDiscount += l.DiscountAmount;
            totalTax += l.TaxAmount;
            grandTotal += l.LineTotal;
        }

        DocSubtotal = subtotal;
        DocDiscount = totalDiscount;
        DocTotalTax = totalTax;
        DocCgst = Math.Round(totalTax / 2m, 2);
        DocSgst = totalTax - DocCgst;
        DocGrandTotal = grandTotal;
    }

    [RelayCommand]
    public async Task SavePurchaseDraftAsync()
    {
        await SavePurchaseInternalAsync("DRAFT");
    }

    [RelayCommand]
    public async Task SavePurchaseAndConfirmAsync()
    {
        await SavePurchaseInternalAsync("CONFIRMED");
    }

    private async Task SavePurchaseInternalAsync(string targetStatus)
    {
        try
        {
            _authService.RequirePermission(AppPermissions.PurchaseCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        if (SelectedDocSupplier == null)
        {
            ErrorMessage = "Please select a supplier.";
            return;
        }

        if (ActivePurchaseLines.Count == 0)
        {
            ErrorMessage = "Please add at least one medicine line to the purchase.";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        if (session == null)
        {
            ErrorMessage = "User session expired.";
            return;
        }

        IsLoading = true;
        try
        {
            var po = new PurchaseOrderItem
            {
                Id = PurchaseDocId,
                BusinessId = session.BusinessId,
                StoreId = session.StoreId,
                SupplierId = SelectedDocSupplier.Id,
                SupplierName = SelectedDocSupplier.DisplayName,
                OrderNumber = string.IsNullOrWhiteSpace(PurchaseOrderNumber)
                    ? $"PO-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}"
                    : PurchaseOrderNumber,
                SupplierInvoiceNumber = SupplierInvoiceNumber.Trim(),
                OrderDate = PurchaseOrderDate,
                Status = targetStatus,
                PaymentTermsDays = PurchasePaymentTerms,
                Notes = PurchaseNotes.Trim(),
                Subtotal = DocSubtotal,
                DiscountAmount = DocDiscount,
                TaxAmount = DocTotalTax,
                TotalAmount = DocGrandTotal,
                SyncStatus = "PENDING",
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                CreatedBy = session.FullName ?? session.Email,
                Lines = ActivePurchaseLines.ToList()
            };

            await _purchasingRepo.SavePurchaseAsync(po);

            // If confirmed and cloud online, try online API
            if (targetStatus == "CONFIRMED" && _connectivityService.IsOnline)
            {
                try
                {
                    var req = new CreatePurchaseOrderApiRequest(
                        session.StoreId,
                        SelectedDocSupplier.Id,
                        po.OrderDate,
                        null,
                        0m,
                        po.Notes,
                        po.Lines.ConvertAll(l => new CreatePurchaseOrderLineApiRequest(
                            l.ProductId, null, l.PurchaseUnit, 1, l.OrderedQuantity, l.UnitPrice, 0m, l.TaxRate
                        ))
                    );
                    var onlinePo = await _apiClient.CreatePurchaseOrderAsync(req);
                    if (onlinePo != null)
                    {
                        await _apiClient.ConfirmPurchaseOrderAsync(onlinePo.Id);
                        await _purchasingRepo.UpdatePurchaseStatusAsync(po.Id, "CONFIRMED");
                    }
                }
                catch (Exception ex)
                {
                    _logger.Warn(LogCategory.SYNC, $"Cloud PO creation skipped/failed, queued locally: {ex.Message}");
                }
            }

            NotificationMessage = $"Purchase order '{po.OrderNumber}' saved as {targetStatus}. Stock has NOT been increased (Stock increases only upon GRN receipt).";
            SelectedTabIndex = 0; // Return to Register
            await LoadPurchasesAsync();
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "Failed to save purchase order", ex);
            ErrorMessage = $"Error saving purchase order: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    #endregion

    #region GRN Inward Workflow & Stock Posting

    [RelayCommand]
    public void PrepareInwardFromPurchase(PurchaseOrderItem? po)
    {
        if (po == null)
        {
            ErrorMessage = "Select a purchase order to receive goods.";
            return;
        }

        if (string.Equals(po.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            ErrorMessage = $"Purchase order '{po.OrderNumber}' has already been fully received.";
            return;
        }

        if (string.Equals(po.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            ErrorMessage = $"Purchase order '{po.OrderNumber}' is cancelled.";
            return;
        }

        ActiveGrnId = Guid.NewGuid().ToString();
        ActiveGrnNumber = $"GRN-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}";
        ActiveGrnPurchaseId = po.Id;
        ActiveGrnSupplier = Suppliers.FirstOrDefault(s => s.Id == po.SupplierId);
        ActiveGrnDeliveryNote = po.SupplierInvoiceNumber ?? string.Empty;
        ActiveGrnReceivedDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        ActiveGrnNotes = $"Stock received against {po.OrderNumber}";

        ActiveGrnLines.Clear();
        decimal total = 0m;
        foreach (var l in po.Lines)
        {
            var remainingQty = Math.Max(0m, l.OrderedQuantity - l.ReceivedQuantity);
            if (remainingQty <= 0) continue;

            // Generate an initial suggested batch code
            var mfg = DateTime.UtcNow.AddMonths(-1).ToString("yyyy-MM");
            var exp = DateTime.UtcNow.AddYears(2).ToString("yyyy-MM");
            var lineCost = l.UnitPrice;
            var lineMrp = Math.Round(l.UnitPrice * 1.35m, 2);

            var grnLine = new GoodsReceiptLineItem
            {
                Id = Guid.NewGuid().ToString(),
                GoodsReceiptId = ActiveGrnId,
                PurchaseOrderLineId = l.Id,
                ProductId = l.ProductId,
                ProductName = l.ProductName,
                ReceivedQuantity = remainingQty,
                FreeQuantity = l.FreeQuantity,
                BatchNumber = $"BAT-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(100, 999)}",
                ManufacturingDate = mfg,
                ExpiryDate = exp,
                UnitCost = lineCost,
                Mrp = lineMrp,
                SellingPrice = lineMrp,
                TaxRate = l.TaxRate,
                TaxAmount = Math.Round(lineCost * remainingQty * (l.TaxRate / 100m), 2),
                LineTotal = Math.Round((lineCost * remainingQty) * (1m + (l.TaxRate / 100m)), 2)
            };

            ActiveGrnLines.Add(grnLine);
            total += grnLine.LineTotal;
        }

        ActiveGrnTotalAmount = total;
        SelectedTabIndex = 3; // Switch to Inward Processing Screen
    }

    [RelayCommand]
    public void PrepareDirectGrn()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.InventoryAdjust);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        ActiveGrnId = Guid.NewGuid().ToString();
        ActiveGrnNumber = $"GRN-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}";
        ActiveGrnPurchaseId = null;
        ActiveGrnSupplier = Suppliers.FirstOrDefault();
        ActiveGrnDeliveryNote = string.Empty;
        ActiveGrnReceivedDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        ActiveGrnNotes = "Direct goods receipt";
        ActiveGrnLines.Clear();
        ActiveGrnTotalAmount = 0m;

        SelectedTabIndex = 3;
    }

    [RelayCommand]
    public void AddLineToActiveGrn()
    {
        if (GrnLineSelectedProduct == null)
        {
            ErrorMessage = "Select a medicine product for GRN.";
            return;
        }

        if (GrnLineReceivedQty <= 0)
        {
            ErrorMessage = "Received quantity must be greater than zero.";
            return;
        }

        if (string.IsNullOrWhiteSpace(GrnLineBatchNumber))
        {
            ErrorMessage = "Batch number is mandatory for medicine inwarding.";
            return;
        }

        if (string.IsNullOrWhiteSpace(GrnLineExpiryDate))
        {
            ErrorMessage = "Expiry date is mandatory (YYYY-MM).";
            return;
        }

        if (GrnLineUnitCost < 0 || GrnLineMrp < 0)
        {
            ErrorMessage = "Purchase rate and MRP cannot be negative.";
            return;
        }

        var lineTotal = Math.Round(GrnLineUnitCost * GrnLineReceivedQty * (1m + (GrnLineTaxRate / 100m)), 2);

        var line = new GoodsReceiptLineItem
        {
            Id = Guid.NewGuid().ToString(),
            GoodsReceiptId = ActiveGrnId,
            ProductId = GrnLineSelectedProduct.Id,
            ProductName = GrnLineSelectedProduct.Name,
            ReceivedQuantity = GrnLineReceivedQty,
            FreeQuantity = GrnLineFreeQty,
            BatchNumber = GrnLineBatchNumber.Trim().ToUpperInvariant(),
            ManufacturingDate = GrnLineMfgDate.Trim(),
            ExpiryDate = GrnLineExpiryDate.Trim(),
            UnitCost = GrnLineUnitCost,
            Mrp = GrnLineMrp,
            SellingPrice = GrnLineSellingPrice > 0 ? GrnLineSellingPrice : GrnLineMrp,
            TaxRate = GrnLineTaxRate,
            TaxAmount = Math.Round(GrnLineUnitCost * GrnLineReceivedQty * (GrnLineTaxRate / 100m), 2),
            LineTotal = lineTotal
        };

        ActiveGrnLines.Add(line);
        ActiveGrnTotalAmount += lineTotal;
        GrnLineSelectedProduct = null;
        GrnLineBatchNumber = string.Empty;
    }

    [RelayCommand]
    public void RemoveGrnLine(GoodsReceiptLineItem? line)
    {
        if (line != null)
        {
            ActiveGrnLines.Remove(line);
            ActiveGrnTotalAmount = ActiveGrnLines.Sum(l => l.LineTotal);
        }
    }

    [RelayCommand]
    public async Task PostGoodsReceiptAsync()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.InventoryAdjust);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        if (ActiveGrnLines.Count == 0)
        {
            ErrorMessage = "Cannot post GRN with zero received lines.";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        if (session == null)
        {
            ErrorMessage = "Session is expired or workstation unauthorized.";
            return;
        }

        IsLoading = true;
        try
        {
            var grn = new GoodsReceiptItem
            {
                Id = ActiveGrnId,
                BusinessId = session.BusinessId,
                StoreId = session.StoreId,
                SupplierId = ActiveGrnSupplier?.Id ?? "UNKNOWN",
                SupplierName = ActiveGrnSupplier?.DisplayName ?? "Direct Supplier",
                PurchaseOrderId = ActiveGrnPurchaseId,
                ReceiptNumber = string.IsNullOrWhiteSpace(ActiveGrnNumber)
                    ? $"GRN-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}"
                    : ActiveGrnNumber,
                VendorDeliveryNote = ActiveGrnDeliveryNote.Trim(),
                ReceivedDate = ActiveGrnReceivedDate,
                Status = "DRAFT",
                Notes = ActiveGrnNotes.Trim(),
                TotalAmount = ActiveGrnTotalAmount,
                ReceivedBy = session.FullName ?? session.Email,
                SyncStatus = "PENDING",
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Lines = ActiveGrnLines.ToList()
            };

            // 1. Transactionally post to local SQLite:
            // Validates batches, updates or creates cache_batches, increases current_stock in cache_products,
            // updates PO status, sets GRN to POSTED, and queues offline_operations for sync!
            var postedGrn = await _purchasingRepo.PostGoodsReceiptTransactionAsync(grn, session.UserId, device.DeviceId);

            // 2. If Cloud is Online, attempt authoritative direct API post
            if (_connectivityService.IsOnline)
            {
                try
                {
                    var apiReq = new CreateGoodsReceiptApiRequest(
                        session.StoreId,
                        postedGrn.SupplierId,
                        postedGrn.PurchaseOrderId,
                        postedGrn.VendorDeliveryNote,
                        postedGrn.ReceivedDate,
                        postedGrn.Notes,
                        $"GRN-{postedGrn.Id}",
                        postedGrn.Lines.ConvertAll(l => new CreateGoodsReceiptLineApiRequest(
                            l.PurchaseOrderLineId,
                            l.ProductId,
                            l.ReceivedQuantity,
                            "STRIP",
                            1,
                            l.RejectedQuantity,
                            l.BatchNumber,
                            l.ManufacturingDate,
                            l.ExpiryDate.Length == 7 ? l.ExpiryDate + "-01" : l.ExpiryDate,
                            l.UnitCost,
                            l.Mrp,
                            l.SellingPrice,
                            l.TaxRate
                        ))
                    );

                    var apiGrn = await _apiClient.CreateGoodsReceiptAsync(apiReq);
                    if (apiGrn != null)
                    {
                        await _apiClient.PostGoodsReceiptAsync(apiGrn.Id);
                    }
                }
                catch (Exception apiEx)
                {
                    _logger.Warn(LogCategory.SYNC, $"Cloud direct GRN post skipped/failed, will sync via offline queue: {apiEx.Message}");
                }
            }

            NotificationMessage = $"SUCCESS: Goods Receipt '{postedGrn.ReceiptNumber}' POSTED! Stock and Batches updated in Inventory with FEFO ordering.";
            ActiveGrnLines.Clear();
            SelectedTabIndex = 2; // Switch to GRN Register
            await LoadGoodsReceiptsAsync();
            await LoadPurchasesAsync();
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "PostGoodsReceiptTransaction failed", ex);
            ErrorMessage = $"Stock Inward Failed: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    #endregion

    #region Supplier Management

    [RelayCommand]
    public void OpenAddSupplierDialog()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.PurchaseCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        IsEditingSupplier = false;
        EditingSupplierId = null;
        SupplierDialogTitle = "Create New Pharmacy Supplier";

        NewSupplierCode = $"SUP-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(100, 999)}";
        NewSupplierLegalName = string.Empty;
        NewSupplierTradeName = string.Empty;
        NewSupplierGstin = string.Empty;
        NewSupplierPhone = string.Empty;
        NewSupplierEmail = string.Empty;
        NewSupplierContactPerson = string.Empty;
        NewSupplierAddress = string.Empty;
        NewSupplierCity = string.Empty;
        NewSupplierState = string.Empty;
        NewSupplierPostalCode = string.Empty;
        NewSupplierPaymentTerms = 30;

        ShowAddSupplierDialog = true;
    }

    [RelayCommand]
    public void OpenEditSupplierDialog(SupplierItem? supplier)
    {
        if (supplier == null) return;
        try
        {
            _authService.RequirePermission(AppPermissions.PurchaseCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        IsEditingSupplier = true;
        EditingSupplierId = supplier.Id;
        SupplierDialogTitle = $"Edit Supplier: {supplier.LegalName}";

        NewSupplierCode = supplier.SupplierCode;
        NewSupplierLegalName = supplier.LegalName;
        NewSupplierTradeName = supplier.TradeName ?? string.Empty;
        NewSupplierGstin = supplier.Gstin ?? string.Empty;
        NewSupplierPhone = supplier.PhoneNumber ?? string.Empty;
        NewSupplierEmail = supplier.Email ?? string.Empty;
        NewSupplierContactPerson = supplier.ContactPersonName ?? string.Empty;
        NewSupplierAddress = supplier.AddressLine1 ?? string.Empty;
        NewSupplierCity = supplier.City ?? string.Empty;
        NewSupplierState = supplier.State ?? string.Empty;
        NewSupplierPostalCode = supplier.PostalCode ?? string.Empty;
        NewSupplierPaymentTerms = supplier.PaymentTermsDays;

        ShowAddSupplierDialog = true;
    }

    [RelayCommand]
    public void CloseAddSupplierDialog()
    {
        ShowAddSupplierDialog = false;
    }

    [RelayCommand]
    public async Task SaveSupplierAsync()
    {
        try
        {
            _authService.RequirePermission(AppPermissions.PurchaseCreate);
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            return;
        }

        if (string.IsNullOrWhiteSpace(NewSupplierLegalName))
        {
            ErrorMessage = "Supplier legal name is required.";
            return;
        }

        var session = await _identityService.GetSessionAsync();
        if (session == null)
        {
            ErrorMessage = "Session expired.";
            return;
        }

        IsLoading = true;
        try
        {
            var isEdit = IsEditingSupplier && !string.IsNullOrEmpty(EditingSupplierId);
            var supplierId = isEdit ? EditingSupplierId! : Guid.NewGuid().ToString();

            var supplier = new SupplierItem
            {
                Id = supplierId,
                BusinessId = session.BusinessId,
                SupplierCode = string.IsNullOrWhiteSpace(NewSupplierCode)
                    ? $"SUP-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(100, 999)}"
                    : NewSupplierCode.Trim().ToUpperInvariant(),
                LegalName = NewSupplierLegalName.Trim(),
                TradeName = string.IsNullOrWhiteSpace(NewSupplierTradeName) ? null : NewSupplierTradeName.Trim(),
                Gstin = string.IsNullOrWhiteSpace(NewSupplierGstin) ? null : NewSupplierGstin.Trim().ToUpperInvariant(),
                PhoneNumber = string.IsNullOrWhiteSpace(NewSupplierPhone) ? null : NewSupplierPhone.Trim(),
                Email = string.IsNullOrWhiteSpace(NewSupplierEmail) ? null : NewSupplierEmail.Trim(),
                ContactPersonName = string.IsNullOrWhiteSpace(NewSupplierContactPerson) ? null : NewSupplierContactPerson.Trim(),
                AddressLine1 = string.IsNullOrWhiteSpace(NewSupplierAddress) ? null : NewSupplierAddress.Trim(),
                City = string.IsNullOrWhiteSpace(NewSupplierCity) ? null : NewSupplierCity.Trim(),
                State = string.IsNullOrWhiteSpace(NewSupplierState) ? null : NewSupplierState.Trim(),
                PostalCode = string.IsNullOrWhiteSpace(NewSupplierPostalCode) ? null : NewSupplierPostalCode.Trim(),
                PaymentTermsDays = NewSupplierPaymentTerms,
                Status = "ACTIVE",
                UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await _purchasingRepo.UpsertSupplierAsync(supplier);

            // If online, send to cloud
            if (_connectivityService.IsOnline)
            {
                try
                {
                    if (isEdit)
                    {
                        var updateReq = new UpdateSupplierApiRequest(
                            supplier.LegalName,
                            supplier.TradeName,
                            "DISTRIBUTOR",
                            supplier.Gstin,
                            null,
                            null,
                            supplier.Email,
                            supplier.PhoneNumber,
                            supplier.ContactPersonName,
                            supplier.AddressLine1,
                            supplier.City,
                            supplier.State,
                            supplier.PostalCode,
                            supplier.PaymentTermsDays
                        );
                        await _apiClient.UpdateSupplierAsync(supplier.Id, updateReq);
                    }
                    else
                    {
                        var apiReq = new CreateSupplierApiRequest(
                            supplier.SupplierCode,
                            supplier.LegalName,
                            supplier.TradeName,
                            "DISTRIBUTOR",
                            supplier.Gstin,
                            null,
                            null,
                            supplier.Email,
                            supplier.PhoneNumber,
                            supplier.ContactPersonName,
                            supplier.AddressLine1,
                            supplier.City,
                            supplier.State,
                            supplier.PostalCode,
                            supplier.PaymentTermsDays,
                            "Created on Desktop"
                        );
                        await _apiClient.CreateSupplierAsync(apiReq);
                    }
                }
                catch (Exception apiEx)
                {
                    _logger.Warn(LogCategory.SYNC, $"Cloud supplier save skipped/failed: {apiEx.Message}");
                }
            }

            NotificationMessage = isEdit
                ? $"Supplier '{supplier.LegalName}' updated successfully."
                : $"Supplier '{supplier.LegalName}' created successfully.";
            ShowAddSupplierDialog = false;
            await LoadSuppliersAsync();
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.DATABASE, "Failed to save supplier", ex);
            ErrorMessage = $"Error saving supplier: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    #endregion
}
