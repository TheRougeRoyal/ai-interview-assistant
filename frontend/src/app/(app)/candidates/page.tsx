"use client"
import { DataTable } from "@/src/components/data-table/DataTable"
import { useCandidateList } from "@/src/features/candidates/queries"
import { useTableState } from "@/src/lib/useTableState"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CandidatesPage() {
  const { state, set } = useTableState()
  const { data, isLoading, error } = useCandidateList({
    q: state.q || undefined,
    limit: state.limit,
    cursor: state.cursor,
    sortBy: state.sortBy as any,
    order: state.order as any,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Candidates</h1>
        <Button asChild><Link href="/candidates/new">New</Link></Button>
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'finalScore', header: 'Score' },
        ]}
        data={data?.items ?? []}
        total={null}
        page={Number(state.page)}
        pageSize={Number(state.limit)}
        onPageChange={(p) => set({ page: p })}
        onFilter={(q) => set({ q, page: 1 })}
        isLoading={isLoading}
        error={error ? 'Failed to load' : null}
        rowActions={(row) => (
          <>
            <Link href={`/candidates/${row.id}`}>View</Link>
          </>
        )}
      />
    </div>
  )
}

