"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { resources } from "@/src/lib/resources"

export function SideNav() {
  const pathname = usePathname()
  return (
    <nav className="p-2">
      <ul className="space-y-1">
        {resources.map((r) => {
          const href = `/` + r.path.replace(/^\//, "")
          const active = pathname?.startsWith(href)
          return (
            <li key={r.path}>
              <Link href={href} className={cn("block rounded px-3 py-2 text-sm", active ? "bg-accent" : "hover:bg-accent/50")}>{r.name}</Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

