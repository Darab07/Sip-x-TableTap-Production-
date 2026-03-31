"use client"

import * as React from "react"
import {
  ClipboardListIcon,
  LineChartIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  MegaphoneIcon,
  QrCodeIcon,
  ReceiptTextIcon,
  UtensilsCrossedIcon,
} from "lucide-react"
import { useLocation } from "wouter"
import { fetchOutlets } from "@/lib/tabletap-supabase-api"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Sip",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navSecondary: [
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
  ],
  comingSoon: [
    {
      title: "Marketing",
      url: "#",
      icon: MegaphoneIcon,
      disabled: true,
    },
    {
      title: "QR Management",
      url: "#",
      icon: QrCodeIcon,
      disabled: true,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  dashboardRole?: "owner" | "manager" | "admin"
}

export function AppSidebar({
  dashboardRole,
  ...props
}: AppSidebarProps) {
  const [location] = useLocation()
  const [outlets, setOutlets] = React.useState<
    Array<{ id: string; branchCode: string; branchLabel: string; restaurantName: string }>
  >([])
  const [selectedOutlet, setSelectedOutlet] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetchOutlets()
        if (!cancelled) {
          setOutlets(response.outlets)
          setSelectedOutlet((current) =>
            current || response.outlets[0]?.branchCode || ""
          )
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Outlets sync failed:", error)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])
  const resolvedRole =
    dashboardRole ??
    (location.startsWith("/restaurant/manager")
      ? "manager"
      : location.startsWith("/restaurant/admin")
        ? "admin"
        : "owner")
  const routeBase =
    resolvedRole === "manager"
      ? "/restaurant/manager"
      : resolvedRole === "admin"
        ? "/restaurant/admin"
        : "/restaurant"
  const ownerLikeNav = [
    {
      title: "Dashboard",
      url: `${routeBase}/dashboard`,
      icon: LayoutDashboardIcon,
      isActive: location.startsWith(`${routeBase}/dashboard`),
    },
    {
      title: "Table Insights",
      url: `${routeBase}/table-management`,
      icon: ListIcon,
      isActive: location.startsWith(`${routeBase}/table-management`),
    },
    {
      title: "Order Insights",
      url: `${routeBase}/orders`,
      icon: ClipboardListIcon,
      isActive: location.startsWith(`${routeBase}/orders`),
    },
    {
      title: "Menu Insights",
      url: `${routeBase}/menu-insights`,
      icon: LineChartIcon,
      isActive: location.startsWith(`${routeBase}/menu-insights`),
    },
  ]
  const navMain =
    resolvedRole === "manager"
      ? [
          {
            title: "Live Orders",
            url: `${routeBase}/live-orders`,
            icon: ClipboardListIcon,
            isActive:
              location.startsWith(`${routeBase}/live-orders`) ||
              location.startsWith(`${routeBase}/dashboard`),
          },
          {
            title: "Menu Management",
            url: `${routeBase}/menu-management`,
            icon: UtensilsCrossedIcon,
            isActive: location.startsWith(`${routeBase}/menu-management`),
          },
          {
            title: "Table Management",
            url: `${routeBase}/table-management`,
            icon: ListIcon,
            isActive: location.startsWith(`${routeBase}/table-management`),
          },
        ]
      : resolvedRole === "admin"
        ? [
            ...ownerLikeNav,
            {
              title: "Earnings & Invoicing",
              url: `${routeBase}/earnings`,
              icon: ReceiptTextIcon,
              isActive: location.startsWith(`${routeBase}/earnings`),
            },
            {
              title: "QR Management",
              url: `${routeBase}/qr-management`,
              icon: QrCodeIcon,
              isActive: location.startsWith(`${routeBase}/qr-management`),
            },
          ]
        : ownerLikeNav
  const managerSection = [
    {
      title: "Order Management",
      url:
        resolvedRole === "owner"
          ? "/restaurant/tools-manager/order-management"
          : "/restaurant/manager/live-orders",
      icon: ClipboardListIcon,
      isActive:
        location.startsWith("/restaurant/tools-manager/order-management") ||
        location.startsWith("/restaurant/manager/live-orders") ||
        location.startsWith("/restaurant/manager/dashboard"),
    },
    {
      title: "Menu Management",
      url:
        resolvedRole === "owner"
          ? "/restaurant/tools-manager/menu-management"
          : "/restaurant/manager/menu-management",
      icon: UtensilsCrossedIcon,
      isActive:
        location.startsWith("/restaurant/tools-manager/menu-management") ||
        location.startsWith("/restaurant/manager/menu-management"),
    },
    {
      title: "Table Management",
      url:
        resolvedRole === "owner"
          ? "/restaurant/tools-manager/table-management"
          : "/restaurant/manager/table-management",
      icon: ListIcon,
      isActive:
        location.startsWith("/restaurant/tools-manager/table-management") ||
        location.startsWith("/restaurant/manager/table-management"),
    },
  ]
  const user = {
    ...data.user,
    subtitle:
      resolvedRole === "manager"
        ? "Manager view"
        : resolvedRole === "admin"
          ? "Admin view"
          : "Owner view",
  }
  const selectedOutletConfig =
    outlets.find((outlet) => outlet.branchCode === selectedOutlet) ?? outlets[0]
  const sidebarCollapsibleMode = resolvedRole === "manager" ? "offcanvas" : "none"
  const sidebarClassName =
    resolvedRole === "owner" ? "md:sticky md:top-0 md:h-svh" : undefined

  return (
    <Sidebar
      {...props}
      collapsible={sidebarCollapsibleMode}
      className={sidebarClassName}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a
                href={
                  resolvedRole === "manager"
                    ? `${routeBase}/live-orders`
                    : `${routeBase}/dashboard`
                }
              >
                <img
                  src="/edit.png"
                  alt="Table Tap logo"
                  className="h-[6.5rem] w-[6.5rem] rounded-md object-contain"
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {resolvedRole !== "manager" ? (
          <div className="px-2 pt-1">
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-full">
                {resolvedRole === "admin" ? (
                  <div className="grid text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {selectedOutletConfig?.restaurantName ?? "Sip"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {selectedOutletConfig?.branchLabel ?? "F7, Islamabad"}
                    </span>
                  </div>
                ) : (
                  <span className="truncate text-sm font-medium">
                    {selectedOutletConfig?.branchLabel ?? "F7, Islamabad"}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.branchCode}>
                    {resolvedRole === "admin" ? (
                      <div className="grid leading-tight">
                        <span className="text-sm font-medium">{outlet.restaurantName}</span>
                        <span className="text-xs text-muted-foreground">{outlet.branchLabel}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">{outlet.branchLabel}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <NavMain items={navMain} />
        {resolvedRole === "owner" ? (
          <NavSecondary
            label="Manager"
            items={managerSection}
          />
        ) : null}
        {resolvedRole === "owner" ? (
          <NavSecondary
            label="Coming Soon"
            items={data.comingSoon}
          />
        ) : null}
        <div className="mt-auto">
          <NavSecondary items={data.navSecondary} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
