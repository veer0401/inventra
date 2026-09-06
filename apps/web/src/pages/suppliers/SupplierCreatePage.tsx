import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Select,
  FormField,
  Alert,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";
import type { CreateSupplierRequest, SupplierType } from "@inventra/api-types";
import { Building2, ArrowLeft, AlertCircle, Save } from "lucide-react";

const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "MANUFACTURER", label: "Manufacturer" },
  { value: "WHOLESALER", label: "Wholesaler" },
  { value: "IMPORTER", label: "Importer" },
  { value: "OTHER", label: "Other" },
];

export const SupplierCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;

  const [supplierCode, setSupplierCode] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [supplierType, setSupplierType] = useState<SupplierType>("DISTRIBUTOR");
  const [gstin, setGstin] = useState("");
  const [drugLicenseNumber, setDrugLicenseNumber] = useState("");
  const [pan, setPan] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("30");
  const [creditLimit, setCreditLimit] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (req: CreateSupplierRequest) => {
      return purchasingApi.createSupplier(req);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", businessId] });
      navigate(`/suppliers/${data.id}`);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to register supplier. Please check required fields.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!supplierCode.trim()) {
      setErrorMessage("Supplier code is required.");
      return;
    }
    if (!legalName.trim()) {
      setErrorMessage("Legal name is required.");
      return;
    }

    const payload: CreateSupplierRequest = {
      supplierCode: supplierCode.trim(),
      legalName: legalName.trim(),
      tradeName: tradeName.trim() || undefined,
      supplierType,
      gstin: gstin.trim() || undefined,
      drugLicenseNumber: drugLicenseNumber.trim() || undefined,
      pan: pan.trim() || undefined,
      contactPersonName: contactPersonName.trim() || undefined,
      email: email.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays, 10) : 0,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      addressLine1: addressLine1.trim() || undefined,
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-subtle">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Suppliers
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
          Register New Supplier
        </h1>
        <p className="text-xs text-secondary">
          Add vendor credentials, GSTIN tax identifiers, and credit terms for{" "}
          <strong className="text-primary">{activeContext?.businessName}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <Alert variant="danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </Alert>
        )}

        {/* Section 1: Identification */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Supplier Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Supplier Code" required helperText="Unique vendor code (e.g. SUP-001)">
              <Input
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                placeholder="SUP-001"
                required
                className="font-mono"
              />
            </FormField>

            <FormField label="Supplier Type" required>
              <Select
                value={supplierType}
                onChange={(e) => setSupplierType(e.target.value as SupplierType)}
                className="w-full"
              >
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Legal Name" required helperText="Registered company or firm name">
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Cipla Pharmaceuticals Ltd"
                required
              />
            </FormField>

            <FormField label="Trade / Doing-Business-As Name">
              <Input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Cipla Health"
              />
            </FormField>
          </div>
        </Card>

        {/* Section 2: Regulatory & Tax */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Regulatory & Tax Identifiers
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="GSTIN" helperText="15-digit GST Identifier">
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="29AABCC1234D1Z5"
                maxLength={20}
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="Drug License Number" helperText="State Pharmacy DL Number">
              <Input
                value={drugLicenseNumber}
                onChange={(e) => setDrugLicenseNumber(e.target.value)}
                placeholder="DL-KA-2024-9988"
                maxLength={100}
                className="font-mono"
              />
            </FormField>

            <FormField label="PAN" helperText="10-character Tax PAN">
              <Input
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="AABCC1234D"
                maxLength={20}
                className="font-mono uppercase"
              />
            </FormField>
          </div>
        </Card>

        {/* Section 3: Contact & Credit Terms */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Contact & Commercial Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Contact Person Name">
              <Input
                value={contactPersonName}
                onChange={(e) => setContactPersonName(e.target.value)}
                placeholder="Rajesh Sharma"
              />
            </FormField>

            <FormField label="Email Address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@cipla.com"
              />
            </FormField>

            <FormField label="Phone Number">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
              />
            </FormField>

            <FormField label="Payment Terms (Days)" helperText="Credit window in calendar days">
              <Input
                type="number"
                min="0"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                placeholder="30"
                className="font-mono"
              />
            </FormField>

            <FormField label="Credit Limit (₹)" helperText="Approved credit line">
              <Input
                type="number"
                step="any"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="500000"
                className="font-mono"
              />
            </FormField>
          </div>
        </Card>

        {/* Section 4: Address */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Physical Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Address Line 1">
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Plot 45, Peenya Industrial Area, Phase 1"
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Address Line 2">
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Near Metro Station"
                />
              </FormField>
            </div>

            <FormField label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
            </FormField>

            <FormField label="State">
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Karnataka" />
            </FormField>

            <FormField label="Postal Code">
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="560058"
                className="font-mono"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Additional Notes">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Lead vendor for vaccines"
                />
              </FormField>
            </div>
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle">
          <Link to="/suppliers">
            <Button type="button" variant="outline" disabled={mutation.isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={mutation.isPending || !supplierCode.trim() || !legalName.trim()}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save Supplier
          </Button>
        </div>
      </form>
    </div>
  );
};
