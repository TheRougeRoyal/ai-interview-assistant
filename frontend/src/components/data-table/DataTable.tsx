"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MoreHorizontal } from "lucide-react"

type Column<T> = { key: keyof T; header: string; render?: (row: T) => React.ReactNode; sortable?: boolean }

export function DataTable<T extends { id: string }>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onSort,
  onFilter,
  isLoading,
  error,
  filterValue,
  rowActions,
}: {
  columns: Column<T>[]
  data: T[]
  total?: number | null
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSort?: (key: string) => void
  onFilter?: (q: string) => void
  isLoading?: boolean
  error?: string | null
  filterValue?: string
  rowActions?: (row: T) => React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Filter" value={filterValue ?? ''} onChange={(e) => onFilter?.(e.target.value)} className="max-w-xs" />
        <Select value={String(pageSize)} onValueChange={(v) => onPageChange(1)}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10,20,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={String(col.key)}>{col.header}</TableHead>
              ))}
              {rowActions && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.id}>
                {columns.map(col => (
                  <TableCell key={String(col.key)}>{col.render ? col.render(row) : String(row[col.key])}</TableCell>
                ))}
                {rowActions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions(row)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{total ?? data.length} items</div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => onPageChange(Math.max(1, page - 1))} />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext onClick={() => onPageChange(page + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

