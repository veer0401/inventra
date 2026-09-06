import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import "./index.css";
import { queryClient } from "./services/queryClient";
import { useAuthStore } from "./stores/authStore";
import { useThemeStore } from "./stores/themeStore";
import { PublicOnlyRoute } from "./components/routes/PublicOnlyRoute";
import { ProtectedRoute } from "./components/routes/ProtectedRoute";
import { ContextGuard } from "./components/routes/ContextGuard";
import { AdminRoute } from "./components/routes/AdminRoute";
import { AppShell } from "./components/shell/AppShell";
import { AdminShell } from "./components/admin/shell/AdminShell";
import { DesktopTitlebar } from "./components/shell/DesktopTitlebar";
import { RuntimeProvider } from "./runtime/RuntimeContext";
import type { IRuntimeAdapter } from "./runtime/types";

// Public Authentication Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { RegisterApplicationPage } from "./pages/auth/RegisterApplicationPage";
import { ActivateAccountPage } from "./pages/auth/ActivateAccountPage";
import { SelectContextPage } from "./pages/auth/SelectContextPage";

// Authenticated Shell Pages
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { ShortcutSettingsPage } from "./pages/settings/ShortcutSettingsPage";

// Platform Admin Pages
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { OnboardingApplicationsPage } from "./pages/admin/OnboardingApplicationsPage";
import { AdminSubscriptionPage } from "./pages/admin/AdminSubscriptionPage";
import { AdminStoreDetailPage } from "./pages/admin/AdminStoreDetailPage";
import { AdminCmsPage } from "./pages/admin/AdminCmsPage";
import { AdminCareersPage } from "./pages/admin/AdminCareersPage";
import { AdminGlobalMedicinesPage } from "./pages/admin/AdminGlobalMedicinesPage";

// Public Marketing Pages
import { MarketingLayout } from "./pages/marketing/MarketingLayout";
import { HomePage } from "./pages/marketing/HomePage";
import { AboutPage } from "./pages/marketing/AboutPage";
import { FeaturesPage } from "./pages/marketing/FeaturesPage";
import { CareersPage } from "./pages/marketing/CareersPage";
import { CareerDetailPage } from "./pages/marketing/careers/CareerDetailPage";
import { CareerApplyPage } from "./pages/marketing/careers/CareerApplyPage";
import { PricingPlansPage } from "./pages/marketing/PricingPlansPage";
import { LegalContentPage } from "./pages/marketing/LegalContentPage";


// Catalog Module Pages (Phase F3)
import { CatalogPage } from "./pages/catalog/CatalogPage";
import { GlobalMedicinesDirectoryPage } from "./pages/catalog/GlobalMedicinesDirectoryPage";
import { GlobalMedicineGuidePage } from "./pages/catalog/GlobalMedicineGuidePage";
import { ProductDetailPage } from "./pages/catalog/ProductDetailPage";
import { ProductCreatePage } from "./pages/catalog/ProductCreatePage";
import { ProductEditPage } from "./pages/catalog/ProductEditPage";
import { CategoriesPage } from "./pages/catalog/CategoriesPage";

// Inventory & Batches Module Pages (Phase F4)
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { BatchesPage } from "./pages/inventory/BatchesPage";
import { InventoryDetailPage } from "./pages/inventory/InventoryDetailPage";
import { StockMovementsPage } from "./pages/inventory/StockMovementsPage";

// Suppliers Module Pages (Phase F4)
import { SuppliersPage } from "./pages/suppliers/SuppliersPage";
import { SupplierCreatePage } from "./pages/suppliers/SupplierCreatePage";
import { SupplierDetailPage } from "./pages/suppliers/SupplierDetailPage";
import { SupplierEditPage } from "./pages/suppliers/SupplierEditPage";

// Goods Receipts & Procurement Module Pages (Phase F4)
import { GoodsReceiptsPage } from "./pages/purchasing/GoodsReceiptsPage";
import { GoodsReceiptCreatePage } from "./pages/purchasing/GoodsReceiptCreatePage";
import { GoodsReceiptDetailPage } from "./pages/purchasing/GoodsReceiptDetailPage";
import { PurchaseOrdersPage } from "./pages/purchasing/PurchaseOrdersPage";
import { PurchaseOrderCreatePage } from "./pages/purchasing/PurchaseOrderCreatePage";
import { PurchaseOrderDetailPage } from "./pages/purchasing/PurchaseOrderDetailPage";
import { PurchaseInvoicesPage } from "./pages/purchasing/PurchaseInvoicesPage";
import { PurchaseInvoiceDetailPage } from "./pages/purchasing/PurchaseInvoiceDetailPage";

// POS & Sales Module Pages (Phase F6)
import { PosPage } from "./pages/pos/PosPage";
import { SalesPage } from "./pages/sales/SalesPage";
import { SaleDetailPage } from "./pages/sales/SaleDetailPage";

// Customer & Return Module Pages (Phase F7)
import { CustomersPage } from "./pages/customers/CustomersPage";
import { CustomerDetailPage } from "./pages/customers/CustomerDetailPage";
import { SaleReturnWorkflowPage } from "./pages/sales/SaleReturnWorkflowPage";
import { ReturnsPage } from "./pages/returns/ReturnsPage";
import { ReturnDetailPage } from "./pages/returns/ReturnDetailPage";

// Inter-Store Transfers Module Pages (Phase F8-A)
import { TransfersPage } from "./pages/transfers/TransfersPage";
import { TransferCreatePage } from "./pages/transfers/TransferCreatePage";
import { TransferDetailPage } from "./pages/transfers/TransferDetailPage";

// Hardware Device Management Pages (Phase F8-B)
import { DevicesPage } from "./pages/devices/DevicesPage";

// Store Staff & Capacity Management Pages (Phase F8-C)
import { UsersPage } from "./pages/users/UsersPage";

// Universal Ingestion & Import Pages (Phase F8-D)
import { ImportsPage } from "./pages/imports/ImportsPage";
import { ImportUploadPage } from "./pages/imports/ImportUploadPage";
import { ImportReviewPage } from "./pages/imports/ImportReviewPage";

// Reports & Regulatory Analytics Pages
import { ReportsPage } from "./pages/reports/ReportsPage";
import { OperationsGuidePage } from "./pages/guide/OperationsGuidePage";

// Placeholder Components for Future Phases
import { ModulePlaceholderPage } from "./pages/modules/ModulePlaceholderPage";

// Module Icons for Placeholders
import {
  BarChart3,
  Building2,
  Users,
  Settings,
  Database,
} from "lucide-react";

export interface AppProps {
  runtime?: IRuntimeAdapter;
}

export const App: React.FC<AppProps> = ({ runtime }) => {
  const { restoreSession, setOnlineStatus } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    // 0. Initialize theme & OS preference listeners
    initTheme();

    // 1. Restore secure session from sessionStorage on startup
    restoreSession();

    // 2. Listen to browser connectivity events for UX status banner
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [restoreSession, setOnlineStatus]);

  return (
    <RuntimeProvider adapter={runtime}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
        <BrowserRouter>
          <div className="h-screen h-dvh w-full flex flex-col bg-app text-primary antialiased selection:bg-primary selection:text-white transition-colors duration-150 overflow-hidden">
            {runtime?.window.isFrameless && <DesktopTitlebar />}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <Routes>
            {/* Public Marketing & Informational Website */}
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/careers/:jobId" element={<CareerDetailPage />} />
              <Route path="/careers/:jobId/apply" element={<CareerApplyPage />} />
              <Route path="/plans" element={<PricingPlansPage />} />
              <Route path="/pricing" element={<Navigate to="/plans" replace />} />
              <Route path="/privacy" element={<LegalContentPage pageKey="PRIVACY" />} />
              <Route path="/terms" element={<LegalContentPage pageKey="TERMS" />} />
              <Route path="/refund" element={<LegalContentPage pageKey="REFUND" />} />
              <Route path="/security" element={<LegalContentPage pageKey="SECURITY" />} />
            </Route>

            {/* Public Authentication Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/apply"
              element={
                <PublicOnlyRoute>
                  <RegisterApplicationPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/register" element={<Navigate to="/apply" replace />} />
            <Route
              path="/activate"
              element={
                <PublicOnlyRoute>
                  <ActivateAccountPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicOnlyRoute>
                  <ResetPasswordPage />
                </PublicOnlyRoute>
              }
            />

            {/* Platform Admin Console */}
            <Route
              element={
                <AdminRoute>
                  <AdminShell />
                </AdminRoute>
              }
            >
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/applications" element={<OnboardingApplicationsPage />} />
              <Route path="/admin/medicines" element={<AdminGlobalMedicinesPage />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptionPage />} />
              <Route path="/admin/subscriptions/:businessId" element={<AdminStoreDetailPage />} />
              <Route path="/admin/careers" element={<AdminCareersPage />} />
              <Route path="/admin/cms" element={<AdminCmsPage />} />
              <Route path="/admin/onboarding" element={<Navigate to="/admin/applications" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Placeholder admin module routes */}
              <Route path="/admin/businesses" element={<ModulePlaceholderPage title="Businesses" phase="F9" icon={BarChart3} description="Manage platform businesses" plannedFeatures={["Business directory", "Business settings"]} />} />
              <Route path="/admin/stores" element={<ModulePlaceholderPage title="Stores" phase="F9" icon={Building2} description="Manage platform stores" plannedFeatures={["Store directory", "Store settings"]} />} />
              <Route path="/admin/users" element={<ModulePlaceholderPage title="Users" phase="F9" icon={Users} description="Manage platform users" plannedFeatures={["User directory", "Role management"]} />} />
              <Route path="/admin/store-capacity" element={<ModulePlaceholderPage title="Store Capacity" phase="F9" icon={Database} description="Configure store capacity" plannedFeatures={["Capacity limits"]} />} />
              <Route path="/admin/settings" element={<ModulePlaceholderPage title="Platform Settings" phase="F9" icon={Settings} description="Platform-wide settings" plannedFeatures={["Configuration"]} />} />
            </Route>

            {/* Store & Business Context Selection Route */}
            <Route
              path="/select-context"
              element={
                <ProtectedRoute>
                  <SelectContextPage />
                </ProtectedRoute>
              }
            />

            {/* Authenticated Workspace Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <ContextGuard>
                    <AppShell />
                  </ContextGuard>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/shortcuts" element={<ShortcutSettingsPage />} />
              <Route path="/billing" element={<Navigate to="/settings?tab=billing" replace />} />


              {/* Product Catalog & Master Data (Phase F3 - Live) */}
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/global" element={<GlobalMedicinesDirectoryPage />} />
              <Route path="/catalog/global/guide" element={<GlobalMedicineGuidePage />} />
              <Route path="/catalog/products/new" element={<ProductCreatePage />} />
              <Route path="/catalog/products/:productId" element={<ProductDetailPage />} />
              <Route path="/catalog/products/:productId/edit" element={<ProductEditPage />} />
              <Route path="/catalog/categories" element={<CategoriesPage />} />

              {/* Operational Inventory & Batches (Phase F4 - Live) */}
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/batches" element={<BatchesPage />} />
              <Route path="/inventory/movements" element={<StockMovementsPage />} />
              <Route path="/inventory/:productId" element={<InventoryDetailPage />} />

              {/* Suppliers & Vendor Ledgers (Phase F4 - Live) */}
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/new" element={<SupplierCreatePage />} />
              <Route path="/suppliers/:supplierId" element={<SupplierDetailPage />} />
              <Route path="/suppliers/:supplierId/edit" element={<SupplierEditPage />} />

              {/* Goods Receipts & Purchasing Receiving (Phase F4 - Live) */}
              <Route path="/goods-receipts" element={<GoodsReceiptsPage />} />
              <Route path="/goods-receipts/new" element={<GoodsReceiptCreatePage />} />
              <Route path="/goods-receipts/:receiptId" element={<GoodsReceiptDetailPage />} />

              {/* Purchase Orders & Invoices (Phase F4 - Live) */}
              <Route path="/purchasing/orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchasing/orders/new" element={<PurchaseOrderCreatePage />} />
              <Route path="/purchasing/orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/purchasing/invoices" element={<PurchaseInvoicesPage />} />
              <Route path="/purchasing/invoices/:id" element={<PurchaseInvoiceDetailPage />} />
              <Route path="/purchasing" element={<Navigate to="/purchasing/orders" replace />} />

              {/* POS & Sales Module Routes (Phase F6) */}
              <Route path="/pos" element={<PosPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/:id" element={<SaleDetailPage />} />

              {/* Customer Module Routes (Phase F7) */}
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />

              {/* Sales Return Module Routes (Phase F7) */}
              <Route path="/sales/:id/return" element={<SaleReturnWorkflowPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/returns/:id" element={<ReturnDetailPage />} />

              {/* Inter-Store Inventory Transfers (Phase F8-A) */}
              <Route path="/transfers" element={<TransfersPage />} />
              <Route path="/transfers/new" element={<TransferCreatePage />} />
              <Route path="/transfers/:id" element={<TransferDetailPage />} />

              {/* POS Hardware Device Management (Phase F8-B) */}
              <Route path="/devices" element={<DevicesPage />} />

              {/* Store Staff & Capacity Management (Phase F8-C) */}
              <Route path="/users" element={<UsersPage />} />

              {/* Universal Ingestion & Import (Phase F8-D) */}
              <Route path="/imports" element={<ImportsPage />} />
              <Route path="/imports/new" element={<ImportUploadPage />} />
              <Route path="/imports/:id" element={<ImportReviewPage />} />

              {/* Reports & Analytics */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Functional Operations Guide (Whole Website) */}
              <Route path="/guide" element={<OperationsGuidePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </RuntimeProvider>
  );
};
