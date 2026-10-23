import React, { useState } from "react";

export interface BrandLogoProps {
  /** CSS class for the logo container */
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
  xs: { box: "w-6 h-6", icon: "w-4 h-4", font: "text-[10px]" },
  sm: { box: "w-8 h-8", icon: "w-5 h-5", font: "text-xs" },
  md: { box: "w-10 h-10", icon: "w-6 h-6", font: "text-sm" },
  lg: { box: "w-12 h-12", icon: "w-7 h-7", font: "text-base" },
  xl: { box: "w-16 h-16", icon: "w-10 h-10", font: "text-xl" },
};

/**
 * Designer-Grade Vector Emblem for Inventra
 * Cloud Architecture + Apothecary Mortar & Pestle + Pharmaceutical Data Particles
 * Engineered for razor-sharp visual clarity across light and dark modes.
 */
export const InventraEmblem: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="inv-cloud-grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="50%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#115E59" />
        </linearGradient>

        <linearGradient id="inv-mortar-grad" x1="20" y1="50" x2="75" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="70%" stopColor="#134E4A" />
          <stop offset="100%" stopColor="#042F2E" />
        </linearGradient>

        <linearGradient id="inv-highlight-grad" x1="25" y1="55" x2="65" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        <linearGradient id="inv-pestle-grad" x1="40" y1="30" x2="70" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="50%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>

        <linearGradient id="inv-particle-grad" x1="70" y1="50" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>

      {/* Cloud Outer Halo (visible crisp in light & dark) */}
      <path
        d="M32 46 C24 46 16 53 16 62 C16 71 23 78 32 78 C33 78 35 78 36 77.5 C38 82 43 85 49 85 C55 85 61 82 63 77 C66 79 70 80 74 78 C79 76 83 71 83 65 C83 58 78 52 71 51 C70 43 64 36 55 36 C47 36 40 41 37 47 C35 46.5 33.5 46 32 46 Z"
        stroke="url(#inv-cloud-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90"
      />

      {/* Pestle angled handle */}
      <path
        d="M44 54 L62 34 C64 32 67 32 69 34 C71 36 71 39 69 41 L52 60 Z"
        fill="url(#inv-pestle-grad)"
      />

      {/* Mortar Apothecary Bowl Body */}
      <path
        d="M24 55 C24 55 25 76 49 76 C72 76 75 55 75 55 C75 55 52 57 24 55 Z"
        fill="url(#inv-mortar-grad)"
      />

      {/* Mortar Inner Glow Lip */}
      <path
        d="M25 55 C35 58 63 58 74 55 C65 65 52 74 36 71 C28 67 25 58 25 55 Z"
        fill="url(#inv-highlight-grad)"
        className="opacity-80"
      />

      {/* Digital Data / Pharmaceutical Tablet Particles */}
      <rect x="74" y="52" width="7" height="7" rx="1.5" fill="url(#inv-particle-grad)" />
      <rect x="77" y="63" width="6.5" height="6.5" rx="1.5" fill="url(#inv-particle-grad)" />
      <rect x="69" y="70" width="6" height="6" rx="1.5" fill="url(#inv-particle-grad)" />
      <rect x="62" y="77" width="5" height="5" rx="1.5" fill="url(#inv-particle-grad)" />
    </svg>
  );
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
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const currentSize = sizeMap[size] || sizeMap.md;

  const logoGraphic = (
    <div
      className={`relative ${currentSize.box} rounded-xl bg-white dark:bg-slate-900 border border-teal-200/90 dark:border-teal-800/60 shadow-xs hover:shadow transition-all flex items-center justify-center p-1 shrink-0 overflow-hidden ${className}`}
    >
      {/* Background Soft Medical Gradient Tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50 dark:from-teal-950/40 dark:to-slate-900 pointer-events-none" />

      {/* Always render high-contrast SVG vector emblem if image has not loaded or failed */}
      {!imgLoaded || imgError ? (
        <InventraEmblem className={`${currentSize.icon} relative z-10`} />
      ) : null}

      {/* Custom image overlay if valid */}
      {!imgError && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgError(true);
            setImgLoaded(false);
          }}
          className={`${currentSize.icon} object-contain relative z-10 transition-opacity duration-200 ${
            imgLoaded ? "opacity-100" : "opacity-0 absolute"
          }`}
        />
      )}
    </div>
  );

  if (!showText) {
    return logoGraphic;
  }

  return (
    <div className="flex items-center gap-3">
      {logoGraphic}
      <div>
        <div className="flex items-center gap-2 font-bold tracking-tight leading-tight">
          <span className="tracking-tight text-slate-900 dark:text-slate-100 font-extrabold text-base lg:text-lg">
            INVENTRA
          </span>
          {badgeText && (
            <span className="text-[10px] font-bold tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/90 dark:text-teal-300 dark:bg-teal-950/50 dark:border-teal-800/50 uppercase shadow-2xs">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 font-medium tracking-tight">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
