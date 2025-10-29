import { Badge } from '@/components/ui/badge'

interface RubricPillsProps {
  rubric?: {
    accuracy: number
    completeness: number
    relevance: number
    timeliness: number
  }
}

export function RubricPills({ rubric }: RubricPillsProps) {
  if (!rubric) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Not submitted
        </Badge>
      </div>
    )
  }

  const total = rubric.accuracy + rubric.completeness + rubric.relevance + rubric.timeliness

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="text-xs">
        A: {rubric.accuracy}
      </Badge>
      <Badge variant="secondary" className="text-xs">
        C: {rubric.completeness}
      </Badge>
      <Badge variant="secondary" className="text-xs">
        R: {rubric.relevance}
      </Badge>
      <Badge variant="secondary" className="text-xs">
        T: {rubric.timeliness}
      </Badge>
      <Badge className="text-xs font-semibold">
        Total: {total}
      </Badge>
    </div>
  )
}