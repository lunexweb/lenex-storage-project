/**
 * Auth-style layout for shared/request links: branding panel (desktop left, mobile top) + content.
 * Ensures "what we do" is visible and looks modern on all screen sizes.
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";

const TAGLINE = "Find any client file in seconds.";
const SUBTAG = "Stop searching through WhatsApp, email, and paper folders. Lunex gives every client their own organised file — ready when you need it.";

interface PublicBrandLayoutProps {
  children: ReactNode;
  /** Optional class for the content area (right on desktop, below branding on mobile) */
  contentClassName?: string;
}

function BrandingPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "text-center space-y-2 py-6 px-4" : "max-w-sm w-full text-center space-y-6"}>
      <div className={`flex items-center justify-center gap-3 ${compact ? "gap-2" : ""}`}>
        <div
          className={`rounded-xl bg-gold flex items-center justify-center text-gold-foreground font-bold shrink-0 ${
            compact ? "h-9 w-9 text-xs tracking-tighter" : "h-11 w-11 text-sm tracking-tight"
          }`}
        >
          L
        </div>
        <span className={`tracking-tight text-white ${compact ? "text-xl" : "text-2xl"}`}>
          <span className="font-bold">Lunex</span>
          <span className="font-normal text-white">.com</span>
        </span>
      </div>
      <p className={`text-navy-foreground leading-relaxed ${compact ? "text-sm" : "text-base"}`}>
        {TAGLINE}
      </p>
      {!compact && <p className="text-navy-foreground/90 text-sm">{SUBTAG}</p>}
      {compact && <p className="text-navy-foreground/90 text-xs">{SUBTAG}</p>}
      <Link
        to="/login"
        className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors border-2 border-white text-white bg-transparent hover:bg-white hover:text-navy ${compact ? "px-4 py-2 text-sm mt-2" : "px-6 py-3 text-base mt-2"}`}
      >
        Join
      </Link>
    </div>
  );
}

export default function PublicBrandLayout({ children, contentClassName = "" }: PublicBrandLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Desktop: left branding panel (same as LoginPage) */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-center items-center bg-navy text-white px-10 py-16">
        <BrandingPanel />
      </div>

      {/* Mobile: compact branding strip at top */}
      <div className="lg:hidden bg-navy text-white shrink-0">
        <BrandingPanel compact />
      </div>

      {/* Content: right on desktop, below branding on mobile */}
      <div
        className={`flex-1 flex flex-col justify-center items-center bg-background px-4 py-8 lg:px-6 lg:py-12 min-w-0 w-full ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
