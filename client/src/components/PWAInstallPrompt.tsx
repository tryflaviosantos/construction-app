import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, Smartphone, Share, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

function isMobile(): boolean {
  return isIOS() || isAndroid() || /Mobile|webOS|BlackBerry|Opera Mini|IEMobile/.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    if (isIOS()) {
      setTimeout(() => {
        setShowIOSInstructions(true);
        setShowPrompt(true);
      }, 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (isMobile() && !isIOS()) {
      setTimeout(() => {
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowPrompt(false);
    setShowIOSInstructions(false);
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t("pwa.title", "Instalar App")}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-2"
                onClick={handleDismiss}
                data-testid="button-pwa-dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-sm">
              {t("pwa.iosDescription", "Para instalar no iPhone/iPad:")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  1
                </div>
                <div className="flex items-center gap-2">
                  <span>{t("pwa.iosStep1", "Toque em")}</span>
                  <Share className="h-4 w-4 text-primary" />
                  <span>{t("pwa.iosShareButton", "(Partilhar)")}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  2
                </div>
                <div className="flex items-center gap-2">
                  <span>{t("pwa.iosStep2", "Escolha")}</span>
                  <Plus className="h-4 w-4 text-primary" />
                  <span>{t("pwa.iosAddToHome", "'Adicionar ao Ecrã Inicial'")}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  3
                </div>
                <span>{t("pwa.iosStep3", "Confirme tocando em 'Adicionar'")}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleDismiss}
              data-testid="button-pwa-understood"
            >
              {t("pwa.understood", "Entendi")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("pwa.title", "Instalar App")}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2"
              onClick={handleDismiss}
              data-testid="button-pwa-dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            {t("pwa.description", "Instale o ConstructTrack no seu celular para acesso rápido")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              className="w-full"
              data-testid="button-pwa-install"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("pwa.install", "Instalar")}
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground text-center">
              {t("pwa.androidInstructions", "Use o menu do navegador e selecione 'Instalar app' ou 'Adicionar à tela inicial'")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
