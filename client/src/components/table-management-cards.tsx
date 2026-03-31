import { Badge } from "@/components/ui/badge"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type TableManagementCardsProps = {
  totalTables: number
  available: number
  occupied: number
}

export function TableManagementCards({
  totalTables,
  available,
  occupied,
}: TableManagementCardsProps) {
  const availablePercent =
    totalTables > 0 ? Math.round((available / totalTables) * 100) : 0
  const occupiedPercent =
    totalTables > 0 ? Math.round((occupied / totalTables) * 100) : 0

  return (
    <div className="*:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 md:grid-cols-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      <Card className="@container/card">
        <CardHeader className="relative">
          <p className="text-sm text-muted-foreground">Total Tables</p>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {totalTables}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="rounded-lg border-blue-200 bg-blue-50 text-xs text-blue-700"
            >
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Includes indoor and outdoor seating.
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <p className="text-sm text-muted-foreground">Available</p>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {available}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="rounded-lg border-green-200 bg-green-50 text-xs text-green-700"
            >
              {availablePercent}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Ready for new guests right now.
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <p className="text-sm text-muted-foreground">Occupied</p>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {occupied}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge
              variant="outline"
              className="rounded-lg border-amber-200 bg-amber-50 text-xs text-amber-700"
            >
              {occupiedPercent}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Currently serving active sessions.
        </CardFooter>
      </Card>
    </div>
  )
}
