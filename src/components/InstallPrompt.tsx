import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_PROMPT_PATHS = ["/login", "/signup", "/"] as const;

function isRunningAsInstalledPWA(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const { pathname } = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isAllowedPath = INSTALL_PROMPT_PATHS.includes(pathname as (typeof INSTALL_PROMPT_PATHS)[number]);
  const isStandalone = isRunningAsInstalledPWA();

  useEffect(() => {
    if (!isAllowedPath || isStandalone) return;
    const alreadyDismissed = localStorage.getItem("lunex-install-dismissed");
    if (alreadyDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isAllowedPath, isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("lunex-install-dismissed", "true");
  };

  if (!isAllowedPath || isStandalone || !showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-navy text-white rounded-xl shadow-2xl p-4 flex items-start gap-3 border border-white/10">
        <div className="h-10 w-10 rounded-lg bg-gold flex items-center justify-center shrink-0">
          <span className="text-navy font-bold text-sm">L</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install Lunex</p>
          <p className="text-xs text-white/70 mt-0.5">Add to your home screen for quick access to all your client files.</p>
          <button
            onClick={handleInstall}
            className="mt-2 flex items-center gap-1.5 bg-gold text-navy text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            <Download className="h-3 w-3" />
            Install app
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/50 hover:text-white p-1 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

