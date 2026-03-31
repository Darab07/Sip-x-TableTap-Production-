import * as React from "react"
import { SearchIcon } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { ManagerWaiterAlertOverlay } from "@/components/manager-waiter-alert-overlay"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  fetchManagerMenuItems,
  updateManagerMenuItemApi,
} from "@/lib/tabletap-supabase-api"

type MenuItemRecord = {
  id: string
  name: string
  category: string
  price: number
  available: boolean
  updatedAt: string
}

type AvailabilityFilter = "all" | "available" | "out-of-stock"

type RestaurantManagerMenuManagementProps = {
  pageTitle?: string
  sectionTitle?: string
  dashboardRole?: "owner" | "manager" | "admin"
}

const formatPrice = (value: number) => `Rs. ${value.toLocaleString("en-PK")}`

const formatUpdatedAt = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

const getAvailabilityClass = (available: boolean) =>
  available
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-red-200 bg-red-50 text-red-700"

export default function RestaurantManagerMenuManagement({
  pageTitle = "Menu Management",
  sectionTitle = "Menu Items",
  dashboardRole = "manager",
}: RestaurantManagerMenuManagementProps) {
  const [items, setItems] = React.useState<MenuItemRecord[]>([])
  const [search, setSearch] = React.useState("")
  const [availabilityFilter, setAvailabilityFilter] =
    React.useState<AvailabilityFilter>("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [editingPriceItemId, setEditingPriceItemId] = React.useState<string | null>(
    null
  )
  const [priceInput, setPriceInput] = React.useState("")
  const [priceError, setPriceError] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    let inFlight = false
    const load = async () => {
      if (cancelled || inFlight) return
      if (typeof document !== "undefined" && document.hidden) return
      inFlight = true
      try {
        const response = await fetchManagerMenuItems("f7-islamabad")
        if (!cancelled) {
          setItems(response.items)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Manager menu items sync failed:", error)
        }
      } finally {
        inFlight = false
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 15000)
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void load()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  const categories = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items]
  )

  const filteredItems = React.useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return items
      .filter((item) => {
        const matchesSearch =
          normalized.length === 0 ||
          item.name.toLowerCase().includes(normalized) ||
          item.category.toLowerCase().includes(normalized)

        const matchesAvailability =
          availabilityFilter === "all" ||
          (availabilityFilter === "available" && item.available) ||
          (availabilityFilter === "out-of-stock" && !item.available)

        const matchesCategory =
          categoryFilter === "all" || item.category === categoryFilter

        return matchesSearch && matchesAvailability && matchesCategory
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, search, availabilityFilter, categoryFilter])

  const editingItem =
    editingPriceItemId !== null
      ? items.find((item) => item.id === editingPriceItemId) ?? null
      : null

  const setItemAvailability = async (itemId: string, available: boolean) => {
    const now = new Date().toISOString()
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, available, updatedAt: now } : item
      )
    )
    try {
      await updateManagerMenuItemApi({ itemId, available })
    } catch (error) {
      console.warn("Failed to update item availability:", error)
    }
  }

  const openPriceEditor = (item: MenuItemRecord) => {
    setEditingPriceItemId(item.id)
    setPriceInput(String(item.price))
    setPriceError("")
  }

  const closePriceEditor = () => {
    setEditingPriceItemId(null)
    setPriceInput("")
    setPriceError("")
  }

  const applyPriceUpdate = async () => {
    if (!editingItem) {
      return
    }

    const parsedPrice = Number(priceInput)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setPriceError("Enter a valid price greater than 0.")
      return
    }

    const roundedPrice = Math.round(parsedPrice)
    const now = new Date().toISOString()

    setItems((current) =>
      current.map((item) =>
        item.id === editingItem.id
          ? { ...item, price: roundedPrice, updatedAt: now }
          : item
      )
    )
    try {
      await updateManagerMenuItemApi({
        itemId: editingItem.id,
        price: roundedPrice,
      })
    } catch (error) {
      console.warn("Failed to update item price:", error)
    }
    closePriceEditor()
  }

  return (
    <SidebarProvider
      style={
        {
          ["--sidebar-width" as string]: "16rem",
          ["--header-height" as string]: "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" dashboardRole={dashboardRole} />
      <SidebarInset>
        <SiteHeader title={pageTitle} />
        <ManagerWaiterAlertOverlay />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Card className="mx-4 lg:mx-6">
                <CardHeader className="space-y-4">
                  <div>
                    <CardTitle>{sectionTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      View all items, search, filter, and manage stock status for daily operations.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:w-80">
                      <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-8"
                        placeholder="Search item or category"
                      />
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                      <Select
                        value={availabilityFilter}
                        onValueChange={(value) =>
                          setAvailabilityFilter(value as AvailabilityFilter)
                        }
                      >
                        <SelectTrigger className="w-full md:w-44">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">Category: All</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No menu items found for selected filters.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 md:hidden">
                        {filteredItems.map((item) => (
                          <div key={item.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={getAvailabilityClass(item.available)}
                              >
                                {item.available ? "Available" : "Out of Stock"}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Last Updated</p>
                                <p className="text-sm font-medium">{formatUpdatedAt(item.updatedAt)}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPriceEditor(item)}
                                >
                                  Change Price
                                </Button>
                                {item.available ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setItemAvailability(item.id, false)}
                                  >
                                    Mark Out of Stock
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setItemAvailability(item.id, true)}
                                  >
                                    Mark Available
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden md:block lg:hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="space-y-0.5">
                                    <p className="font-medium leading-none">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Updated {formatUpdatedAt(item.updatedAt)}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPrice(item.price)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={getAvailabilityClass(item.available)}
                                  >
                                    {item.available ? "Available" : "Out of Stock"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => openPriceEditor(item)}
                                    >
                                      Change Price
                                    </Button>
                                    {item.available ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                          setItemAvailability(item.id, false)
                                        }
                                      >
                                        Mark Out
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                          setItemAvailability(item.id, true)
                                        }
                                      >
                                        Mark Available
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="hidden lg:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead>Availability Status</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell className="text-right">
                                  {formatPrice(item.price)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={getAvailabilityClass(item.available)}
                                  >
                                    {item.available ? "Available" : "Out of Stock"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatUpdatedAt(item.updatedAt)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openPriceEditor(item)}
                                    >
                                      Change Price
                                    </Button>
                                    {item.available ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setItemAvailability(item.id, false)
                                        }
                                      >
                                        Mark Out of Stock
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          setItemAvailability(item.id, true)
                                        }
                                      >
                                        Mark Available
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && closePriceEditor()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change price</DialogTitle>
            <DialogDescription>
              Update the current price for {editingItem?.name ?? "this item"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="price-input">New price (PKR)</Label>
            <Input
              id="price-input"
              type="number"
              min="1"
              step="1"
              value={priceInput}
              onChange={(event) => {
                setPriceInput(event.target.value)
                setPriceError("")
              }}
              placeholder="Enter new price"
            />
            {priceError ? (
              <p className="text-sm text-red-600">{priceError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePriceEditor}>
              Cancel
            </Button>
            <Button onClick={applyPriceUpdate}>Save price</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
