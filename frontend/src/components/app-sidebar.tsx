"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Box, Package, Users, ArrowRightLeft, AlertTriangle, LogOut } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { usersAPI } from "@/lib/api"

export function AppSidebar() {
  const { data: session } = useSession()
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const loadMe = async () => {
      try {
        const me = await usersAPI.me()
        if (mounted) {
          setRole(me?.role ?? null)
          setName((me as any)?.name ?? (session?.user?.name ?? null))
          setEmail((me as any)?.email ?? (session?.user?.email ?? null))
        }
      } catch {
        // ignore
      }
    }
    // Selalu ambil identitas dari API; fallback ke session jika ada
    loadMe()
    return () => { mounted = false }
  }, [session])

  const isAdmin = role === "admin"

  const handleLogout = async () => {
    try {
      const { signOut } = await import("@/lib/supabase")
      await signOut()
      localStorage.removeItem("token")
      router.push("/")
    } catch (e) {
      console.error("Logout error:", e)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span className="text-xl font-bold">Inventori</span>
        </Link>
      </SidebarHeader>
      <div className="flex flex-col flex-1 p-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Menu</p>
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
              <Box className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/products" className="flex items-center px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
              <Package className="mr-2 h-4 w-4" />
              Barang
            </Link>
            <Link href="/transactions" className="flex items-center px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transaksi
            </Link>
            <Link href="/low-stock" className="flex items-center px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Stok Menipis
            </Link>
            
            {isAdmin && (
              <Link href="/users" className="flex items-center px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
                <Users className="mr-2 h-4 w-4" />
                Pengguna
              </Link>
            )}
          </nav>
        </div>
      </div>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">{name || "User"}</div>
            <div className="text-muted-foreground">{email || ""}</div>
            <div className="text-xs text-muted-foreground">Role: {role || "guest"}</div>
          </div>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Keluar</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}