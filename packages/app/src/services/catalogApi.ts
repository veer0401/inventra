import { apiClient } from "../stores/authStore";
import type {
  Page,
  ProductSummaryResponse,
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
  ProductIdentifierResponse,
  AddProductIdentifierRequest,
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ProductSearchRequest,
} from "@inventra/api-types";

export const catalogApi = {
  listProducts: async (page = 0, size = 20, sort = "name,asc"): Promise<Page<ProductSummaryResponse>> => {
    const response = await apiClient.get<Page<ProductSummaryResponse>>("/api/v1/products", {
      params: { page, size, sort },
    });
    return response.data;
  },

  searchProducts: async (query: string, page = 0, size = 20): Promise<Page<ProductSummaryResponse>> => {
    const response = await apiClient.get<Page<ProductSummaryResponse>>("/api/v1/products/search", {
      params: { q: query, page, size },
    });
    return response.data;
  },

  searchProductsStructured: async (
    request: ProductSearchRequest,
    page = 0,
    size = 20
  ): Promise<Page<ProductSummaryResponse>> => {
    const response = await apiClient.post<Page<ProductSummaryResponse>>("/api/v1/products/search", request, {
      params: { page, size },
    });
    return response.data;
  },


  getProduct: async (productId: string): Promise<ProductResponse> => {
    const response = await apiClient.get<ProductResponse>(`/api/v1/products/${productId}`);
    return response.data;
  },

  createProduct: async (request: CreateProductRequest): Promise<ProductResponse> => {
    const response = await apiClient.post<ProductResponse>("/api/v1/products", request);
    return response.data;
  },

  updateProduct: async (productId: string, request: UpdateProductRequest): Promise<ProductResponse> => {
    const response = await apiClient.patch<ProductResponse>(`/api/v1/products/${productId}`, request);
    return response.data;
  },

  addProductIdentifier: async (
    productId: string,
    request: AddProductIdentifierRequest
  ): Promise<ProductIdentifierResponse> => {
    const response = await apiClient.post<ProductIdentifierResponse>(
      `/api/v1/products/${productId}/identifiers`,
      request
    );
    return response.data;
  },

  listCategories: async (): Promise<CategoryResponse[]> => {
    const response = await apiClient.get<CategoryResponse[]>("/api/v1/categories");
    return response.data;
  },

  getCategory: async (categoryId: string): Promise<CategoryResponse> => {
    const response = await apiClient.get<CategoryResponse>(`/api/v1/categories/${categoryId}`);
    return response.data;
  },

  createCategory: async (request: CreateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiClient.post<CategoryResponse>("/api/v1/categories", request);
    return response.data;
  },

  updateCategory: async (categoryId: string, request: UpdateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiClient.patch<CategoryResponse>(`/api/v1/categories/${categoryId}`, request);
    return response.data;
  },
};
