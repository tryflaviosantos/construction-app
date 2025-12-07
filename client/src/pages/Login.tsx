import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { HardHat, LogIn, UserPlus, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().min(2, "Company name is required"),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Login() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      companyName: "",
      subscriptionPlan: "basic",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/local-login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("auth.loginSuccess", "Login successful"),
        description: t("auth.welcomeBack", "Welcome back!"),
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: t("auth.loginError", "Login failed"),
        description: error.message || t("auth.invalidCredentials", "Invalid email or password"),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("auth.registerSuccess", "Registration successful"),
        description: t("auth.accountCreated", "Your account has been created. You are now logged in."),
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: t("auth.registerError", "Registration failed"),
        description: error.message || t("auth.registrationFailed", "Could not create account"),
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleReplitAuth = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">ConstructTrack</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("auth.welcome", "Welcome")}</CardTitle>
            <CardDescription>
              {t("auth.signInOrCreate", "Sign in to your account or create a new one")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-login">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t("auth.login", "Login")}
                </TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("auth.register", "Register")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email", "Email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("auth.enterEmail", "Enter your email")}
                              data-testid="input-login-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.password", "Password")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("auth.enterPassword", "Enter your password")}
                              data-testid="input-login-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending ? t("auth.loggingIn", "Logging in...") : t("auth.login", "Login")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.firstName", "First Name")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.enterFirstName", "First name")}
                                data-testid="input-register-firstname"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.lastName", "Last Name")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.enterLastName", "Last name")}
                                data-testid="input-register-lastname"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.companyName", "Company Name")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("auth.enterCompanyName", "Enter your company name")}
                              data-testid="input-register-company"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="subscriptionPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.subscriptionPlan", "Subscription Plan")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-register-plan">
                                <SelectValue placeholder={t("auth.selectPlan", "Select a plan")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basic">{t("plans.basic", "Basic")} - {t("plans.basicDesc", "Essential features")}</SelectItem>
                              <SelectItem value="professional">{t("plans.professional", "Professional")} - {t("plans.professionalDesc", "Advanced features")}</SelectItem>
                              <SelectItem value="enterprise">{t("plans.enterprise", "Enterprise")} - {t("plans.enterpriseDesc", "Full access")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email", "Email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("auth.enterEmail", "Enter your email")}
                              data-testid="input-register-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.password", "Password")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("auth.createPassword", "Create a password")}
                              data-testid="input-register-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.confirmPassword", "Confirm Password")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("auth.confirmYourPassword", "Confirm your password")}
                              data-testid="input-register-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending ? t("auth.creating", "Creating account...") : t("auth.createAccount", "Create Account")}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("auth.orContinueWith", "Or continue with")}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleReplitAuth}
              data-testid="button-replit-auth"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 2h20v20H2V2zm2 2v16h16V4H4zm2 2h12v12H6V6z"/>
              </svg>
              {t("auth.signInWithReplit", "Sign in with Replit")}
            </Button>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                {t("auth.backToHome", "Back to home")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
