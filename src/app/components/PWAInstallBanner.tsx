import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Inject manifest link if not present
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.json";
      document.head.appendChild(link);
    }

    // Inject theme-color meta
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#0a0a0a";
      document.head.appendChild(meta);
    }

    // Check dismissed flag
    const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (dismissed) return;

    // iOS Safari detection
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari && !isInstalled) {
      // Show iOS install guide after delay
      setTimeout(() => setShowIOSGuide(true), 3000);
      return;
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setInstallEvent(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (isInstalled) return null;

  // iOS guide
  if (showIOSGuide) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div
          className="rounded-2xl shadow-2xl border overflow-hidden"
          style={{ background: "#18181b", borderColor: "#3f3f46" }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Instalar Aplicação</p>
                  <p className="text-xs text-zinc-400">Acesso rápido no iPhone</p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
                <span>Toque no ícone <strong className="text-white">Partilhar</strong> em baixo (quadrado com seta)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
                <span>Selecione <strong className="text-white">"Adicionar ao Ecrã Inicial"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
                <span>Toque em <strong className="text-white">"Adicionar"</strong> para confirmar</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install banner
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: "#18181b", borderColor: "#3f3f46" }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Instalar Aplicação</p>
                <p className="text-xs text-zinc-400">Acesso rápido, funciona offline</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Instale a Fresave ERP no seu dispositivo para acesso rápido e receber notificações.
          </p>
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-600 hover:border-zinc-500"
            >
              Agora não
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
