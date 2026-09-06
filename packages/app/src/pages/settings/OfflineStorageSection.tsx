import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Alert,
  useToast,
} from "@inventra/ui";
import {
  Database,
  HardDrive,
  WifiOff,
  Wifi,
  RefreshCw,
  Play,
  Trash2,
  Terminal,
  CheckCircle2,
  Boxes,
  Users,
  Clock,
  Pill,
  Sparkles,
} from "lucide-react";
import {
  offlineStorageService,
  DriverInfo,
  StorageStats,
} from "../../services/offlineStorageService";
import { useAuthStore } from "../../stores/authStore";

export const OfflineStorageSection: React.FC = () => {
  const toast = useToast();
  const { activeContext } = useAuthStore();

  const [isDebugOffline, setIsDebugOffline] = useState(() =>
    offlineStorageService.isOfflineDebugMode()
  );
  const [driverInfo, setDriverInfo] = useState<DriverInfo>(() =>
    offlineStorageService.getDriverInfo()
  );
  const [stats, setStats] = useState<StorageStats>({
    productsCount: 0,
    batchesCount: 0,
    customersCount: 0,
    pendingOperationsCount: 0,
    lastSyncAt: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [queryOutput, setQueryOutput] = useState<string | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);

  const loadDiagnostics = useCallback(async () => {
    setIsLoading(true);
    try {
      await offlineStorageService.initialize();
      setDriverInfo(offlineStorageService.getDriverInfo());
      const newStats = await offlineStorageService.getStats();
      setStats(newStats);
    } catch (err) {
      toast.error("Failed to load local database diagnostics");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDiagnostics();

    const handleDebugChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setIsDebugOffline(customEvent.detail.enabled);
    };

    window.addEventListener("inventra_offline_debug_change", handleDebugChange);
    return () => {
      window.removeEventListener("inventra_offline_debug_change", handleDebugChange);
    };
  }, [loadDiagnostics]);

  const toggleDebugOffline = () => {
    const nextState = !isDebugOffline;
    offlineStorageService.setOfflineDebugMode(nextState);
    setIsDebugOffline(nextState);

    if (nextState) {
      toast.warning(
        "Station Isolated: Offline Storage Simulation mode active. Network HTTP calls to the backend are suppressed."
      );
    } else {
      toast.success("Normal Connectivity Resumed: Backend network calls re-enabled.");
    }
  };

  const handleSeedSampleData = async () => {
    setIsSeeding(true);
    try {
      await offlineStorageService.seedSampleData(
        activeContext?.businessId,
        activeContext?.storeId
      );
      toast.success("Sample offline medicine catalog & FEFO batches seeded successfully.");
      await loadDiagnostics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to seed sample catalog.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearLocalData = async () => {
    if (!window.confirm("Are you sure you want to purge local cache tables? Offline pending queues will be cleared.")) {
      return;
    }
    setIsClearing(true);
    try {
      await offlineStorageService.clearLocalData();
      toast.info("Local SQLite cache tables purged.");
      setQueryOutput(null);
      await loadDiagnostics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clear local cache.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleExecuteTestQuery = async () => {
    setIsExecutingQuery(true);
    try {
      const rows = await offlineStorageService.executeTestQuery(
        "SELECT id, name, generic_name, selling_price, mrp, current_stock FROM cache_products LIMIT 6;"
      );
      setQueryOutput(JSON.stringify(rows, null, 2));
      toast.success(`Query returned ${rows.length} record(s).`);
    } catch (err: unknown) {
      setQueryOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
      toast.error("Diagnostic query failed.");
    } finally {
      setIsExecutingQuery(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in-50 duration-200">
      {/* 1. Station Isolation Debugging Switch Card */}
      <Card
        className={`border transition-all ${
          isDebugOffline
            ? "border-amber-500/50 bg-amber-500/[0.03] shadow-md shadow-amber-500/5"
            : "border-subtle shadow-card"
        }`}
      >
        <CardHeader className="pb-3 border-b border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Station Isolation & Offline Debugging
                </CardTitle>
                <Badge
                  variant={isDebugOffline ? "warning" : "outline"}
                  className="font-mono text-[11px] uppercase tracking-wider"
                >
                  {isDebugOffline ? "Simulated Offline" : "Live Backend"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-secondary max-w-2xl">
                Simulate an isolated, fully offline workstation for testing and debugging. When enabled,
                outbound HTTP requests to the backend server are suppressed without making network calls.
              </CardDescription>
            </div>

            {/* Prominent Toggle Control */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-medium text-secondary">
                {isDebugOffline ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                    <WifiOff className="h-3.5 w-3.5" />
                    Isolated Station
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5" />
                    Connected
                  </span>
                )}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDebugOffline}
                onClick={toggleDebugOffline}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isDebugOffline ? "bg-amber-500" : "bg-muted hover:bg-neutral-400 dark:hover:bg-neutral-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isDebugOffline ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-3 text-xs">
          {isDebugOffline ? (
            <Alert variant="warning" title="Station Isolation Active">
              The application will <strong>not make any HTTP network calls to the backend</strong>. All
              authentication restores, catalog searches, and billing flows will execute against the local
              embedded SQLite cache.
            </Alert>
          ) : (
            <div className="text-xs text-secondary bg-surface-muted p-3 rounded-lg border border-subtle flex items-center justify-between">
              <span>
                Standard cloud synchronization active. Changes queue locally during internet downtime and
                reconcile automatically when reconnected.
              </span>
              <span className="font-mono text-[11px] text-muted shrink-0 ml-2">port 8081</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Embedded Database & Driver Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-subtle shadow-card">
          <CardHeader className="pb-3 border-b border-subtle">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              Local Storage Driver & Engine
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              Relational database layer powering offline POS transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-subtle">
              <span className="text-secondary font-medium">Driver Implementation</span>
              <Badge variant="default" className="font-mono text-[11px]">
                {driverInfo.driverName}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-subtle">
              <span className="text-secondary font-medium">Database Target File</span>
              <span className="font-mono text-[11px] text-primary bg-surface-muted px-2 py-0.5 rounded border border-subtle">
                {driverInfo.dbPath}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-subtle">
              <span className="text-secondary font-medium">Runtime Environment</span>
              <span className="font-semibold text-primary">
                {driverInfo.isTauri ? "Tauri Desktop App (Native Rust IPC)" : "Web Browser (Virtual Simulation)"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-secondary font-medium">Schema Migration State</span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Ready ({driverInfo.schemaVersion})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Operational Queue & Sync Telemetry */}
        <Card className="border-subtle shadow-card">
          <CardHeader className="pb-3 border-b border-subtle">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Sync Telemetry & Workstation Cache
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              Terminal ledger status and queue metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-subtle">
              <span className="text-secondary font-medium">Pending Offline Operations</span>
              <Badge
                variant={stats.pendingOperationsCount > 0 ? "warning" : "outline"}
                className="font-mono text-[11px]"
              >
                {stats.pendingOperationsCount} transactions
              </Badge>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-subtle">
              <span className="text-secondary font-medium">Last Cloud Reconciliation</span>
              <span className="font-mono text-[11px] text-primary">
                {stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleString() : "Never synced"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-subtle">
              <span className="text-secondary font-medium">Persistent Login Session</span>
              <Badge variant="success" className="font-mono text-[10px]">
                ENABLED (REUSED)
              </Badge>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-secondary font-medium">FEFO Enforcement</span>
              <span className="text-primary font-medium">Active (Local Indexed Sorting)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Local Record Metrics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-subtle bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary">Products Cache</span>
            <Pill className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-primary">
            {stats.productsCount}
          </div>
          <div className="text-[10px] text-muted mt-1">cache_products table</div>
        </Card>

        <Card className="border-subtle bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary">Batches (FEFO Lots)</span>
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-primary">
            {stats.batchesCount}
          </div>
          <div className="text-[10px] text-muted mt-1">cache_batches table</div>
        </Card>

        <Card className="border-subtle bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary">Cached Customers</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-primary">
            {stats.customersCount}
          </div>
          <div className="text-[10px] text-muted mt-1">cache_customers table</div>
        </Card>

        <Card className="border-subtle bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary">Pending Sync Queue</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {stats.pendingOperationsCount}
          </div>
          <div className="text-[10px] text-muted mt-1">offline_operations table</div>
        </Card>
      </div>

      {/* 5. Diagnostic Actions & Interactive SQLite Inspector */}
      <Card className="border-subtle shadow-card">
        <CardHeader className="pb-3 border-b border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Local Database Diagnostic Actions
              </CardTitle>
              <CardDescription className="text-xs text-secondary">
                Seed sample medicine data, execute verification queries, or purge local tables for testing.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadDiagnostics}
              disabled={isLoading}
              className="text-xs shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Metrics
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSeedSampleData}
              disabled={isSeeding}
              className="text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {isSeeding ? "Seeding Catalog..." : "Seed Sample Offline Catalog"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExecuteTestQuery}
              disabled={isExecutingQuery}
              className="text-xs"
            >
              <Play className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {isExecutingQuery ? "Executing Query..." : "Execute Test Query (Products)"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClearLocalData}
              disabled={isClearing}
              className="text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {isClearing ? "Purging Cache..." : "Purge Local DB Cache"}
            </Button>
          </div>

          {/* Terminal Query Output Display */}
          {queryOutput && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-secondary">
                <span>SQL Output Preview (SELECT * FROM cache_products LIMIT 6)</span>
                <button
                  type="button"
                  onClick={() => setQueryOutput(null)}
                  className="text-muted hover:text-primary transition-colors text-[10px]"
                >
                  Clear Output
                </button>
              </div>
              <pre className="p-3 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-lg border border-neutral-800 overflow-x-auto max-h-60 shadow-inner">
                {queryOutput}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
