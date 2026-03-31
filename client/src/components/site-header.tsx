import type { ReactNode } from "react"
import { useLocation } from "wouter"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title = "Dashboard",
  actions,
}: {
  title?: string
  actions?: ReactNode
}) {
  const [location] = useLocation()
  const showSidebarTrigger = location.startsWith("/restaurant/manager")

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex min-h-12 shrink-0 items-center gap-2 border-b py-2 transition-[width,height] ease-linear">
      <div className="flex w-full flex-wrap items-center gap-2 px-4 lg:gap-2 lg:px-6">
        {showSidebarTrigger ? (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </>
        ) : null}
        <h1 className="text-base font-medium">{title}</h1>
        {actions ? <div className="ml-auto w-full sm:w-auto">{actions}</div> : null}
      </div>
    </header>
  )
}
