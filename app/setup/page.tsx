"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "free",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Debounced slug availability check
  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      setSlugStatus("idle");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSlugStatus("checking");
      try {
        const response = await fetch(`/api/setup/tenants/check?slug=${formData.slug}`);
        const data = await response.json();
        setSlugStatus(data.available ? "available" : "taken");
      } catch (error) {
        console.error("Error checking slug:", error);
        setSlugStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;

    // Auto-generate slug if user hasn't manually edited it
    if (!slugTouched) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData({ ...formData, name, slug });
    } else {
      setFormData({ ...formData, name });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");

    setFormData({ ...formData, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/setup/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create tenant");
      }

      // Redirect to dashboard or success page
      router.push(`/`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      value: "free",
      label: "Free",
      description: "Perfect for getting started",
      features: ["Basic features", "Up to 10 users", "Community support"],
      price: "$0",
    },
    {
      value: "starter",
      label: "Starter",
      description: "For small teams",
      features: ["All Free features", "Up to 50 users", "Email support"],
      price: "$29",
    },
    {
      value: "professional",
      label: "Professional",
      description: "For growing businesses",
      features: ["All Starter features", "Unlimited users", "Priority support"],
      price: "$99",
    },
    {
      value: "enterprise",
      label: "Enterprise",
      description: "For large organizations",
      features: ["All Professional features", "Custom integrations", "Dedicated support"],
      price: "Custom",
    },
  ];

  const selectedPlan = plans.find(p => p.value === formData.plan);

  const isFormValid = formData.name.trim() !== "" && formData.slug.length >= 3 && slugStatus === "available";

  return (
    <div className="min-h-screen bg-linear-to-tr from-popover via-background to-popover flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-popover flex items-center justify-center">
              <Building2 className="h-6 w-6 text-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Create Your Tenant</CardTitle>
          <CardDescription className="text-base">Set up your organization to start managing your business</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input id="name" type="text" placeholder="Acme Corporation" value={formData.name} onChange={handleNameChange} required disabled={isLoading} />
              <p className="text-xs text-muted-foreground">The name of your company or organization</p>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Subdomain/Slug</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="slug"
                    type="text"
                    placeholder="acme-corp"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    required
                    disabled={isLoading}
                    className={`pr-10 ${slugStatus === "available" ? "border-green-500" : slugStatus === "taken" ? "border-red-500" : ""}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {slugStatus === "taken" && <XCircle className="h-4 w-4 text-red-600" />}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">.transaction.manager.com</span>
              </div>
              {slugStatus === "taken" && <p className="text-xs text-red-600">This slug is already taken. Please choose another.</p>}
              {slugStatus === "available" && <p className="text-xs text-green-600">This slug is available!</p>}
              {slugStatus === "idle" && formData.slug.length > 0 && formData.slug.length < 3 && <p className="text-xs text-muted-foreground">Slug must be at least 3 characters</p>}
              {slugStatus === "idle" && formData.slug.length === 0 && <p className="text-xs text-muted-foreground">Your unique identifier (letters, numbers, and hyphens only)</p>}
            </div>

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label htmlFor="plan">Select a Plan</Label>
              <Select value={formData.plan} onValueChange={value => setFormData({ ...formData, plan: value })} disabled={isLoading}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.value} value={plan.value}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.label}</span>
                          <span className="text-xs text-muted-foreground">- {plan.description}</span>
                        </div>
                        <Badge variant="secondary">{plan.price}/mo</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan Features */}
            {selectedPlan && (
              <Card className="bg-popover border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedPlan.label} Plan</CardTitle>
                      <CardDescription>{selectedPlan.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-base font-semibold">
                      {selectedPlan.price}/mo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading || !isFormValid}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Tenant...
                </>
              ) : (
                "Create Tenant"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">By creating a tenant, you agree to our Terms of Service and Privacy Policy</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
