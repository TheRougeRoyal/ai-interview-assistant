import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 bg-muted rounded animate-pulse w-32" />
      </TableCell>
      <TableCell>
        <div className="h-4 bg-muted rounded animate-pulse w-48" />
      </TableCell>
      <TableCell>
        <div className="h-6 bg-muted rounded animate-pulse w-12" />
      </TableCell>
      <TableCell>
        <div className="h-4 bg-muted rounded animate-pulse w-16" />
      </TableCell>
      <TableCell>
        <div className="h-6 bg-muted rounded animate-pulse w-20" />
      </TableCell>
    </TableRow>
  )
}

export function SkeletonTable() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}