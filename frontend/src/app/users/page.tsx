"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LuPlus, LuSearch } from "react-icons/lu"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usersAPI } from "@/lib/api"

type UserRow = {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at?: string
  updated_at?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await usersAPI.getAll()
        setUsers(data ?? [])
      } catch (e) {
        console.error("Gagal memuat pengguna:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => u.email?.toLowerCase().includes(q))
  }, [users, search])

  const toggleRole = async (u: UserRow) => {
    try {
      setUpdatingId(u.id)
      const nextRole = u.role === 'admin' ? 'user' : 'admin'
      const updated = await usersAPI.update(u.id, { role: nextRole })
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, role: updated?.role ?? nextRole } : p))
    } catch (e) {
      console.error("Gagal memperbarui peran:", e)
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Hapus pengguna ${u.email}?`)) return
    try {
      setUpdatingId(u.id)
      await usersAPI.delete(u.id)
      setUsers(prev => prev.filter(p => p.id !== u.id))
    } catch (e) {
      console.error("Gagal menghapus pengguna:", e)
    } finally {
      setUpdatingId(null)
    }
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Beranda</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pengguna</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Daftar Pengguna</h1>
            <Button asChild>
              <Link href="/admin">
                <LuPlus className="mr-2 h-4 w-4" />
                Tambah Pengguna
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <LuSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengguna..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
          
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4}>Memuat pengguna...</TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>Tidak ada data pengguna.</TableCell>
                  </TableRow>
                )}
                {!loading && filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updatingId === user.id}
                        onClick={() => toggleRole(user)}
                      >
                        {user.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        disabled={updatingId === user.id}
                        onClick={() => deleteUser(user)}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}