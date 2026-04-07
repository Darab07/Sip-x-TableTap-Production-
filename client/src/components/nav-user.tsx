"use client"

import {
  LogOutIcon,
  MoreVerticalIcon,
} from "lucide-react"
import { useLocation } from "wouter"
import { clearRestaurantAuthentication } from "@/lib/restaurant-auth"
import { supabaseBrowser } from "@/lib/supabase"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    subtitle?: string
  }
}) {
  const { isMobile } = useSidebar()
  const [location, setLocation] = useLocation()

  return (
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
  )
}

