import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NotificationPreferences } from "@shared/schema";

type NotificationPreferenceBooleans = 
  | "emailEnabled" 
  | "pushEnabled" 
  | "smsEnabled" 
  | "timeReminders" 
  | "lateAlerts" 
  | "toolAlerts" 
  | "contestationAlerts" 
  | "leaveAlerts";
import {
  User,
  Building,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Moon,
  MapPin,
  Camera,
  Key,
  Loader2,
} from "lucide-react";

export default function Settings() {
  const { t } = useTranslation();
  const { user, isManager } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const { data: notificationPrefs, isLoading: prefsLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notification-preferences"],
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates: Partial<Record<NotificationPreferenceBooleans, boolean>>) => {
      await apiRequest("PUT", "/api/notification-preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: t("common.save"),
        description: t("notifications.preferences.updateSuccess"),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: t("common.error"),
        description: t("notifications.preferences.updateError"),
        variant: "destructive",
      });
    },
  });

  const handlePreferenceChange = (key: NotificationPreferenceBooleans, value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  const getInitials = () => {
    return `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("settings.profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-muted-foreground">{user?.email}</p>
              <Button variant="outline" size="sm" className="mt-2" data-testid="button-change-photo">
                <Camera className="mr-2 h-4 w-4" />
                Change Photo
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input
                defaultValue={user?.firstName || ""}
                className="mt-1"
                data-testid="input-settings-firstname"
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                defaultValue={user?.lastName || ""}
                className="mt-1"
                data-testid="input-settings-lastname"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                defaultValue={user?.email || ""}
                className="mt-1"
                data-testid="input-settings-email"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                defaultValue={user?.phone || ""}
                className="mt-1"
                data-testid="input-settings-phone"
              />
            </div>
          </div>

          <Button data-testid="button-save-profile">{t("common.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.language")} & Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("settings.language")}</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred language
              </p>
            </div>
            <LanguageSelector />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
              <ThemeToggle />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("settings.security")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Change PIN</Label>
              <p className="text-sm text-muted-foreground">
                Update your 6-digit PIN for time tracking
              </p>
            </div>
            <Button variant="outline" data-testid="button-change-pin">
              <Key className="mr-2 h-4 w-4" />
              Change PIN
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <Switch data-testid="switch-2fa" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("settings.notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.email")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.emailEnabled ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("emailEnabled", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-email-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.push")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.pushEnabled ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("pushEnabled", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-push-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.sms")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive SMS notifications
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.smsEnabled ?? false}
                  onCheckedChange={(checked) => handlePreferenceChange("smsEnabled", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-sms-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.timeReminders")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to clock in/out
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.timeReminders ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("timeReminders", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-time-reminders"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.lateAlerts")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Get alerts for late arrivals
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.lateAlerts ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("lateAlerts", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-late-alerts"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.toolAlerts")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for unreturned tools
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.toolAlerts ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("toolAlerts", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-tool-alerts"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.contestationAlerts")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for client contestations
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.contestationAlerts ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("contestationAlerts", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-contestation-alerts"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("notifications.preferences.leaveAlerts")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for leave request updates
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.leaveAlerts ?? true}
                  onCheckedChange={(checked) => handlePreferenceChange("leaveAlerts", checked)}
                  disabled={updatePrefsMutation.isPending}
                  data-testid="switch-leave-alerts"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {t("settings.company")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input className="mt-1" data-testid="input-company-name" />
              </div>
              <div>
                <Label>Company Email</Label>
                <Input type="email" className="mt-1" data-testid="input-company-email" />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Time Tracking Settings</h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.requireSelfie")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Require selfie for clock in/out
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-require-selfie" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.requirePin")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Require PIN verification
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-require-pin" />
              </div>

              <div>
                <Label>{t("settings.geofence")} (meters)</Label>
                <Input
                  type="number"
                  defaultValue="100"
                  className="mt-1 w-32"
                  data-testid="input-geofence-radius"
                />
              </div>
            </div>

            <Button data-testid="button-save-company">{t("common.save")}</Button>
          </CardContent>
        </Card>
      )}

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("settings.billing")}
            </CardTitle>
            <CardDescription>
              Manage your subscription and payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current Plan</span>
                <span className="text-primary font-semibold">Professional</span>
              </div>
              <p className="text-sm text-muted-foreground">
                $79/month - Up to 50 employees
              </p>
            </div>
            <Button variant="outline" className="mt-4" data-testid="button-manage-subscription">
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
