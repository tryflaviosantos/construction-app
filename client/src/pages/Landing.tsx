import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import {
  MapPin,
  Wrench,
  Users,
  Calculator,
  Shield,
  Globe,
  Check,
  ChevronDown,
  HardHat,
  Clock,
  Camera,
} from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Landing() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const features = [
    { icon: MapPin, key: "gps" },
    { icon: Wrench, key: "tools" },
    { icon: Users, key: "client" },
    { icon: Calculator, key: "payroll" },
    { icon: Shield, key: "antifraud" },
    { icon: Globe, key: "multilang" },
  ];

  const plans = [
    {
      key: "basic",
      price: billingPeriod === "yearly" ? "24" : "29",
      cta: "getStarted",
      featured: false,
    },
    {
      key: "professional",
      price: billingPeriod === "yearly" ? "65" : "79",
      cta: "getStarted",
      featured: true,
    },
    {
      key: "enterprise",
      price: billingPeriod === "yearly" ? "165" : "199",
      cta: "contactSales",
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold hidden sm:inline">ConstructTrack</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              {t("landing.footer.features")}
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              {t("landing.footer.pricing")}
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <LanguageSelector />
            <ThemeToggle />
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button data-testid="button-dashboard">{t("nav.dashboard")}</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button data-testid="button-login">
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjRkY2QjM1IiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            <Clock className="mr-1 h-3 w-3" />
            {t("landing.faq.a3").split(".")[0]}
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            {t("landing.hero.title")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("landing.hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" data-testid="button-hero-cta">
                {t("landing.hero.cta")}
              </Button>
            </Link>
            <Button size="lg" variant="outline" data-testid="button-hero-demo">
              <Camera className="mr-2 h-4 w-4" />
              {t("landing.hero.demo")}
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("landing.testimonials.title")}
          </p>
        </div>
      </section>

      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("landing.features.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, key }) => (
              <Card key={key} className="hover-elevate" data-testid={`card-feature-${key}`}>
                <CardHeader>
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{t(`landing.features.${key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {t(`landing.features.${key}.description`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("landing.pricing.title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("landing.pricing.subtitle")}
            </p>
            <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-md">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("monthly")}
                data-testid="button-billing-monthly"
              >
                {t("landing.pricing.monthly")}
              </Button>
              <Button
                variant={billingPeriod === "yearly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("yearly")}
                data-testid="button-billing-yearly"
              >
                {t("landing.pricing.yearly")}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.key}
                className={plan.featured ? "border-primary relative" : ""}
                data-testid={`card-plan-${plan.key}`}
              >
                {plan.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t("landing.pricing.professional.popular")}
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{t(`landing.pricing.${plan.key}.name`)}</CardTitle>
                  <CardDescription>{t(`landing.pricing.${plan.key}.description`)}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">{t("landing.pricing.perMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {(t(`landing.pricing.${plan.key}.features`, { returnObjects: true }) as string[]).map(
                      (feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      )
                    )}
                  </ul>
                  <Link href="/login">
                    <Button
                      className="w-full"
                      variant={plan.featured ? "default" : "outline"}
                      data-testid={`button-plan-${plan.key}`}
                    >
                      {t(`landing.pricing.${plan.cta}`)}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t("landing.faq.title")}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {[1, 2, 3, 4].map((num) => (
              <AccordionItem key={num} value={`item-${num}`}>
                <AccordionTrigger data-testid={`faq-trigger-${num}`}>
                  {t(`landing.faq.q${num}`)}
                </AccordionTrigger>
                <AccordionContent>{t(`landing.faq.a${num}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            {t("landing.cta.subtitle")}
          </p>
          <Link href="/login">
            <Button
              size="lg"
              variant="secondary"
              data-testid="button-cta-final"
            >
              {t("landing.cta.button")}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.product")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">{t("landing.footer.features")}</a></li>
                <li><a href="#pricing" className="hover:text-foreground">{t("landing.footer.pricing")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.company")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t("landing.footer.about")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("landing.footer.blog")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.resources")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t("landing.footer.help")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("landing.footer.api")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.contact")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t("landing.footer.privacy")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("landing.footer.terms")}</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <div className="flex items-center gap-2">
              <HardHat className="h-6 w-6 text-primary" />
              <span className="font-semibold">ConstructTrack</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("landing.footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
