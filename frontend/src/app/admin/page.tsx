"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usersAPI } from "@/lib/api"
import { toast } from "sonner"

type Profile = { id: string; email: string; role: "admin" | "user" | "operator"; created_at?: string }

export default function AdminPage() {
  const [list, setList] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [form, setForm] = useState<{ email: string; password: string; role: "admin" | "user" | "operator"; name?: string }>({
    email: "",
    password: "",
    role: "user",
    name: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.getAll()
      setList(data)
    } catch (e) {
      console.error(e)
      toast.error("Gagal memuat daftar pengguna (butuh akses admin)")
    } finally {
      setLoading(false)
    }
  }

  // Cek role pengguna terlebih dahulu
  useEffect(() => {
    const checkRole = async () => {
      try {
        const me = await usersAPI.me()
        const admin = me?.role === "admin"
        setIsAdmin(admin)
        if (admin) {
          await load()
        } else {
          setLoading(false)
        }
      } catch (e) {
        console.error(e)
        setIsAdmin(false)
        setLoading(false)
      } finally {
        setCheckingRole(false)
      }
    }
    checkRole()
  }, [])

  const submit = async () => {
    try {
      if (!isAdmin) {
        toast.error("Akses ditolak: hanya admin yang dapat membuat akun")
        return
      }
      if (!form.email || !form.password) {
        toast.error("Email dan password wajib diisi")
        return
      }
      setSubmitting(true)
      await usersAPI.create({ email: form.email, password: form.password, role: form.role, name: form.name })
      toast.success("Pengguna berhasil dibuat")
      setForm({ email: "", password: "", role: "user", name: "" })
      load()
    } catch (e) {
      console.error(e)
      toast.error("Gagal membuat pengguna (pastikan token admin)")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Beranda</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Admin</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <h1 className="text-2xl font-bold">Manajemen Pengguna (Admin)</h1>

          {checkingRole ? (
            <Card className="p-4">Memeriksa akses...</Card>
          ) : isAdmin ? (
            <>
              <Card className="p-4">
                <h2 className="text-lg font-semibold mb-3">Tambah Akun</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama (opsional)</Label>
                    <Input
                      value={form.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={form.role}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, role: e.target.value as "admin" | "user" | "operator" })}
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button disabled={submitting} onClick={submit}>Buat Akun</Button>
                </div>
              </Card>

              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Email</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Dibuat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="p-3" colSpan={3}>Memuat...</td></tr>
                    ) : list.length === 0 ? (
                      <tr><td className="p-3" colSpan={3}>Belum ada pengguna</td></tr>
                    ) : (
                      list.map((u) => (
                        <tr key={u.id} className="border-b">
                          <td className="p-2">{u.email}</td>
                          <td className="p-2">{u.role}</td>
                          <td className="p-2">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          ) : (
            <Card className="p-4">
              <p className="font-medium">Akses ditolak</p>
              <p className="text-sm text-muted-foreground">Halaman ini hanya untuk admin.</p>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
