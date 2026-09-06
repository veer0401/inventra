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
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Monitor,
  ShieldCheck,
  RefreshCw,
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { sessionApi, type UserSession } from "../../services/sessionApi";

export const SessionsSection: React.FC = () => {
  const toast = useToast();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sessionApi.listSessions();
      // Keep only active sessions; revoked sessions must not appear in UI
      setSessions((data || []).filter((s) => s.active));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load active sessions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSingle = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await sessionApi.revokeSession(sessionId);
      toast.success("Session successfully revoked.");
      // Immediately remove the revoked session from the UI
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      await sessionApi.revokeOtherSessions();
      toast.success("All other active sessions have been revoked.");
      // Immediately remove all other non-current sessions from the UI
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke all sessions.");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    } catch {
      return "Recently";
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    const type = (deviceType || "").toLowerCase();
    if (type.includes("mobile") || type.includes("phone") || type.includes("android") || type.includes("iphone")) {
      return <Smartphone className="h-5 w-5 text-indigo-500" />;
    }
    if (type.includes("tablet") || type.includes("ipad")) {
      return <Tablet className="h-5 w-5 text-purple-500" />;
    }
    if (type.includes("laptop")) {
      return <Laptop className="h-5 w-5 text-emerald-500" />;
    }
    if (type.includes("desktop") || type.includes("workstation")) {
      return <Monitor className="h-5 w-5 text-emerald-500" />;
    }
    return <Globe className="h-5 w-5 text-blue-500" />;
  };

  const otherSessionsCount = sessions.filter((s) => !s.current).length;

  return (
    <Card className="shadow-card border-subtle">
      <CardHeader className="pb-3 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Active Sessions & Login Locations</span>
            <Badge variant="accent" className="font-mono text-[10px]">
              {sessions.length} {sessions.length === 1 ? "Active" : "Active"}
            </Badge>
          </CardTitle>
          <CardDescription className="text-secondary text-xs">
            Distinct devices and network locations currently signed in to your account.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSessions}
            isLoading={isLoading}
            className="text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {otherSessionsCount > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRevokeAll}
              isLoading={isRevokingAll}
              className="text-xs shrink-0"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Revoke All Others ({otherSessionsCount})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {error && (
          <Alert variant="danger" title="Error Loading Sessions">
            {error}
          </Alert>
        )}

        {isLoading && sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Retrieving active workstations...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No active sessions recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3.5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  session.current
                    ? "bg-primary-subtle/30 border-primary/40 shadow-xs"
                    : "bg-surface-muted/40 border-subtle hover:border-subtle-hover"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-surface border border-subtle shrink-0 shadow-xs mt-0.5 sm:mt-0">
                    {getDeviceIcon(session.deviceType)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-primary">
                        {session.browser} on {session.operatingSystem}
                      </span>

                      {session.current ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          This Workstation
                        </span>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-[9px]">
                          REMOTE
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-x-4 gap-y-1 text-xs text-secondary flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Globe className="h-3 w-3 text-muted" />
                        {session.ipAddress}
                      </span>

                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="h-3 w-3 text-muted" />
                        {session.location}
                      </span>

                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Clock className="h-3 w-3 text-muted" />
                        Active {formatRelativeTime(session.lastActiveAt || session.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-subtle">
                  {session.current ? (
                    <span className="text-xs text-muted font-medium px-2 py-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Current Workstation
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSingle(session.id)}
                      isLoading={revokingId === session.id}
                      className="text-xs hover:bg-danger-subtle hover:text-danger hover:border-danger/30"
                    >
                      Revoke Access
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-surface-muted/50 rounded-lg border border-subtle text-[11px] text-secondary flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            Sessions are grouped per physical machine and network IP. Revoking an untrusted session immediately terminates all tokens for that client and removes it.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
