/** Renders "Lunex" (bold) + ".com" (different color, not bold) for consistent branding */
export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold">Lunex</span>
      <span className="font-normal text-primary">.com</span>
    </span>
  );
}

/** Plain string for use in copy/PDF/defaults (no markup) */
export const BRAND_NAME = "Lunex.com";

/** Short tagline for shared/public pages */
export const BRAND_TAGLINE = "Find any client file in seconds.";
