import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Clock, MapPin, Camera, Check, X, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import type { Site, TimeRecord } from "@shared/schema";

export default function TimeTracking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedSite, setSelectedSite] = useState<string>("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [actionType, setActionType] = useState<"in" | "out">("in");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: currentRecord } = useQuery<TimeRecord | null>({
    queryKey: ["/api/time-records/active"],
  });

  const isClockedIn = !!currentRecord && !currentRecord.checkOutTime;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError("");
        },
        (err) => {
          setLocationError(err.message);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const clockInMutation = useMutation({
    mutationFn: async (data: { siteId: string; lat: number; lng: number; photo?: string; pin?: string }) => {
      return apiRequest("POST", "/api/time-records/check-in", {
        siteId: data.siteId,
        latitude: data.lat,
        longitude: data.lng,
        photo: data.photo,
        deviceId: navigator.userAgent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/my"] });
      toast({ title: t("time.clockIn"), description: "Successfully clocked in" });
      setShowPinDialog(false);
      setPin("");
      setCapturedPhoto(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clock in", variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (data: { recordId: string; lat: number; lng: number; photo?: string; pin?: string }) => {
      return apiRequest("POST", `/api/time-records/${data.recordId}/check-out`, {
        latitude: data.lat,
        longitude: data.lng,
        photo: data.photo,
        deviceId: navigator.userAgent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-records/my"] });
      toast({ title: t("time.clockOut"), description: "Successfully clocked out" });
      setShowPinDialog(false);
      setPin("");
      setCapturedPhoto(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clock out", variant: "destructive" });
    },
  });

  const handleClockAction = (type: "in" | "out") => {
    setActionType(type);
    setShowCamera(true);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const photo = canvasRef.current.toDataURL("image/jpeg", 0.8);
        setCapturedPhoto(photo);
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
        setShowCamera(false);
        setShowPinDialog(true);
      }
    }
  };

  const submitAction = () => {
    if (!location) {
      toast({ title: "Error", description: "Location required", variant: "destructive" });
      return;
    }

    if (actionType === "in") {
      if (!selectedSite) {
        toast({ title: "Error", description: t("time.selectSite"), variant: "destructive" });
        return;
      }
      clockInMutation.mutate({
        siteId: selectedSite,
        lat: location.lat,
        lng: location.lng,
        photo: capturedPhoto || undefined,
        pin: pin || undefined,
      });
    } else {
      if (!currentRecord) {
        toast({ title: "Error", description: "No active record found", variant: "destructive" });
        return;
      }
      clockOutMutation.mutate({
        recordId: currentRecord.id,
        lat: location.lat,
        lng: location.lng,
        photo: capturedPhoto || undefined,
        pin: pin || undefined,
      });
    }
  };

  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
  }, [showCamera]);

  const elapsedTime = currentRecord?.checkInTime
    ? Math.floor((Date.now() - new Date(currentRecord.checkInTime).getTime()) / 1000)
    : 0;
  const hours = Math.floor(elapsedTime / 3600);
  const minutes = Math.floor((elapsedTime % 3600) / 60);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.timeRecords")}</h1>
        <Badge variant={isOnline ? "default" : "secondary"}>
          {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isOnline ? "Online" : t("time.offlineMode")}
        </Badge>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${
            isClockedIn ? "bg-green-500/20" : "bg-muted"
          }`}>
            <Clock className={`h-12 w-12 ${isClockedIn ? "text-green-500" : "text-muted-foreground"}`} />
          </div>
          <CardTitle className="mt-4">
            {isClockedIn ? t("time.currentlyWorking") : t("time.notClockedIn")}
          </CardTitle>
          {isClockedIn && (
            <p className="text-3xl font-mono mt-2" data-testid="text-elapsed-time">
              {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {location ? (
              <span className="text-green-600">{t("time.withinGeofence")}</span>
            ) : locationError ? (
              <span className="text-red-600">{locationError}</span>
            ) : (
              <span>{t("common.loading")}</span>
            )}
          </div>

          {!isClockedIn && (
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger data-testid="select-site">
                <SelectValue placeholder={t("time.selectSite")} />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            className="w-full"
            size="lg"
            variant={isClockedIn ? "destructive" : "default"}
            onClick={() => handleClockAction(isClockedIn ? "out" : "in")}
            disabled={clockInMutation.isPending || clockOutMutation.isPending}
            data-testid={isClockedIn ? "button-clock-out" : "button-clock-in"}
          >
            {isClockedIn ? t("time.clockOut") : t("time.clockIn")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("time.takeSelfie")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-square bg-black rounded-md overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <Button onClick={capturePhoto} className="w-full" data-testid="button-capture-photo">
              <Camera className="mr-2 h-4 w-4" />
              {t("time.takeSelfie")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionType === "in" ? t("time.confirmCheckIn") : t("time.confirmCheckOut")}
            </DialogTitle>
            <DialogDescription>{t("time.enterPin")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {capturedPhoto && (
              <img src={capturedPhoto} alt="Selfie" className="w-32 h-32 mx-auto rounded-full object-cover" />
            )}
            <Input
              type="password"
              maxLength={6}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl tracking-widest"
              data-testid="input-pin"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPinDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                className="flex-1"
                onClick={submitAction}
                disabled={clockInMutation.isPending || clockOutMutation.isPending}
                data-testid="button-confirm-action"
              >
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
