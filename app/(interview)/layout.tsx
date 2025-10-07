import { WelcomeBackModal } from '@/components/modals/WelcomeBackModal'

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
      <WelcomeBackModal />
    </div>
  )
}