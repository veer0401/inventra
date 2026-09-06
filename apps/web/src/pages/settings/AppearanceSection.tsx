import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  FormField,
  Badge,
  StatusBadge,
  Alert,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  TableCellMono,
} from "@inventra/ui";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
} from "lucide-react";
import {
  useThemeStore,
  type ThemeMode,
} from "../../stores/themeStore";
import {
  themePresets,
  type PresetDefinition,
  getContrastRatio,
} from "@inventra/design-tokens";

export const AppearanceSection: React.FC = () => {
  const {
    mode,
    preset,
    density,
    customPrimary,
    customAccent,
    isDark,
    resolvedTokens,
    setMode,
    setPreset,
    setDensity,
    setCustomColors,
    setCustomPrimary,
    setCustomAccent,
    resetToDefaults,
  } = useThemeStore();

  const [inputPrimary, setInputPrimary] = useState(customPrimary || "#0F766E");
  const [inputAccent, setInputAccent] = useState(customAccent || "#4F46E5");

  // Keep local inputs synchronized with store state
  useEffect(() => {
    if (customPrimary) setInputPrimary(customPrimary);
    if (customAccent) setInputAccent(customAccent);
  }, [customPrimary, customAccent]);

  const modeOptions: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "System Sync", icon: <Monitor className="h-4 w-4" /> },
    { id: "light", label: "Light Mode", icon: <Sun className="h-4 w-4" /> },
    { id: "dark", label: "Dark Mode", icon: <Moon className="h-4 w-4" /> },
  ];

  const presetList: PresetDefinition[] = Object.values(themePresets);

  const activePrimary = preset === "custom" ? (customPrimary || inputPrimary) : themePresets[preset].primaryColor;
  const activeAccent = preset === "custom" ? (customAccent || inputAccent) : themePresets[preset].accentColor;

  const primaryContrastRatio = getContrastRatio(
    activePrimary,
    isDark ? "#0B0F17" : "#FFFFFF"
  );
  const accentContrastRatio = getContrastRatio(
    activeAccent,
    isDark ? "#0B0F17" : "#FFFFFF"
  );

  const normalizeHex = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith("#")) clean = "#" + clean;
    return clean;
  };

  const handlePrimaryChange = (val: string) => {
    setInputPrimary(val);
    const normalized = normalizeHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      setCustomPrimary(normalized);
    }
  };

  const handleAccentChange = (val: string) => {
    setInputAccent(val);
    const normalized = normalizeHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      setCustomAccent(normalized);
    }
  };

  const handleApplyCustom = () => {
    const normPrimary = normalizeHex(inputPrimary);
    const normAccent = normalizeHex(inputAccent);
    setCustomColors(
      /^#[0-9A-Fa-f]{6}$/.test(normPrimary) ? normPrimary : undefined,
      /^#[0-9A-Fa-f]{6}$/.test(normAccent) ? normAccent : undefined
    );
  };

  return (
    <Card className="shadow-card border-subtle">
      <CardHeader className="pb-3 border-b border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Appearance & Workstation Theme
            </CardTitle>
            <CardDescription className="text-xs text-secondary mt-0.5">
              Customize visual contrast, color harmony, and layout density for your workstation.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            leftIcon={<RotateCcw className="h-3 w-3" />}
            className="text-xs"
          >
            Reset Defaults
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* 1. Theme Mode (System / Light / Dark) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-primary block">
            Theme Mode
          </label>
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {modeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`p-2.5 rounded-md border text-xs flex items-center justify-center gap-2 font-medium transition-all ${
                  mode === opt.id
                    ? "bg-primary-subtle border-primary text-primary ring-1 ring-primary font-bold"
                    : "bg-surface border-strong text-secondary hover:bg-surface-muted"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Theme Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-primary block">
            Curated Color Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {presetList.map((p) => {
              const previewPrimary = p.id === "custom" && customPrimary ? customPrimary : p.primaryColor;
              const previewAccent = p.id === "custom" && customAccent ? customAccent : p.accentColor;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`p-3 rounded-md border text-left text-xs transition-all relative ${
                    preset === p.id
                      ? "bg-surface border-primary ring-2 ring-primary shadow-xs"
                      : "bg-surface border-subtle hover:border-strong hover:bg-surface-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 z-10"
                          style={{ backgroundColor: previewPrimary }}
                          title="Primary Brand"
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: previewAccent }}
                          title="Accent / Focus"
                        />
                      </div>
                      <span className="font-semibold text-primary">{p.name}</span>
                    </div>
                    {preset === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-secondary mt-1 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Custom Color Controls (when custom preset selected) */}
        {preset === "custom" && (
          <div className="p-4 rounded-lg border border-primary bg-primary-subtle/30 space-y-4 animate-in fade-in-0 duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                Custom Color Palette Controls
              </h4>
              <div className="flex items-center gap-3 text-[11px] font-mono text-secondary">
                <span>
                  Primary: <strong>{primaryContrastRatio.toFixed(1)}:1</strong>{" "}
                  {primaryContrastRatio >= 4.5 ? "✓ AA Pass" : "⚠ Low"}
                </span>
                <span>•</span>
                <span>
                  Accent: <strong>{accentContrastRatio.toFixed(1)}:1</strong>{" "}
                  {accentContrastRatio >= 4.5 ? "✓ AA Pass" : "⚠ Low"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Primary Brand Hue" htmlFor="custom-primary">
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    id="custom-primary"
                    value={inputPrimary}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                    className="h-9 w-10 p-0.5 rounded border border-strong bg-surface cursor-pointer shrink-0"
                    title="Choose primary brand color"
                  />
                  <Input
                    value={inputPrimary}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                    placeholder="#0F766E"
                    className="font-mono uppercase text-xs"
                  />
                </div>
              </FormField>

              <FormField label="Accent / Focus Hue" htmlFor="custom-accent">
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    id="custom-accent"
                    value={inputAccent}
                    onChange={(e) => handleAccentChange(e.target.value)}
                    className="h-9 w-10 p-0.5 rounded border border-strong bg-surface cursor-pointer shrink-0"
                    title="Choose accent and focus indicator color"
                  />
                  <Input
                    value={inputAccent}
                    onChange={(e) => handleAccentChange(e.target.value)}
                    placeholder="#4F46E5"
                    className="font-mono uppercase text-xs"
                  />
                </div>
              </FormField>
            </div>

            {/* Derived Color Swatches Diagnostic Preview */}
            <div className="pt-2 border-t border-primary/20 space-y-2">
              <div className="text-[11px] font-semibold text-primary">
                Active Runtime Token Derivatives:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded border border-primary-border bg-primary-subtle text-primary flex items-center justify-between">
                  <span>Primary Subtle</span>
                  <span className="w-3 h-3 rounded bg-primary" />
                </div>
                <div className="p-2 rounded border border-primary bg-primary text-primary-fg flex items-center justify-between">
                  <span>Primary Base</span>
                  <span className="w-3 h-3 rounded bg-primary-hover" />
                </div>
                <div className="p-2 rounded border border-accent-border bg-accent-subtle text-accent flex items-center justify-between">
                  <span>Accent Subtle</span>
                  <span className="w-3 h-3 rounded bg-accent" />
                </div>
                <div className="p-2 rounded border border-accent bg-accent text-accent-fg flex items-center justify-between">
                  <span>Accent Base</span>
                  <span className="w-3 h-3 rounded bg-accent-hover" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApplyCustom}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                Apply Custom Palette
              </Button>
            </div>
          </div>
        )}

        {/* 4. Density Modes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-primary block">
            Workspace Layout Density
          </label>
          <div className="grid grid-cols-2 gap-2 max-w-md">
            <button
              type="button"
              onClick={() => setDensity("comfortable")}
              className={`p-2.5 rounded-md border text-xs text-center font-medium transition-all ${
                density === "comfortable"
                  ? "bg-primary-subtle border-primary text-primary ring-1 ring-primary font-bold"
                  : "bg-surface border-strong text-secondary hover:bg-surface-muted"
              }`}
            >
              <span className="block font-semibold">Comfortable</span>
              <span className="text-[10px] text-secondary">44px standard table rows</span>
            </button>

            <button
              type="button"
              onClick={() => setDensity("compact")}
              className={`p-2.5 rounded-md border text-xs text-center font-medium transition-all ${
                density === "compact"
                  ? "bg-primary-subtle border-primary text-primary ring-1 ring-primary font-bold"
                  : "bg-surface border-strong text-secondary hover:bg-surface-muted"
              }`}
            >
              <span className="block font-semibold">Compact (High-Throughput)</span>
              <span className="text-[10px] text-secondary">32px dense POS & inventory rows</span>
            </button>
          </div>
        </div>

        {/* 5. Live Theme Preview with Real UI Components */}
        <div className="space-y-3 pt-2 border-t border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live Theme Preview (Real UI Primitives)
            </label>
            <span className="text-[10px] font-mono text-muted">
              Active: {preset.toUpperCase()} • {isDark ? "DARK" : "LIGHT"} • {density.toUpperCase()}
            </span>
          </div>

          <div className="p-4 rounded-lg border border-subtle bg-surface space-y-4 shadow-sm">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm">Primary Action</Button>
              <Button variant="accent" size="sm">Focus Accent</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="destructive" size="sm">Destructive</Button>
              <Button variant="outline" size="sm">Outline</Button>
            </div>

            {/* Badges Preview */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Primary Badge</Badge>
              <Badge variant="accent">Accent / Focus Badge</Badge>
              <StatusBadge status="ACTIVE" />
              <StatusBadge status="RX_REQUIRED" />
              <StatusBadge status="DISCONTINUED" />
              <StatusBadge status="PENDING_REVIEW" />
            </div>

            {/* Input & Form Control Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Focus here to preview interactive focus ring..." />
              <div className="flex items-center gap-2 text-xs text-secondary font-mono">
                <span>Focus Indicator:</span>
                <span
                  className="px-2 py-0.5 rounded border border-focus bg-surface text-primary"
                  style={{ outlineColor: resolvedTokens.borderFocus }}
                >
                  {resolvedTokens.borderFocus}
                </span>
              </div>
            </div>

            {/* Alert Preview */}
            <Alert variant="info" title="System Diagnostic Preview">
              Clinical operations theme active with zero layout shift and automated WCAG 2.1 AA validation.
            </Alert>

            {/* Data Table Row Preview */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample Product</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">GST Rate</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-primary">Amoxicillin 500mg Capsule</TableCell>
                  <TableCell>CAPSULE</TableCell>
                  <TableCellMono>8901234567890</TableCellMono>
                  <TableCellNumeric>12.0%</TableCellNumeric>
                  <TableCell className="text-center">
                    <StatusBadge status="ACTIVE" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
