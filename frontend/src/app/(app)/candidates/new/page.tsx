"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CandidateCreateSchema, type CandidateCreateInput } from '@/src/features/candidates/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useCreateCandidate } from '@/src/features/candidates/queries'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function NewCandidatePage() {
  const form = useForm<CandidateCreateInput>({ resolver: zodResolver(CandidateCreateSchema), defaultValues: { name: '', email: '' } })
  const mutation = useCreateCandidate()
  const router = useRouter()
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">New Candidate</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const res = await mutation.mutateAsync(values)
              toast.success('Created')
              router.push(`/candidates/${res.id}`)
            } catch {
              toast.error('Create failed')
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
          <Button type="submit" disabled={mutation.isPending}>Create</Button>
        </form>
      </Form>
    </div>
  )
}

