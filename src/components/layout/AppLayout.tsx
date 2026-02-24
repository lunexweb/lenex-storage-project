import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderOpen, FileText, Settings, ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useData } from "@/context/DataContext";

const LG_BREAKPOINT = 1024;

function useIsLg() {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= LG_BREAKPOINT : true
  );
  useEffect(() => {
    const handler = () => setIsLg(window.innerWidth >= LG_BREAKPOINT);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isLg;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Files", icon: FolderOpen, path: "/files" },
  { label: "Templates", icon: FileText, path: "/templates" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("lunex-sidebar") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingFormCount, setPendingFormCount] = useState(0);
  const isLg = useIsLg();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useSettings();
  const { templates, getFormSubmissions } = useData();
  const displayName = profile.businessNameOrUserName?.trim() || user?.name || "";
  const initial = displayName.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    const shareable = templates.filter((t) => t.isShareable);
    if (!shareable.length) {
      setPendingFormCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      let total = 0;
      for (const t of shareable) {
        try {
          const list = await getFormSubmissions(t.id);
          total += list.filter((s) => s.status === "pending").length;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setPendingFormCount(total);
    })();
    return () => { cancelled = true; };
  }, [templates, getFormSubmissions]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    localStorage.setItem("lunex-sidebar", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isLg) setMobileMenuOpen(false);
  }, [isLg]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay — only when sidebar drawer is open */}
      {!isLg && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — on lg always visible; on mobile slides in as drawer */}
      <aside
        className="fixed left-0 top-0 bottom-0 bg-navy flex flex-col z-50 transition-[transform,width] duration-300 ease-in-out lg:translate-x-0"
        style={{
          width: isLg ? sidebarWidth : 240,
          transform: !isLg && !mobileMenuOpen ? "translateX(-100%)" : undefined,
        }}
      >
        {/* Logo + Toggle (desktop) / Close (mobile) */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-navy-light shrink-0">
          {!isLg ? (
            <>
              <span className="text-lg tracking-tight text-gold">
                <span className="font-bold">Lunex</span>
                <span className="font-normal text-white">.com</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-md hover:bg-navy-light text-navy-foreground transition-colors lg:min-h-0 lg:min-w-0 lg:p-1.5"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              {!collapsed && (
                <span className="text-lg tracking-tight text-gold">
                  <span className="font-bold">Lunex</span>
                  <span className="font-normal text-white">.com</span>
                </span>
              )}
              {collapsed && <span className="text-xs font-bold text-gold mx-auto tracking-tighter">L</span>}
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="p-1.5 rounded-md hover:bg-navy-light text-navy-foreground transition-colors"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>

        {/* Navigation — on mobile always show labels */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const showLabel = !isLg || !collapsed;
            const isTemplates = item.path === "/templates";
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium min-h-[44px] lg:min-h-0 relative ${
                  active
                    ? "bg-navy-light text-gold"
                    : "text-navy-foreground hover:bg-navy-light hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {showLabel && <span className="transition-opacity duration-200">{item.label}</span>}
                {isTemplates && pendingFormCount > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-gold text-gold-foreground text-xs font-bold">
                    {pendingFormCount > 99 ? "99+" : pendingFormCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Profile */}
        <div className="p-3 border-t border-navy-light shrink-0">
          <div className="flex items-center gap-3">
            {isLg && collapsed ? (
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="h-9 w-9 rounded-full bg-gold flex items-center justify-center text-gold-foreground font-bold text-sm shrink-0 hover:opacity-90 transition-opacity mx-auto"
              >
                {initial}
              </button>
            ) : (
              <>
                <div className="h-9 w-9 rounded-full bg-gold flex items-center justify-center text-gold-foreground font-bold text-sm shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{displayName || "User"}</p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-navy-foreground hover:text-gold transition-colors flex items-center gap-1 mt-0.5 min-h-[44px] lg:min-h-0"
                  >
                    <LogOut className="h-3 w-3" /> Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header — hamburger + logo when sidebar is closed */}
      {!isLg && (
        <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -ml-2 rounded-md hover:bg-muted text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg tracking-tight text-gold font-bold">Lunex</span>
          <span className="text-lg tracking-tight text-white/0 select-none">.com</span>
        </header>
      )}

      {/* Main Content — full width on mobile with top padding for header; on lg same as before */}
      <main
        className="flex-1 transition-all duration-300 ease-in-out min-h-screen min-w-0 overflow-x-hidden pt-14 lg:pt-0"
        style={{ marginLeft: isLg ? sidebarWidth : 0 }}
      >
        {children}
      </main>
    </div>
  );
}
