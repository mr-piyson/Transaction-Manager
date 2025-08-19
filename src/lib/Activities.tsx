
export const Activities = (role: string | undefined | null) => {
  switch (role) {
    case "Admin":
      return [
        {
          title: "Dashboard",
          url: "/App/Dashboard",
          icon: "icon-[solar--chart-square-linear]",
        },
        {
          title: "Tickets",
          url: "/App/Tickets",
          icon: "icon-[solar--ticket-linear]",
        },
        {
          title: "Assets",
          url: "/App/Assets",
          icon: "icon-[streamline--computer-pc-desktop]",
        },
        {
          title: "Employees",
          url: "/App/Employees",
          icon: "icon-[solar--user-circle-linear]",
        },
        {
          title: "Notifications",
          url: "/App/Notifications",
          icon: "icon-[hugeicons--notification-01]",
        },
        {
          title: "Contracts",
          url: `/App/Contracts`,
          icon: "icon-[hugeicons--contracts]",
        },
        {
          title: "Accounts",
          url: "/App/Accounts",
          icon: "icon-[hugeicons--user-account]",
        },
        {
          title: "Stock",
          url: "/App/Stock",
          icon: "icon-[solar--box-outline]",
        },
        {
          title: "Vendors",
          url: "/App/Vendors",
          icon: "icon-[icon-park-outline--weixin-market]",
        },
        {
          title: "Settings",
          url: "/App/Settings",
          icon: "icon-[solar--settings-linear]",
        },
      ];
    case "User":
      return [
        {
          title: "Job Cards",
          url: "/App/JobCards",
          icon: "icon-[fluent--card-ui-24-regular]",
        },
      ];
    default:
      return [
        {
          title: "Dashboard",
          url: "/App/Dashboard",
          icon: "icon-[solar--chart-square-linear]",
        },
      ];
  }
};
