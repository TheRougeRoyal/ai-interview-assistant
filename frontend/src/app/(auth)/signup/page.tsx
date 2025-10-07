"use client"
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useRegister } from '@/src/features/auth/queries'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const Schema = z.object({ email: z.string().email(), password: z.string().min(8), role: z.enum(['interviewer','interviewee']) })

export default function SignUpPage() {
  const form = useForm({ resolver: zodResolver(Schema), defaultValues: { email: '', password: '', role: 'interviewee' } })
  const mutation = useRegister()
  const router = useRouter()
  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Sign up</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await mutation.mutateAsync(values)
              toast.success('Account created')
              router.push('/candidates')
            } catch (e) {
              toast.error('Sign up failed')
            }
          })}
          className="space-y-4"
        >
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="password" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="role" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interviewer">Interviewer</SelectItem>
                  <SelectItem value="interviewee">Interviewee</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>Sign up</Button>
        </form>
      </Form>
    </div>
  )
}

