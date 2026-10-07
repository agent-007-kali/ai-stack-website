/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";

export type BrandLogoVariant = "header-dark" | "header" | "symbol";

const SOURCES: Record<BrandLogoVariant, string> = {
  "header-dark": "/brand/ai-solutions-header-dark.svg",
  header: "/brand/ai-solutions-header.svg",
  symbol: "/brand/ai-solutions-symbol.svg",
};

/** Intrinsic aspect ratios of the supplied art: 1800x420 and 512x512. */
const DEFAULTS: Record<BrandLogoVariant, { width: number; height: number }> = {
  "header-dark": { width: 180, height: 42 },
  header: { width: 180, height: 42 },
  symbol: { width: 64, height: 64 },
};

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
};

export default function BrandLogo({
  variant = "header-dark",
  width,
  height,
  alt = "AI Solutions",
  className,
  style,
  decorative = false,
}: BrandLogoProps) {
  const size = DEFAULTS[variant];
  const resolvedWidth = width ?? size.width;
  const resolvedHeight = height ?? size.height;

  return (
    <img
      src={SOURCES[variant]}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={resolvedWidth}
      height={resolvedHeight}
      className={className}
      style={style}
    />
  );
}
