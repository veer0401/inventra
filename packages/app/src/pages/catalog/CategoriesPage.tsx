import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Layers, Plus, Edit2, RotateCw } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  FormField,
  Input,
  Select,
  Alert,
  StatusBadge,
  useToast,
} from "@inventra/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@inventra/validation";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { CategoryResponse } from "@inventra/api-types";

export const CategoriesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const canManage = ["OWNER", "MANAGER"].includes(activeContext?.role || "");

  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: categories = [],
    isLoading,
  } = useQuery({
    queryKey: ["categories", businessId],
    queryFn: () => catalogApi.listCategories(),
    enabled: Boolean(businessId),
  });

  const createForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", code: "", description: "" },
  });

  const editForm = useForm<UpdateCategoryInput>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: { name: "", description: "", status: "ACTIVE" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      catalogApi.createCategory({
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || undefined,
        parentId: data.parentId || undefined,
      }),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories", businessId] });
      toast.success(`Category "${newCat.name}" created.`);
      createForm.reset();
      setIsCreating(false);
      setFormError(null);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create category.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      catalogApi.updateCategory(id, {
        name: data.name?.trim() || undefined,
        description: data.description?.trim() || undefined,
        status: data.status,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["categories", businessId] });
      toast.success(`Category "${updated.name}" updated.`);
      setEditingCategory(null);
      editForm.reset();
      setFormError(null);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to update category.");
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/catalog">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Product Catalog
          </Button>
        </Link>

        {canManage && !isCreating && !editingCategory && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setIsCreating(true);
              setFormError(null);
              createForm.reset();
            }}
          >
            Add Category
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Category Taxonomy & Classifications
          </h1>
          <span className="text-xs font-mono text-primary bg-primary-subtle px-2 py-0.5 rounded border border-primary-border">
            {categories.length} CATEGORIES
          </span>
        </div>
        <p className="text-xs text-secondary">
          Manage master therapeutic groupings and pharmacological categories for{" "}
          <strong className="text-primary">{activeContext?.businessName}</strong>.
        </p>
      </div>

      {formError && <Alert variant="danger">{formError}</Alert>}

      {/* Create Category Section */}
      {isCreating && (
        <Card className="shadow-card border-subtle">
          <CardHeader className="pb-3 border-b border-subtle">
            <CardTitle className="text-base text-primary">Create New Category</CardTitle>
            <CardDescription className="text-secondary text-xs">
              Define a new master classification for sorting catalog items.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4 max-w-xl"
            >
              <FormField
                label="Category Name"
                htmlFor="page-cat-name"
                required
                error={createForm.formState.errors.name?.message}
              >
                <Input
                  id="page-cat-name"
                  placeholder="e.g. Analgesics & Antipyretics"
                  disabled={createMutation.isPending}
                  error={Boolean(createForm.formState.errors.name)}
                  {...createForm.register("name")}
                />
              </FormField>

              <FormField
                label="Category Code (Unique)"
                htmlFor="page-cat-code"
                required
                error={createForm.formState.errors.code?.message}
              >
                <Input
                  id="page-cat-code"
                  placeholder="e.g. CAT-ANAL-01"
                  className="font-mono uppercase"
                  disabled={createMutation.isPending}
                  error={Boolean(createForm.formState.errors.code)}
                  {...createForm.register("code")}
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="page-cat-desc"
                error={createForm.formState.errors.description?.message}
              >
                <Input
                  id="page-cat-desc"
                  placeholder="Pain relief, fever reduction, and anti-inflammatory compounds"
                  disabled={createMutation.isPending}
                  {...createForm.register("description")}
                />
              </FormField>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending}
                >
                  Save Category
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Category Section */}
      {editingCategory && (
        <Card className="shadow-card border-subtle">
          <CardHeader className="pb-3 border-b border-subtle">
            <CardTitle className="text-base text-primary">
              Edit Category: {editingCategory.name} ({editingCategory.code})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              onSubmit={editForm.handleSubmit((data) =>
                updateMutation.mutate({ id: editingCategory.id, data })
              )}
              className="space-y-4 max-w-xl"
            >
              <FormField
                label="Category Name"
                htmlFor="page-cat-edit-name"
                error={editForm.formState.errors.name?.message}
              >
                <Input
                  id="page-cat-edit-name"
                  disabled={updateMutation.isPending}
                  error={Boolean(editForm.formState.errors.name)}
                  {...editForm.register("name")}
                />
              </FormField>

              <FormField
                label="Status"
                htmlFor="page-cat-edit-status"
                error={editForm.formState.errors.status?.message}
              >
                <Select
                  id="page-cat-edit-status"
                  disabled={updateMutation.isPending}
                  {...editForm.register("status")}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Select>
              </FormField>

              <FormField
                label="Description"
                htmlFor="page-cat-edit-desc"
                error={editForm.formState.errors.description?.message}
              >
                <Input
                  id="page-cat-edit-desc"
                  disabled={updateMutation.isPending}
                  {...editForm.register("description")}
                />
              </FormField>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={updateMutation.isPending}
                >
                  Update Category
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories List Card */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-3 border-b border-subtle">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Registered Taxonomy Categories
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2">
              <RotateCw className="h-4 w-4 animate-spin text-primary" />
              <span>Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted">
              No categories configured for this business yet.
            </div>
          ) : (
            <div className="divide-y divide-subtle">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-sm">{cat.name}</span>
                      <span className="text-[10px] font-mono text-muted bg-surface-muted px-1.5 py-0.5 rounded border border-subtle">
                        {cat.code}
                      </span>
                      <StatusBadge status={cat.status} className="text-[9px] py-0" />
                    </div>
                    {cat.description && (
                      <p className="text-xs text-secondary mt-1">{cat.description}</p>
                    )}
                  </div>

                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCategory(cat);
                        editForm.reset({
                          name: cat.name,
                          description: cat.description || "",
                          status: cat.status,
                        });
                        setFormError(null);
                      }}
                      leftIcon={<Edit2 className="h-3 w-3" />}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
