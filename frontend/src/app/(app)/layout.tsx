"use client"
import { ReactNode, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SideNav } from "@/src/components/app-shell/SideNav"
import { TopBar } from "@/src/components/app-shell/TopBar"
import RequireAuth from "@/src/components/auth/RequireAuth"

export default function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <RequireAuth>
      <div className="min-h-screen grid grid-rows-[auto_1fr]">
        <TopBar onOpenNav={() => setOpen(true)} />
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
          <aside className="hidden md:block border-r"><SideNav /></aside>
          <main className="p-4">{children}</main>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="hidden">Open</Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SideNav />
          </SheetContent>
        </Sheet>
      </div>
    </RequireAuth>
  )
}

