import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useTheme } from "next-themes";

export function AppearanceSettings() {
  const theme = useTheme();

  const handleThemeChange = (value: string) => {
    if (value === "system") {
      theme.setTheme("system");
    } else {
      theme.setTheme(value);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            <RadioGroup
              defaultValue={theme.theme}
              className="grid grid-cols-3 gap-4 pt-2"
              onValueChange={handleThemeChange}
            >
              <div>
                <RadioGroupItem
                  value="light"
                  id="theme-light"
                  className="sr-only peer"
                />
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-popover/70 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="rounded-md border border-border p-2 mb-3 w-full bg-white/70">
                    <div className="h-2 w-3/4 rounded-lg bg-black/50 mb-2" />
                    <div className="h-2 w-1/2 rounded-lg bg-black/50" />
                  </div>
                  <span className="block w-full text-center font-normal">
                    Light
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="dark"
                  id="theme-dark"
                  className="sr-only peer"
                />
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-popover/70 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="rounded-md border border-border p-2 mb-3 w-full bg-zinc-950">
                    <div className="h-2 w-3/4 rounded-lg bg-zinc-200/20 mb-2" />
                    <div className="h-2 w-1/2 rounded-lg bg-zinc-200/20" />
                  </div>
                  <span className="block w-full text-center font-normal">
                    Dark
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="system"
                  id="theme-system"
                  className="sr-only peer"
                />
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-popover/70 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="rounded-md border border-border p-2 mb-3 w-full bg-gradient-to-r from-background to-zinc-950">
                    <div className="h-2 w-3/4 rounded-lg bg-gradient-to-r from-foreground/20 to-zinc-200/20 mb-2" />
                    <div className="h-2 w-1/2 rounded-lg bg-gradient-to-r from-foreground/20 to-zinc-200/20" />
                  </div>
                  <span className="block w-full text-center font-normal">
                    System
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
