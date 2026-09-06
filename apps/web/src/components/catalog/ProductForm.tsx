import React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProductSchema,
  type CreateProductInput,
} from "@inventra/validation";
import {
  FormField,
  Input,
  Select,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
} from "@inventra/ui";
import {
  Pill,
  Package,
  Receipt,
  Barcode as BarcodeIcon,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { CategorySelect } from "./CategorySelect";
import type { ProductResponse, DosageForm } from "@inventra/api-types";

export interface ProductFormProps {
  initialData?: ProductResponse;
  onSubmit: (data: CreateProductInput) => Promise<void>;
  isSubmitting?: boolean;
  serverError?: string | null;
  onCancel?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
  serverError = null,
  onCancel,
}) => {
  const isEditMode = Boolean(initialData);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: initialData?.name || "",
      genericName: initialData?.genericName || "",
      brandName: initialData?.brandName || "",
      manufacturer: initialData?.manufacturer || "",
      dosageForm: (initialData?.dosageForm || "TABLET") as DosageForm,
      strength: initialData?.strength || "",
      categoryId: initialData?.categoryId || "",
      baseUnit: initialData?.baseUnit || "Tablet",
      sellingUnit: initialData?.sellingUnit || "Strip of 10",
      unitsPerSellingUnit: initialData?.unitsPerSellingUnit || 10,
      hsnCode: initialData?.hsnCode || "",
      taxRate: initialData?.taxRate !== undefined ? initialData.taxRate : 12,
      isTaxInclusive: initialData?.isTaxInclusive ?? true,
      prescriptionRequired: initialData?.prescriptionRequired ?? false,
      identifiers:
        !isEditMode
          ? [{ identifierType: "BARCODE", identifierValue: "", isPrimary: true }]
          : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "identifiers",
  });

  const handleCancelClick = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      {serverError && (
        <Alert variant="danger" title="Error">
          {serverError}
        </Alert>
      )}

      {/* 1. Core Clinical Identity Section */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-3 border-b border-subtle">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            1. Master Pharmaceutical Identity
          </CardTitle>
          <CardDescription className="text-secondary text-xs">
            Drug formulation, generic compound names, brand identifiers, and manufacturer information.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Product Trade / Display Name"
              htmlFor="product-name"
              required
              error={errors.name?.message}
            >
              <Input
                id="product-name"
                placeholder="e.g. Augmentin 625 Duo Tablet"
                disabled={isSubmitting}
                error={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>

            <FormField
              label="Generic / Salt Composition"
              htmlFor="generic-name"
              error={errors.genericName?.message}
            >
              <Input
                id="generic-name"
                placeholder="e.g. Amoxicillin (500mg) + Clavulanic Acid (125mg)"
                disabled={isSubmitting}
                error={Boolean(errors.genericName)}
                {...register("genericName")}
              />
            </FormField>

            <FormField
              label="Brand / Marketing Name"
              htmlFor="brand-name"
              error={errors.brandName?.message}
            >
              <Input
                id="brand-name"
                placeholder="e.g. Augmentin"
                disabled={isSubmitting}
                error={Boolean(errors.brandName)}
                {...register("brandName")}
              />
            </FormField>

            <FormField
              label="Manufacturer / Pharmaceutical Lab"
              htmlFor="manufacturer"
              error={errors.manufacturer?.message}
            >
              <Input
                id="manufacturer"
                placeholder="e.g. GlaxoSmithKline Pharmaceuticals Ltd"
                disabled={isSubmitting}
                error={Boolean(errors.manufacturer)}
                {...register("manufacturer")}
              />
            </FormField>

            <FormField
              label="Dosage Form"
              htmlFor="dosage-form"
              required
              error={errors.dosageForm?.message}
            >
              <Select
                id="dosage-form"
                disabled={isSubmitting}
                error={Boolean(errors.dosageForm)}
                {...register("dosageForm")}
              >
                <option value="TABLET">TABLET</option>
                <option value="CAPSULE">CAPSULE</option>
                <option value="SYRUP">SYRUP</option>
                <option value="INJECTION">INJECTION</option>
                <option value="OINTMENT">OINTMENT</option>
                <option value="DROPS">DROPS</option>
                <option value="POWDER">POWDER</option>
                <option value="DEVICE">DEVICE</option>
                <option value="GENERAL">GENERAL</option>
              </Select>
            </FormField>

            <FormField
              label="Strength / Potency"
              htmlFor="strength"
              error={errors.strength?.message}
            >
              <Input
                id="strength"
                placeholder="e.g. 625mg, 10ml, 2% w/w"
                disabled={isSubmitting}
                error={Boolean(errors.strength)}
                {...register("strength")}
              />
            </FormField>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="prescriptionRequired"
              className="h-4 w-4 rounded border-strong bg-surface text-primary focus:ring-focus cursor-pointer"
              disabled={isSubmitting}
              {...register("prescriptionRequired")}
            />
            <label htmlFor="prescriptionRequired" className="text-xs text-primary cursor-pointer font-medium">
              Schedule Drug / Prescription Required (Rx Warning will trigger at POS counter)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 2. Packaging & Category Taxonomy Section */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-3 border-b border-subtle">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" />
            2. Packaging Units & Category Classification
          </CardTitle>
          <CardDescription className="text-secondary text-xs">
            Therapeutic category binding, dispensing base units, and standard selling pack conversion ratios.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Product Category"
              htmlFor="category-select"
              error={errors.categoryId?.message}
            >
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CategorySelect
                    id="category-select"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    error={Boolean(errors.categoryId)}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Base Dispensing Unit"
              htmlFor="base-unit"
              required
              error={errors.baseUnit?.message}
            >
              <Input
                id="base-unit"
                placeholder="e.g. Tablet, Capsule, Vial, Bottle"
                disabled={isSubmitting}
                error={Boolean(errors.baseUnit)}
                {...register("baseUnit")}
              />
            </FormField>

            <FormField
              label="Selling Pack Description"
              htmlFor="selling-unit"
              error={errors.sellingUnit?.message}
            >
              <Input
                id="selling-unit"
                placeholder="e.g. Strip of 10 Tablets, Box of 100"
                disabled={isSubmitting}
                error={Boolean(errors.sellingUnit)}
                {...register("sellingUnit")}
              />
            </FormField>

            <FormField
              label="Base Units per Selling Pack"
              htmlFor="units-per-selling-unit"
              required
              error={errors.unitsPerSellingUnit?.message}
            >
              <Input
                id="units-per-selling-unit"
                type="number"
                min="1"
                placeholder="10"
                disabled={isSubmitting}
                error={Boolean(errors.unitsPerSellingUnit)}
                {...register("unitsPerSellingUnit", { valueAsNumber: true })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* 3. Tax & Regulatory Compliance Section */}
      <Card className="shadow-card border-subtle">
        <CardHeader className="pb-3 border-b border-subtle">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Receipt className="h-4 w-4 text-success" />
            3. Tax & Regulatory Compliance
          </CardTitle>
          <CardDescription className="text-secondary text-xs">
            HSN code classification, GST tax slabs, and price taxation configuration.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="HSN Classification Code"
              htmlFor="hsn-code"
              error={errors.hsnCode?.message}
            >
              <Input
                id="hsn-code"
                placeholder="e.g. 3004 (Medicaments)"
                className="font-mono uppercase"
                disabled={isSubmitting}
                error={Boolean(errors.hsnCode)}
                {...register("hsnCode")}
              />
            </FormField>

            <FormField
              label="Applicable GST Tax Rate (%)"
              htmlFor="tax-rate"
              required
              error={errors.taxRate?.message}
            >
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="12.0"
                disabled={isSubmitting}
                error={Boolean(errors.taxRate)}
                {...register("taxRate", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isTaxInclusive"
              className="h-4 w-4 rounded border-strong bg-surface text-primary focus:ring-focus cursor-pointer"
              disabled={isSubmitting}
              {...register("isTaxInclusive")}
            />
            <label htmlFor="isTaxInclusive" className="text-xs text-primary cursor-pointer font-medium">
              Tax is inclusive in final selling price (standard pharmaceutical MRP)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 4. Product Identifiers (Barcodes / SKUs) on Creation */}
      {!isEditMode && (
        <Card className="shadow-card border-subtle">
          <CardHeader className="pb-3 border-b border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <BarcodeIcon className="h-4 w-4 text-warning" />
                  4. Initial Product Identifiers (Optional)
                </CardTitle>
                <CardDescription className="text-secondary text-xs mt-1">
                  Bind barcodes, EAN-13, or SKU codes for counter terminal scanning.
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ identifierType: "BARCODE", identifierValue: "", isPrimary: false })
                }
                leftIcon={<Plus className="h-3 w-3" />}
                className="h-7 text-xs"
              >
                Add Row
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-surface-muted rounded-md border border-subtle text-xs"
              >
                <div className="w-full sm:w-44">
                  <Select
                    disabled={isSubmitting}
                    className="text-xs"
                    {...register(`identifiers.${idx}.identifierType` as const)}
                  >
                    <option value="BARCODE">BARCODE</option>
                    <option value="SKU">SKU</option>
                    <option value="EAN_13">EAN-13</option>
                    <option value="UPC">UPC</option>
                    <option value="MANUFACTURER_CODE">MANUFACTURER</option>
                  </Select>
                </div>

                <div className="flex-1">
                  <Input
                    placeholder="Identifier value / barcode"
                    className="font-mono text-xs"
                    disabled={isSubmitting}
                    {...register(`identifiers.${idx}.identifierValue` as const)}
                  />
                </div>

                <div className="flex items-center gap-2 sm:px-2">
                  <input
                    type="checkbox"
                    id={`primary-${idx}`}
                    className="h-3.5 w-3.5 rounded border-strong bg-surface text-primary cursor-pointer"
                    disabled={isSubmitting}
                    {...register(`identifiers.${idx}.isPrimary` as const)}
                  />
                  <label htmlFor={`primary-${idx}`} className="text-[11px] text-secondary cursor-pointer">
                    Primary
                  </label>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(idx)}
                  className="h-8 px-2 text-danger hover:text-danger hover:bg-danger-subtle"
                  title="Remove row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-subtle shadow-card">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelClick}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isEditMode ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </div>
    </form>
  );
};
