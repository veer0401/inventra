import React, { useState, useEffect } from "react";
import { X, User, Phone, Mail, MapPin, FileText, AlertCircle, Save, Loader2 } from "lucide-react";
import { createCustomerSchema, updateCustomerSchema } from "@inventra/validation";
import { customerApi } from "../../services/customerApi";
import { Select } from "@inventra/ui";
import type { CustomerResponse, CustomerStatus } from "@inventra/api-types";

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: CustomerResponse) => void;
  customer?: CustomerResponse | null; // If provided, edit mode
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer,
}) => {
  const isEdit = Boolean(customer);

  const [customerCode, setCustomerCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("ACTIVE");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setCustomerCode(customer.customerCode || "");
        setFullName(customer.fullName || "");
        setPhone(customer.phone || "");
        setEmail(customer.email || "");
        setAddress(customer.address || "");
        setGstin(customer.gstin || "");
        setNotes(customer.notes || "");
        setStatus(customer.status || "ACTIVE");
      } else {
        setCustomerCode("");
        setFullName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setGstin("");
        setNotes("");
        setStatus("ACTIVE");
      }
      setErrors({});
      setServerError(null);
      setIsDirty(false);
    }
  }, [isOpen, customer]);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<any>>) => (val: any) => {
    setter(val);
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
      return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const rawData = {
      customerCode: customerCode.trim() || undefined,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gstin.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    };

    const schema = isEdit ? updateCustomerSchema : createCustomerSchema;
    const parseResult = schema.safeParse(rawData);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      let result: CustomerResponse;
      if (isEdit && customer) {
        result = await customerApi.updateCustomer(customer.id, {
          fullName: rawData.fullName,
          phone: rawData.phone,
          email: rawData.email,
          address: rawData.address,
          gstin: rawData.gstin,
          notes: rawData.notes,
          status: rawData.status,
        });
      } else {
        result = await customerApi.createCustomer({
          customerCode: rawData.customerCode,
          fullName: rawData.fullName,
          phone: rawData.phone,
          email: rawData.email,
          address: rawData.address,
          gstin: rawData.gstin,
          notes: rawData.notes,
        });
      }
      setIsDirty(false);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save customer record";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-form-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl transition-all my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 id="customer-form-modal-title" className="text-lg font-semibold text-text-primary">
                {isEdit ? "Edit Customer Profile" : "Register New Customer"}
              </h2>
              <p className="text-xs text-text-muted">
                {isEdit ? "Update patient contact or billing credentials" : "Create a new customer profile for POS billing"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-fg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identity Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Identity</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Full Name <span className="text-destructive-fg">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={fullName}
                  onChange={(e) => handleChange(setFullName)(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.fullName ? "border-destructive-border" : "border-border"
                  }`}
                />
                {errors.fullName && <p className="mt-1 text-xs text-destructive-fg">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Customer Code <span className="text-text-muted text-[10px]">(Optional, auto-generated)</span>
                </label>
                <input
                  type="text"
                  disabled={isEdit}
                  value={customerCode}
                  onChange={(e) => handleChange(setCustomerCode)(e.target.value)}
                  placeholder="e.g. CUST-000124"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:bg-surface-subtle"
                />
                {errors.customerCode && <p className="mt-1 text-xs text-destructive-fg">{errors.customerCode}</p>}
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Contact Information</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Mobile Phone Number <span className="text-destructive-fg">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => handleChange(setPhone)(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={`w-full rounded-lg border bg-surface pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.phone ? "border-destructive-border" : "border-border"
                    }`}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-destructive-fg">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleChange(setEmail)(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className={`w-full rounded-lg border bg-surface pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.email ? "border-destructive-border" : "border-border"
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-destructive-fg">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Billing & Tax Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Billing & Tax</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Billing / Residential Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => handleChange(setAddress)(e.target.value)}
                    placeholder="e.g. 42 MG Road, Sector 4, Mumbai"
                    className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">GSTIN (B2B)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => handleChange(setGstin)(e.target.value.toUpperCase())}
                  placeholder="27AAAAA0000A1Z5"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Notes & Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Additional Information</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={isEdit ? "sm:col-span-2" : "sm:col-span-3"}>
                <label className="block text-xs font-medium text-text-secondary mb-1">Dispensing / Account Notes</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => handleChange(setNotes)(e.target.value)}
                    placeholder="Allergies, preferences, prescription notes..."
                    className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {isEdit && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Account Status</label>
                  <Select
                    value={status}
                    onChange={(e) => handleChange(setStatus)(e.target.value as CustomerStatus)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isEdit ? "Update Profile" : "Create Customer"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
