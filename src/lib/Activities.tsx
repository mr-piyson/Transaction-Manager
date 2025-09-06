// Make Activities for each role of the user
// import { Account } from "@prisma/client";

export const Activities = (role: string | undefined | null) => {
  switch (role) {
    case "Admin":
      return [
        {
          title: "Sales",
          url: "/App/Sales",
          icon: "icon-[stash--folder-alt]",
        },
        {
          title: "Accounts",
          url: "/App/Accounts",
          icon: "icon-[hugeicons--user-account]",
        },
        {
          title: "Inventory",
          url: "/App/Inventory",
          icon: "icon-[solar--box-outline]",
          children: [
            {
              title: "Assets",
              url: "/App/Inventory/Assets",
              icon: "icon-[solar--box-outline]",
            },
            {
              title: "Stock",
              url: "/App/Inventory/Stock",
              icon: "icon-[solar--box-outline]",
            },
            {
              title: "Suppliers",
              url: "/App/Inventory/Suppliers",
              icon: "icon-[solar--box-outline]",
            },
          ],
        },
        {
          title: "Settings",
          url: "/App/Settings",
          icon: "icon-[solar--settings-linear]",
        },
        {
          title: "Dashboard",
          url: "/App/Dashboard",
          icon: "icon-[solar--chart-square-linear]",
        },
        {
          title: "Notes",
          url: "/App/Notes",
          icon: "icon-[mage--note]",
        },
        {
          title: "Customers",
          url: "/App/Customers",
          icon: "icon-[bi--people]",
        },
      ];
    default:
      return [];
  }
};
