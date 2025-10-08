"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabSwitcher({
  TabOne,
  TabTow,
}: {
  TabOne: React.ReactNode;
  TabTow: React.ReactNode;
}) {
  return (
    <Tabs
      defaultValue="Sign-In"
      className="max-sm:w-full max-sm:p-2 sm:w-[420px]"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="Sign-In">Sign In</TabsTrigger>
        <TabsTrigger value="Sign-Up">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="Sign-In">{TabOne}</TabsContent>
      <TabsContent value="Sign-Up">{TabTow}</TabsContent>
    </Tabs>
  );
}
