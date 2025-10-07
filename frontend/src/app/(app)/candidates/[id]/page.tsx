"use client"
import { useParams, useRouter } from 'next/navigation'
import { useCandidate, useUpdateCandidate } from '@/src/features/candidates/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { data, isLoading } = useCandidate(id)
  const router = useRouter()
  const mutation = useUpdateCandidate(id)

  const form = useForm({ defaultValues: { name: data?.name ?? '', email: data?.email ?? '' }, values: { name: data?.name ?? '', email: data?.email ?? '' } })

  if (isLoading) return <div className="space-y-2"><div className="h-6 w-40 bg-muted animate-pulse" /><div className="h-32 bg-muted animate-pulse" /></div>
  if (!data) return <div>No candidate</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Candidate</h1>
        <Dialog>
          <DialogTrigger asChild><Button>Edit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Candidate</DialogTitle></DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (values) => {
                  try {
                    await mutation.mutateAsync(values)
                    toast.success('Saved')
                    router.refresh()
                  } catch {
                    toast.error('Save failed')
                  }
                })}
                className="space-y-4"
              >
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={mutation.isPending}>Save</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>{data.name}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div>Email: {data.email}</div>
            {data.finalScore != null && <div>Score: {data.finalScore}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

