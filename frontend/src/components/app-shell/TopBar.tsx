"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun, User } from "lucide-react"
import { useRouter } from "next/navigation"

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <Button variant="ghost" size="icon" onClick={onOpenNav} className="md:hidden">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <Input placeholder="Search" className="max-w-xs hidden md:block" />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Sun className="h-4 w-4" />
          <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
          <Moon className="h-4 w-4" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Profile</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/signin')}>Sign in</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

