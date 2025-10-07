
import { Users } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">No candidates yet</h3>
      
      <p className="text-muted-foreground text-center max-w-sm">
        Run an interview to see candidates here.
      </p>
    </div>
  )
}