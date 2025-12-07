import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ManagerGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Shield, 
  Camera, 
  Lock,
  Globe,
  Save,
  Loader2,
  Target
} from "lucide-react";
import type { Tenant } from "@shared/schema";

function CompanySettingsContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    phone: string;
    email: string;
    settings: {
      geofenceRadius: number;
      requireSelfie: boolean;
      requirePin: boolean;
      defaultLanguage: string;
    };
  }>({
    name: "",
    address: "",
    phone: "",
    email: "",
    settings: {
      geofenceRadius: 100,
      requireSelfie: false,
      requirePin: false,
      defaultLanguage: "pt",
    },
  });

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenant"],
  });

  // Sync form data when tenant loads
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        address: tenant.address || "",
        phone: tenant.phone || "",
        email: tenant.email || "",
        settings: {
          geofenceRadius: tenant.settings?.geofenceRadius ?? 100,
          requireSelfie: tenant.settings?.requireSelfie ?? false,
          requirePin: tenant.settings?.requirePin ?? false,
          defaultLanguage: tenant.settings?.defaultLanguage ?? "pt",
        },
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      return apiRequest("PATCH", "/api/tenant", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({ title: t("common.success"), description: "Company settings updated successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: "Failed to update settings" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      settings: formData.settings,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("admin.companySettings")}</h1>
          <p className="text-muted-foreground">
            Configure company profile, security policies, and system settings
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("common.save")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Profile
            </CardTitle>
            <CardDescription>
              Basic information about your company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter company address"
                data-testid="input-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="company@example.com"
                data-testid="input-email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Verification Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Verification
            </CardTitle>
            <CardDescription>
              Configure time tracking security policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="geofenceRadius" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Geofence Radius (meters)
              </Label>
              <Input
                id="geofenceRadius"
                type="number"
                min={10}
                max={1000}
                value={formData.settings.geofenceRadius}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, geofenceRadius: parseInt(e.target.value) || 100 }
                })}
                data-testid="input-geofence-radius"
              />
              <p className="text-xs text-muted-foreground">
                Workers must be within this distance from the site to clock in/out
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireSelfie" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Require Selfie on Clock In/Out
                </Label>
                <p className="text-xs text-muted-foreground">
                  Workers must take a photo when clocking in or out
                </p>
              </div>
              <Switch
                id="requireSelfie"
                checked={formData.settings.requireSelfie}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, requireSelfie: checked }
                })}
                data-testid="switch-require-selfie"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requirePin" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Require PIN Verification
                </Label>
                <p className="text-xs text-muted-foreground">
                  Workers must enter their PIN to clock in/out
                </p>
              </div>
              <Switch
                id="requirePin"
                checked={formData.settings.requirePin}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, requirePin: checked }
                })}
                data-testid="switch-require-pin"
              />
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>
              Language and localization preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Default Language</Label>
              <Select
                value={formData.settings.defaultLanguage}
                onValueChange={(value) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, defaultLanguage: value }
                })}
              >
                <SelectTrigger id="defaultLanguage" data-testid="select-default-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default language for new employees
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Your current plan and subscription status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-medium capitalize" data-testid="text-subscription-plan">
                {tenant?.subscriptionPlan || "Starter"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span 
                className={`font-medium capitalize ${tenant?.subscriptionStatus === "active" ? "text-green-600" : "text-yellow-600"}`}
                data-testid="text-subscription-status"
              >
                {tenant?.subscriptionStatus || "Active"}
              </span>
            </div>
            {tenant?.stripeCustomerId && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Contact support to upgrade or modify your subscription
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CompanySettings() {
  return (
    <ManagerGuard>
      <CompanySettingsContent />
    </ManagerGuard>
  );
}
