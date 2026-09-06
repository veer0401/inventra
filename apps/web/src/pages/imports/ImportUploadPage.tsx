import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  UploadCloud,
  Download,
  Layers,
  Users,
  Building2,
  Boxes,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from "lucide-react";
import { importApi } from "../../services/importApi";
import { Card, Button, Alert, useToast, Spinner } from "@inventra/ui";
import type { ImportDomain, ImportJobResponse } from "@inventra/api-types";
import { useAuthStore } from "../../stores/authStore";

const DOMAINS: {
  id: ImportDomain;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresStore: boolean;
}[] = [
  {
    id: "PRODUCT_CATALOG",
    title: "Product Master Catalog",
    subtitle: "Medicines, formulations, GST & barcodes",
    description:
      "Bulk import brand medicines, clinical ingredients, dosage forms, strength, GST tax rates, and primary barcodes.",
    icon: Layers,
    requiresStore: false,
  },
  {
    id: "CUSTOMERS",
    title: "Customer Directory",
    subtitle: "Patients, contacts & GSTINs",
    description:
      "Bulk import retail customers, patient mobile numbers for SMS alerts, addresses, and B2B GSTIN profiles.",
    icon: Users,
    requiresStore: false,
  },
  {
    id: "SUPPLIERS",
    title: "Supplier Directory",
    subtitle: "Distributors, drug licenses & terms",
    description:
      "Bulk import pharmaceutical distributors, wholesale vendors, state drug licenses, and credit payment terms.",
    icon: Building2,
    requiresStore: false,
  },
  {
    id: "INVENTORY",
    title: "Opening Stock & Inventory",
    subtitle: "Initial batch intake & expiration dates",
    description:
      "Bulk intake opening inventory batches, batch codes, expiration dates, unit purchase costs, and retail MRPs.",
    icon: Boxes,
    requiresStore: true,
  },
];

export const ImportUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const memberships = useAuthStore((state) => state.memberships);
  const activeContext = useAuthStore((state) => state.activeContext);
  const stores = memberships[0]?.stores || [];

  const [selectedDomain, setSelectedDomain] = useState<ImportDomain>("PRODUCT_CATALOG");
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    activeContext?.storeId || stores[0]?.storeId || ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDomainConfig = DOMAINS.find((d) => d.id === selectedDomain)!;

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error("No file selected");
      const storeIdToPass = selectedDomainConfig.requiresStore ? selectedStoreId : undefined;
      return importApi.uploadImport(selectedFile, selectedDomain, storeIdToPass);
    },
    onSuccess: (data: ImportJobResponse) => {
      toast.success(`Import job created with ${data.totalRows} draft rows. Reviewing draft verification...`, "Ingestion Parsed");
      navigate(`/imports/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to upload and parse CSV";
      setErrorMessage(msg);
      toast.error(msg, "Upload Failed");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setErrorMessage("Please select a standard CSV (.csv) file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File size exceeds maximum limit of 10MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const metadata = await importApi.getTemplateMetadata(selectedDomain);
      const blob = new Blob([metadata.sampleCsvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${selectedDomain.toLowerCase()}_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Sample template for ${metadata.displayName} downloaded.`, "Template Downloaded");
    } catch (err: any) {
      toast.error("Failed to download CSV template metadata.", "Download Failed");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage("Please select a CSV file to upload.");
      return;
    }

    if (selectedDomainConfig.requiresStore && !selectedStoreId) {
      setErrorMessage("Please select an active destination branch store for inventory intake.");
      return;
    }

    uploadMutation.mutate();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/imports")} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Ingestion History</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Upload & Ingest CSV Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Zero Direct Mutation: CSV is parsed into draft records for human review before ledger commit
          </p>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Domain Selection Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Step 1: Select Ingestion Domain
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="gap-1.5 text-xs text-primary hover:text-primary"
            >
              {isDownloadingTemplate ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              <span>Download {selectedDomainConfig.title} Template</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === domain.id;
              return (
                <div
                  key={domain.id}
                  onClick={() => {
                    setSelectedDomain(domain.id);
                    setErrorMessage(null);
                  }}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer space-y-2 relative ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/80 bg-card hover:border-border hover:bg-muted/20"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{domain.title}</h4>
                      <p className="text-xs text-muted-foreground">{domain.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">{domain.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Store Selection (Conditional if Domain is Inventory) */}
        {selectedDomainConfig.requiresStore && (
          <Card className="p-5 space-y-3 border-l-4 border-l-purple-500">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Step 2: Select Branch Store Location
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Destination Store for Stock Intake <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.storeName} ({s.storeCode})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Opening stock items will be credited and allocated to this specific branch inventory ledger.
              </p>
            </div>
          </Card>
        )}

        {/* Step 3: Drag & Drop Dropzone */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {selectedDomainConfig.requiresStore ? "Step 3:" : "Step 2:"} Upload CSV File
          </h3>

          <Card className="p-8 border-2 border-dashed border-border/80 hover:border-primary/60 transition-colors text-center bg-card">
            <input
              type="file"
              id="csv-file-input"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <FileUp className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-base">
                  {selectedFile ? selectedFile.name : "Click to select or drag and drop CSV file"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready for ingestion`
                    : "Standard comma or semicolon separated CSV (Max 10MB / 50,000 rows)"}
                </p>
              </div>
              {selectedFile ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> File Selected
                </span>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-2 pointer-events-none">
                  Browse Files
                </Button>
              )}
            </label>
          </Card>
        </div>

        {/* Form Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/imports")}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!selectedFile || uploadMutation.isPending}
            className="gap-2 bg-primary text-primary-foreground shadow-sm px-6"
          >
            {uploadMutation.isPending && <Spinner className="h-4 w-4" />}
            <UploadCloud className="h-4 w-4" />
            <span>Upload & Inspect Drafts</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
