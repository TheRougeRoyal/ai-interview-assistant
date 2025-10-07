'use client'

import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { CandidatePreview } from '@/types/domain'

interface CandidateTableProps {
  candidates: CandidatePreview[]
  sortField: 'name' | 'finalScore' | 'updatedAt'
  sortOrder: 'asc' | 'desc'
  onSort: (field: 'name' | 'finalScore' | 'updatedAt') => void
  onRowClick: (candidateId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

function truncateEmail(email: string, maxLength: number = 25): string {
  if (email.length <= maxLength) return email
  const [localPart, domain] = email.split('@')
  const truncated = localPart.slice(0, Math.max(1, maxLength - domain.length - 4)) + '...'
  return `${truncated}@${domain}`
}

function getScoreBadgeVariant(score: number) {
  if (score >= 90) return 'default'
  if (score >= 80) return 'secondary'
  if (score >= 70) return 'outline'
  return 'destructive'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default">Completed</Badge>
    case 'in_progress':
      return <Badge variant="secondary">In Progress</Badge>
    case 'not_started':
      return <Badge variant="outline">Not Started</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function SortableHeader({ 
  field, 
  currentField, 
  currentOrder, 
  onSort, 
  children 
}: {
  field: 'name' | 'finalScore' | 'updatedAt'
  currentField: string
  currentOrder: string
  onSort: (field: 'name' | 'finalScore' | 'updatedAt') => void
  children: React.ReactNode
}) {
  const isActive = field === currentField
  const isAsc = currentOrder === 'asc'
  
  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-medium hover:bg-transparent"
        onClick={() => onSort(field)}
        aria-sort={isActive ? (isAsc ? 'ascending' : 'descending') : 'none'}
      >
        <span className="flex items-center gap-1">
          {children}
          {isActive ? (
            isAsc ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
          ) : (
            <ChevronUpIcon className="h-3 w-3 opacity-30" />
          )}
        </span>
      </Button>
    </TableHead>
  )
}

function getDisplayScore(candidate: CandidatePreview): number | undefined {
  if (typeof candidate.finalScore === 'number') return candidate.finalScore
  const answers = candidate.sessions?.[0]?.answers || []
  const totals: number[] = answers
    .map((a: any) => {
      // Support either parsed rubric or raw rubricJson
      if (a?.rubric && typeof a.rubric.total === 'number') return a.rubric.total
      if (a?.rubricJson) {
        try {
          const parsed = JSON.parse(a.rubricJson)
          if (parsed && typeof parsed.total === 'number') return parsed.total
        } catch {
          return undefined
        }
      }
      return undefined
    })
    .filter((n): n is number => typeof n === 'number')

  if (totals.length === 0) return undefined
  const avg = totals.reduce((s, n) => s + n, 0) / totals.length
  return Math.round(avg)
}

function compareByHierarchy(a: CandidatePreview, b: CandidatePreview, field: 'name' | 'finalScore' | 'updatedAt', order: 'asc' | 'desc') {
  const statusRank: Record<string, number> = { completed: 0, in_progress: 1, not_started: 2 }
  const rankA = statusRank[a.status] ?? 3
  const rankB = statusRank[b.status] ?? 3
  if (rankA !== rankB) return rankA - rankB

  let cmp = 0
  if (field === 'finalScore') {
    const scoreA = getDisplayScore(a)
    const scoreB = getDisplayScore(b)
    if (scoreA == null && scoreB == null) cmp = 0
    else if (scoreA == null) cmp = 1
    else if (scoreB == null) cmp = -1
    else cmp = scoreA - scoreB
  } else if (field === 'updatedAt') {
    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  } else {
    cmp = a.name.localeCompare(b.name)
  }
  return order === 'asc' ? cmp : -cmp
}

export function CandidateTable({ 
  candidates, 
  sortField, 
  sortOrder, 
  onSort, 
  onRowClick 
}: CandidateTableProps) {
  const sortedCandidates = [...candidates].sort((a, b) => compareByHierarchy(a, b, sortField, sortOrder))
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <SortableHeader 
              field="name" 
              currentField={sortField} 
              currentOrder={sortOrder} 
              onSort={onSort}
            >
              Name
            </SortableHeader>
            <TableHead>Email</TableHead>
            <SortableHeader 
              field="finalScore" 
              currentField={sortField} 
              currentOrder={sortOrder} 
              onSort={onSort}
            >
              Score
            </SortableHeader>
            <TableHead>Progress</TableHead>
            <SortableHeader 
              field="updatedAt" 
              currentField={sortField} 
              currentOrder={sortOrder} 
              onSort={onSort}
            >
              Updated
            </SortableHeader>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCandidates.map((candidate) => (
            <TableRow
              key={candidate.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(candidate.id)}
              tabIndex={0}
              data-candidate-id={candidate.id}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRowClick(candidate.id)
                }
              }}
            >
              <TableCell>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {getInitials(candidate.name)}
                </div>
              </TableCell>
              <TableCell className="font-medium">{candidate.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {truncateEmail(candidate.email)}
              </TableCell>
              <TableCell>
                {(() => {
                  const display = getDisplayScore(candidate)
                  return typeof display === 'number' ? (
                    <Badge variant={getScoreBadgeVariant(display)}>
                      {display}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )
                })()}
              </TableCell>
              <TableCell>
                {candidate.sessions && candidate.sessions.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">
                      {candidate.sessions[0].answers?.length || 0}/6
                    </div>
                    <div className="w-16 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, ((candidate.sessions[0].answers?.length || 0) / 6) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not started</span>
                )}
              </TableCell>
              <TableCell>
                <span 
                  className="text-sm text-muted-foreground"
                  title={new Date(candidate.updatedAt).toLocaleString()}
                >
                  {formatRelativeTime(candidate.updatedAt)}
                </span>
              </TableCell>
              <TableCell>
                {getStatusBadge(candidate.status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}