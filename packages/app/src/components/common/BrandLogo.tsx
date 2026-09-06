import React, { useState } from "react";

export interface BrandLogoProps {
  /** CSS class for the logo container / image */
  className?: string;
  /** Size preset */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Optional custom logo image URL, defaults to "/logo.png" */
  src?: string;
  /** Alt text */
  alt?: string;
  /** Whether to show the INVENTRA text next to the logo */
  showText?: boolean;
  /** Badge text next to INVENTRA, e.g. "ERP" or "DESKTOP" */
  badgeText?: string;
  /** Optional subtitle below the brand title */
  subtitle?: string;
}

const sizeMap = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-xl",
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = "md",
  src = "/logo.png",
  alt = "Inventra Logo",
  showText = false,
  badgeText,
  subtitle,
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensionClass = sizeMap[size] || sizeMap.md;

  const logoGraphic = !imgError ? (
    <img
      src={src}
      alt={alt}
      onError={() => setImgError(true)}
      className={`${dimensionClass} object-contain rounded-lg ${className}`}
    />
  ) : (
    <div
      className={`${dimensionClass} rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-mono font-black text-slate-950 shadow-sm shrink-0 ${className}`}
    >
      IN
    </div>
  );

  if (!showText) {
    return logoGraphic;
  }

  return (
    <div className="flex items-center gap-2.5">
      {logoGraphic}
      <div>
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-primary leading-tight">
          <span>INVENTRA</span>
          {badgeText && (
            <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20 font-mono">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-secondary -mt-0.5 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
