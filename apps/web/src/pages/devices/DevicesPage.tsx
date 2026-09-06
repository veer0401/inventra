import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smartphone,
  Plus,
  RefreshCw,
  Search,
  Monitor,
  ShieldAlert,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { deviceApi } from "../../services/deviceApi";
import { DeviceStatusBadge, Button, Card, Input, Alert, useToast, Spinner, Dialog } from "@inventra/ui";
import type { DeviceResponse, RegisterDeviceRequest, DeviceType } from "@inventra/api-types";

const DEVICE_TYPES: { label: string; value: DeviceType }[] = [
  { label: "Desktop Workstation (Windows/Mac)", value: "DESKTOP" },
  { label: "Android Mobile / Tablet", value: "MOBILE_ANDROID" },
  { label: "iOS Mobile / Tablet", value: "MOBILE_IOS" },
  { label: "Web Browser Terminal", value: "BROWSER" },
];

export const DevicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [showRegisterModal, setShowRegisterModal] = React.useState<boolean>(false);
  const [deviceToRevoke, setDeviceToRevoke] = React.useState<DeviceResponse | null>(null);

  // Form State for registration
  const [deviceCode, setDeviceCode] = React.useState("");
  const [deviceName, setDeviceName] = React.useState("");
  const [deviceType, setDeviceType] = React.useState<DeviceType>("DESKTOP");
  const [platformOs, setPlatformOs] = React.useState("Windows 11");
  const [appVersion, setAppVersion] = React.useState("1.0.0");

  const { data: devices = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceApi.listDevices(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  // Register Device Mutation
  const registerMutation = useMutation({
    mutationFn: (req: RegisterDeviceRequest) => deviceApi.registerDevice(req),
    onSuccess: (data) => {
      invalidate();
      setShowRegisterModal(false);
      resetForm();
      toast.success(`Device ${data.deviceCode} has been authorized for POS operations.`, "Device Registered");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Registration Failed");
    },
  });

  // Revoke Device Mutation
  const revokeMutation = useMutation({
    mutationFn: (id: string) => deviceApi.revokeDevice(id),
    onSuccess: (data) => {
      invalidate();
      setDeviceToRevoke(null);
      toast.info(`Device ${data.deviceCode} access revoked immediately.`, "Device Revoked");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Revocation Failed");
    },
  });

  const resetForm = () => {
    setDeviceCode("");
    setDeviceName("");
    setDeviceType("DESKTOP");
    setPlatformOs("Windows 11");
    setAppVersion("1.0.0");
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: RegisterDeviceRequest = {
      deviceCode: deviceCode.trim().toUpperCase(),
      deviceName: deviceName.trim(),
      deviceType,
      platformOs: platformOs.trim() || undefined,
      appVersion: appVersion.trim() || undefined,
    };

    registerMutation.mutate(payload);
  };

  const filteredDevices = React.useMemo(() => {
    if (!searchQuery.trim()) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) =>
        d.deviceCode.toLowerCase().includes(q) ||
        d.deviceName.toLowerCase().includes(q) ||
        d.deviceType.toLowerCase().includes(q)
    );
  }, [devices, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Registered Hardware Devices
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage authorized POS terminals, tablets, and counter workstations per retail branch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button onClick={() => setShowRegisterModal(true)} size="sm" className="gap-1.5 bg-primary text-primary-foreground shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Register Device</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by device code, name, platform..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading registered devices...</p>
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/30 bg-destructive/5 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground">Failed to Load Devices</h3>
          <p className="text-sm text-muted-foreground">There was an error communicating with the device registry.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : filteredDevices.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
            <Monitor className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No Registered Devices</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Register hardware terminals and checkout counter devices to allow authenticated POS transactions.
          </p>
          <Button size="sm" onClick={() => setShowRegisterModal(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            <span>Register First Device</span>
          </Button>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border/80 uppercase">
              <tr>
                <th className="py-3 px-4">Device Code</th>
                <th className="py-3 px-4">Device Name</th>
                <th className="py-3 px-4">Platform Type</th>
                <th className="py-3 px-4">OS / Version</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-muted/20">
                  <td className="py-3.5 px-4 font-mono font-bold text-foreground flex items-center gap-1.5">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span>{device.deviceCode}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-foreground">{device.deviceName}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                    {device.deviceType.replace("_", " ")}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    {device.platformOs || "Unknown OS"} {device.appVersion ? `(v${device.appVersion})` : ""}
                  </td>
                  <td className="py-3.5 px-4">
                    <DeviceStatusBadge status={device.status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(device.registeredAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {device.status !== "REVOKED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeviceToRevoke(device)}
                        className="text-destructive hover:bg-destructive/10 text-xs h-8"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Device Modal */}
      {showRegisterModal && (
        <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span>Register Hardware Terminal</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Authorize a new counter device for offline token issuance and POS transactions.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Device Code <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. POS-TERM-01"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  className="font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Device Name <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. Counter 1 Touch Terminal"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Device Type <span className="text-destructive">*</span></label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                  className="w-full h-9 px-3 py-1 rounded-md border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DEVICE_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Platform OS</label>
                <Input
                  placeholder="e.g. Windows 11 / Android 14"
                  value={platformOs}
                  onChange={(e) => setPlatformOs(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Client App Version</label>
                <Input
                  placeholder="e.g. 1.0.0"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRegisterModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={registerMutation.isPending} className="bg-primary text-primary-foreground">
                {registerMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Authorize Device
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Revoke Confirmation Modal */}
      {deviceToRevoke && (
        <Dialog open={!!deviceToRevoke} onOpenChange={() => setDeviceToRevoke(null)}>
          <div className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg">
            <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <span>Revoke Device Authorization</span>
            </h3>
            <Alert variant="danger" className="text-xs">
              Revoking device <strong>{deviceToRevoke.deviceCode}</strong> will immediately terminate its offline sessions, invalidate synchronization tokens, and block any future POS transactions from this device.
            </Alert>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to revoke <strong>{deviceToRevoke.deviceName}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeviceToRevoke(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(deviceToRevoke.id)}
              >
                {revokeMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Immediate Revocation
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
