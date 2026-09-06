import React, { useState } from "react";
import { Layers, Plus, Edit2, RotateCw } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { CategoryResponse } from "@inventra/api-types";

export interface CategoryManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (category: CategoryResponse) => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  open,
  onOpenChange,
  onCategoryCreated,
}) => {
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
    isLoading: isLoadingCategories,
  } = useQuery({
    queryKey: ["categories", businessId],
    queryFn: () => catalogApi.listCategories(),
    enabled: open && Boolean(businessId),
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
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ["categories", businessId] });
      toast.success(`Category "${newCategory.name}" created.`);
      createForm.reset();
      setIsCreating(false);
      onCategoryCreated?.(newCategory);
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
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to update category.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span>Category Taxonomy</span>
        </DialogTitle>
        <DialogDescription>
          Organize products into hierarchical pharmaceutical and clinical categories.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
        {formError && (
          <Alert variant="danger" onDismiss={() => setFormError(null)}>
            {formError}
          </Alert>
        )}

        {/* Existing Categories List */}
        {!isCreating && !editingCategory && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Registered Categories ({categories.length})
              </span>
              {canManage && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  leftIcon={<Plus className="h-3 w-3" />}
                  className="h-7 text-xs"
                >
                  New Category
                </Button>
              )}
            </div>

            {isLoadingCategories ? (
              <div className="flex items-center justify-center p-6 text-muted text-xs">
                <RotateCw className="h-4 w-4 animate-spin mr-2" />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center p-6 bg-surface-muted rounded-md border border-subtle text-muted text-xs">
                No categories created yet. Click "New Category" to add one.
              </div>
            ) : (
              <div className="divide-y divide-subtle border border-subtle rounded-md bg-surface">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 text-xs hover:bg-surface-muted/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{cat.name}</span>
                        <span className="font-mono text-[10px] text-muted uppercase">({cat.code})</span>
                        <StatusBadge status={cat.status} className="text-[9px] py-0" />
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-secondary mt-0.5">{cat.description}</p>
                      )}
                    </div>

                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(cat);
                          editForm.reset({
                            name: cat.name,
                            description: cat.description || "",
                            status: cat.status,
                          });
                        }}
                        className="h-7 text-xs"
                        leftIcon={<Edit2 className="h-3 w-3" />}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Category View */}
        {isCreating && (
          <form
            onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-3 p-3 bg-surface-muted rounded-md border border-subtle"
          >
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <span className="text-xs font-bold text-primary">Create New Category</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="h-6 text-xs text-muted hover:text-primary"
              >
                Cancel
              </Button>
            </div>

            <FormField
              label="Category Name"
              htmlFor="cat-create-name"
              required
              error={createForm.formState.errors.name?.message}
            >
              <Input
                id="cat-create-name"
                placeholder="e.g. Antibiotics"
                disabled={createMutation.isPending}
                error={Boolean(createForm.formState.errors.name)}
                {...createForm.register("name")}
              />
            </FormField>

            <FormField
              label="Category Code (Unique)"
              htmlFor="cat-create-code"
              required
              error={createForm.formState.errors.code?.message}
            >
              <Input
                id="cat-create-code"
                placeholder="e.g. CAT-ANTI-01"
                className="font-mono uppercase"
                disabled={createMutation.isPending}
                error={Boolean(createForm.formState.errors.code)}
                {...createForm.register("code")}
              />
            </FormField>

            <FormField
              label="Description (Optional)"
              htmlFor="cat-create-desc"
              error={createForm.formState.errors.description?.message}
            >
              <Input
                id="cat-create-desc"
                placeholder="Brief therapeutic classification notes"
                disabled={createMutation.isPending}
                {...createForm.register("description")}
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2">
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
        )}

        {/* Edit Category View */}
        {editingCategory && (
          <form
            onSubmit={editForm.handleSubmit((data) =>
              updateMutation.mutate({ id: editingCategory.id, data })
            )}
            className="space-y-3 p-3 bg-surface-muted rounded-md border border-subtle"
          >
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">Edit Category</span>
                <span className="text-[10px] font-mono text-primary">({editingCategory.code})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingCategory(null)}
                className="h-6 text-xs text-muted hover:text-primary"
              >
                Cancel
              </Button>
            </div>

            <FormField
              label="Category Name"
              htmlFor="cat-edit-name"
              error={editForm.formState.errors.name?.message}
            >
              <Input
                id="cat-edit-name"
                disabled={updateMutation.isPending}
                error={Boolean(editForm.formState.errors.name)}
                {...editForm.register("name")}
              />
            </FormField>

            <FormField
              label="Status"
              htmlFor="cat-edit-status"
              error={editForm.formState.errors.status?.message}
            >
              <Select
                id="cat-edit-status"
                disabled={updateMutation.isPending}
                {...editForm.register("status")}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </FormField>

            <FormField
              label="Description"
              htmlFor="cat-edit-desc"
              error={editForm.formState.errors.description?.message}
            >
              <Input
                id="cat-edit-desc"
                disabled={updateMutation.isPending}
                {...editForm.register("description")}
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2">
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
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onOpenChange(false);
            setEditingCategory(null);
            setIsCreating(false);
          }}
        >
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
