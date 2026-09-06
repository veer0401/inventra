import React, { useState } from "react";
import { Select, Button } from "@inventra/ui";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import { CategoryManagementModal } from "./CategoryManagementModal";

export interface CategorySelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  allowCreate?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  error,
  allowCreate = true,
  disabled,
  id,
  ...rest
}) => {
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const canManage = ["OWNER", "MANAGER"].includes(activeContext?.role || "");

  const [modalOpen, setModalOpen] = useState(false);

  const {
    data: categories = [],
    isLoading,
  } = useQuery({
    queryKey: ["categories", businessId],
    queryFn: () => catalogApi.listCategories(),
    enabled: Boolean(businessId),
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Select
          id={id}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled || isLoading}
          error={error}
          className="flex-1 text-xs"
          {...rest}
        >
          <option value="">-- Select Master Category --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.code}) {cat.status === "INACTIVE" ? "— [INACTIVE]" : ""}
            </option>
          ))}
        </Select>

        {allowCreate && canManage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-9 px-2.5 shrink-0"
            title="Manage Categories"
            aria-label="Manage Categories"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <CategoryManagementModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCategoryCreated={(newCat) => {
          onChange?.(newCat.id);
        }}
      />
    </div>
  );
};
