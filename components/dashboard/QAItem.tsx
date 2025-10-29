import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RubricPills } from './RubricPills'

interface QAItemProps {
  questionIndex: number
  difficulty: string
  question: string
  answerText?: string
  durationMs: number
  timeTakenMs?: number
  rubric?: {
    accuracy: number
    completeness: number
    relevance: number
    timeliness: number
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${seconds}s`
}

export const QAItem = memo(({ 
  questionIndex, 
  difficulty, 
  question, 
  answerText, 
  durationMs, 
  timeTakenMs, 
  rubric 
}: QAItemProps) => {
  const formattedDuration = useMemo(() => formatDuration(durationMs), [durationMs])
  const formattedTimeTaken = useMemo(() => 
    timeTakenMs ? formatDuration(timeTakenMs) : null, 
    [timeTakenMs]
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Q{questionIndex + 1} • {difficulty}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium text-sm mb-2">Question:</p>
          <p className="text-sm text-muted-foreground">{question}</p>
        </div>
        
        <div>
          <p className="font-medium text-sm mb-2">Answer:</p>
          {answerText ? (
            <p className="text-sm">{answerText}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No answer provided</p>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Duration: {formattedDuration}</span>
            {formattedTimeTaken && (
              <span>Taken: {formattedTimeTaken}</span>
            )}
          </div>
          <RubricPills rubric={rubric} />
        </div>
      </CardContent>
    </Card>
  )
})
QAItem.displayName = 'QAItem'