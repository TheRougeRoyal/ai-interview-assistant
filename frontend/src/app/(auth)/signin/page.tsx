"use client"
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useLogin } from '@/src/features/auth/queries'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const Schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export default function SignInPage() {
  const form = useForm({ resolver: zodResolver(Schema), defaultValues: { email: '', password: '' } })
  const login = useLogin()
  const router = useRouter()
  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await login.mutateAsync(values)
              toast.success('Signed in')
              router.push('/candidates')
            } catch (e) {
              toast.error('Sign in failed')
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
          <Button type="submit" className="w-full" disabled={login.isPending}>Sign in</Button>
        </form>
      </Form>
    </div>
  )
}

