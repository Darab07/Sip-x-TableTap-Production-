"use client"

import * as React from "react"
import {
  Clock3Icon,
  LogOutIcon,
  MoreVerticalIcon,
} from "lucide-react"
import { useLocation } from "wouter"
import { clearRestaurantAuthentication } from "@/lib/restaurant-auth"
import { supabaseBrowser } from "@/lib/supabase"
import { useActiveBranchCode } from "@/lib/active-branch"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OutletOrderingSettingsCard } from "@/components/outlet-ordering-settings-card"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type DashboardRole = "owner" | "manager" | "admin"
const DEFAULT_BRANCH_CODE =
  String(import.meta.env.VITE_DEFAULT_BRANCH_CODE ?? "").trim() || "f7-islamabad"

export function NavUser({
  user,
  dashboardRole,
}: {
  user: {
    name: string
    email: string
    avatar: string
    subtitle?: string
  }
  dashboardRole: DashboardRole
}) {
  const { isMobile } = useSidebar()
  const [location, setLocation] = useLocation()
  const [showRestaurantTimings, setShowRestaurantTimings] = React.useState(false)
  const activeBranchCode = useActiveBranchCode(DEFAULT_BRANCH_CODE)

  const canManageRestaurantTimings =
    dashboardRole === "owner" || dashboardRole === "manager"

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg grayscale">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="overflow-hidden rounded-lg p-0">
                    <img
                      src="/logo.png"
                      alt="Table Tap logo"
                      className="h-full w-full object-cover"
                    />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  {user.subtitle ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {user.subtitle}
                    </span>
                  ) : null}
                </div>
                <MoreVerticalIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="overflow-hidden rounded-lg p-0">
                      <img
                        src="/logo.png"
                        alt="Table Tap logo"
                        className="h-full w-full object-cover"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    {user.subtitle ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {user.subtitle}
                      </span>
                    ) : null}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canManageRestaurantTimings ? (
                <DropdownMenuItem
                  onSelect={() => setShowRestaurantTimings(true)}
                >
                  <Clock3Icon />
                  Restaurant timings
                </DropdownMenuItem>
              ) : null}
              {canManageRestaurantTimings ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    if (supabaseBrowser) {
                      await supabaseBrowser.auth.signOut()
                    }
                  } finally {
                    clearRestaurantAuthentication()
                    if (location.startsWith("/restaurant/manager")) {
                      setLocation("/restaurant/manager")
                      return
                    }

                    setLocation("/restaurant")
                  }
                }}
              >
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={showRestaurantTimings} onOpenChange={setShowRestaurantTimings}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Restaurant Timings</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-3">
            <OutletOrderingSettingsCard branchCode={activeBranchCode} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
