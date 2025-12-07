import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { XCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    impersonatedTenantName, 
    stopImpersonation, 
    isStopImpersonationPending 
  } = useAuth();
  const { toast } = useToast();

  if (!isImpersonating) {
    return null;
  }

  const handleStopImpersonation = () => {
    stopImpersonation(undefined, {
      onSuccess: () => {
        toast({
          title: "Impersonation Ended",
          description: "You are now back to your superadmin view.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to stop impersonation.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div 
      className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 flex items-center justify-between gap-4 z-50"
      data-testid="impersonation-banner"
    >
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">
          Viewing as: <strong>{impersonatedTenantName}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleStopImpersonation}
        disabled={isStopImpersonationPending}
        className="bg-transparent border-white text-white hover:bg-white/20"
        data-testid="button-stop-impersonation"
      >
        <XCircle className="h-4 w-4 mr-1" />
        {isStopImpersonationPending ? "Stopping..." : "Stop Impersonating"}
      </Button>
    </div>
  );
}
