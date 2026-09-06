import React, { useState } from "react";
import { X, RefreshCw, AlertTriangle, CheckCircle, Clock, Database } from "lucide-react";
import type { OfflineOperation, SyncConflictRecord } from "@inventra/offline-storage";

interface SyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOperations: OfflineOperation[];
  conflicts: SyncConflictRecord[];
  isSyncing: boolean;
  lastSyncTime?: string;
  onTriggerSync: () => Promise<void>;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({
  isOpen,
  onClose,
  pendingOperations,
  conflicts,
  isSyncing,
  lastSyncTime,
  onTriggerSync,
}) => {
  const [activeTab, setActiveTab] = useState<"QUEUE" | "CONFLICTS">("QUEUE");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card text-foreground w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Sync & Offline Storage Center</h2>
              <p className="text-xs text-muted-foreground">
                Terminal Queue & Cloud Ledger Reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation & Status Summary */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-muted/20 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("QUEUE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "QUEUE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Offline Queue ({pendingOperations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("CONFLICTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "CONFLICTS"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflicts ({conflicts.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {lastSyncTime && (
              <span className="text-[11px] text-muted-foreground">
                Last: {new Date(lastSyncTime).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now (F10)"}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === "QUEUE" ? (
            pendingOperations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mb-2 opacity-80" />
                <h3 className="text-sm font-semibold">Queue is Clear</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                  All local transactions are durably synchronized with the cloud ledger.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingOperations.map((op) => (
                  <div
                    key={op.operationId}
                    className="p-3 rounded-lg border border-border bg-card/50 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">
                          #{op.deviceSequenceNumber}
                        </span>
                        <span className="font-semibold uppercase">{op.eventType}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            op.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {op.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        ID: {op.operationId.substring(0, 18)}... | SHA: {op.payloadChecksum.substring(0, 12)}...
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-muted-foreground">
                      <div>{new Date(op.createdAt).toLocaleTimeString()}</div>
                      {op.retryCount > 0 && <div>Retries: {op.retryCount}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            conflicts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mb-2 opacity-80" />
                <h3 className="text-sm font-semibold">No Sync Conflicts</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                  No inventory allocation or pricing discrepancies have occurred.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conflicts.map((conf) => (
                  <div
                    key={conf.conflictId}
                    className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{conf.errorCode}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {conf.conflictId}
                      </span>
                    </div>
                    <p className="text-foreground text-[11px]">{conf.errorMessage}</p>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Source Op: {conf.operationId} | {new Date(conf.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>Zero Direct Mutation Guaranteed</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
