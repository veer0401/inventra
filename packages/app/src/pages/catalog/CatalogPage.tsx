import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Layers, AlertTriangle } from "lucide-react";
import { Button, Alert, EmptyState, Pagination } from "@inventra/ui";
import { ProductTable } from "../../components/catalog/ProductTable";
import { ProductSearch } from "../../components/catalog/ProductSearch";
import { CategoryManagementModal } from "../../components/catalog/CategoryManagementModal";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const canManage = ["OWNER", "MANAGER"].includes(activeContext?.role || "");

  // URL state synchronization
  const initialQuery = searchParams.get("q") || "";
  const initialPage = parseInt(searchParams.get("page") || "0", 10);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(20);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0); // Reset page on query change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Sync to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (page > 0) params.set("page", page.toString());
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, page, setSearchParams]);

  // Fetch paginated products via TanStack Query
  const {
    data: pageData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products", businessId, debouncedQuery, page, pageSize],
    queryFn: () => {
      if (debouncedQuery.trim()) {
        return catalogApi.searchProducts(debouncedQuery.trim(), page, pageSize);
      }
      return catalogApi.listProducts(page, pageSize);
    },
    enabled: Boolean(businessId),
  });

  const products = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-lg border border-subtle shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Product Master Catalog
            </h1>
            <span className="text-xs font-mono text-primary bg-primary-subtle px-2 py-0.5 rounded border border-primary-border">
              {totalElements} ITEMS
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Master drug formulations, generic salts, barcode bindings, and tax categories for{" "}
            <strong className="text-primary">{activeContext?.businessName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(true)}
                leftIcon={<Layers className="h-4 w-4" />}
              >
                Categories
              </Button>
              <Link to="/catalog/products/new">
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Add Product
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Query Filter & Search Bar */}
      <div className="p-3.5 bg-surface rounded-lg border border-subtle shadow-card">
        <ProductSearch
          value={searchQuery}
          onChange={setSearchQuery}
          isLoading={isFetching}
        />
      </div>

      {/* Query Error Alert */}
      {error && (
        <Alert variant="danger" title="Failed to load catalog">
          {error instanceof Error ? error.message : "An unexpected server error occurred."}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry Request
            </Button>
          </div>
        </Alert>
      )}

      {/* Products Data Table */}
      <ProductTable products={products} isLoading={isLoading} />

      {/* Empty States */}
      {!isLoading && !error && products.length === 0 && (
        debouncedQuery ? (
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8 text-warning" />}
            title="No products found"
            description={`No catalog items matched your search for "${debouncedQuery}".`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs"
              >
                Clear Search Filter
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Layers className="h-8 w-8 text-primary" />}
            title="Your product catalog is empty"
            description="Start by registering your pharmacy's master pharmaceutical drugs and consumables."
            action={
              canManage && (
                <Link to="/catalog/products/new">
                  <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Create First Product
                  </Button>
                </Link>
              )
            }
          />
        )
      )}

      {/* Server Pagination Controls */}
      {products.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
        />
      )}

      {/* Category Management Modal */}
      <CategoryManagementModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      />
    </div>
  );
};
