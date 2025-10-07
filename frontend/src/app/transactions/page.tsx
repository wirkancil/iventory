"use client"

import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { barangAPI, transaksiAPI, usersAPI } from "@/lib/api"
import { toast } from "sonner"

type Barang = { id: string | number; kode: string; nama: string; stok: number; lokasi_rak: string | null }
type Transaksi = { id: string | number; id_barang: string | number; jumlah: number; tipe_transaksi: "masuk" | "keluar"; tanggal: string; id_user: string | number; created_at: string }

function TransactionsPageContent() {
  const searchParams = useSearchParams()
  const preselectBarang = searchParams.get("id_barang") || ""
  const preselectType = (searchParams.get("tipe") as "masuk" | "keluar" | null) || null

  const [items, setItems] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<Transaksi[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [canWrite, setCanWrite] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [form, setForm] = useState<{ id_barang: string; jumlah: number; tipe_transaksi: "masuk" | "keluar"; tanggal: string }>({
    id_barang: preselectBarang,
    jumlah: 1,
    tipe_transaksi: preselectType ?? "masuk",
    tanggal: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // Cek role: operator dan admin boleh melakukan transaksi
        try {
          const me = await usersAPI.me()
          setIsAdmin(me?.role === 'admin')
          setCanWrite(me?.role === 'admin' || me?.role === 'operator')
        } catch {
          setIsAdmin(false)
          setCanWrite(false)
        }
        const data = await barangAPI.getAll()
        setItems(data)
      } catch (e) {
        console.error("Error fetching barang:", e)
        toast.error("Gagal memuat data barang")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const data = await transaksiAPI.list({ limit: 100 })
      setHistory(data)
    } catch (e) {
      console.error("Error fetching transaksi:", e)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => { loadHistory() }, [])

  const barangMap = useMemo(() => {
    const m = new Map<string, Barang>()
    items.forEach((it) => m.set(String(it.id), it))
    return m
  }, [items])

  const handleSubmit = async () => {
    try {
      if (!form.id_barang) {
        toast.error("Pilih barang terlebih dahulu")
        return
      }
      await transaksiAPI.create({
        id_barang: form.id_barang,
        jumlah: form.jumlah,
        tipe_transaksi: form.tipe_transaksi,
        tanggal: form.tanggal,
      })
      toast.success("Transaksi berhasil disimpan dan stok diperbarui")
      setForm((f) => ({ ...f, jumlah: 1 }))
      loadHistory()
    } catch (e) {
      console.error("Error creating transaction:", e)
      toast.error("Gagal menyimpan transaksi")
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
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
                  <BreadcrumbPage>Transaksi</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <h1 className="text-2xl font-bold">Transaksi Barang</h1>

          {!isAdmin && (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Anda dapat melakukan transaksi masuk/keluar untuk memperbarui stok. Penambahan produk hanya dapat dilakukan oleh admin.
              </p>
            </Card>
          )}

          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Barang</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.id_barang}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, id_barang: e.target.value })}
                  disabled={loading}
                >
                  <option value="" disabled>Pilih barang</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.kode} - {it.nama} (stok: {it.stok})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.jumlah}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value;
                    const parsed = parseInt(raw, 10);
                    const safe = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
                    setForm({ ...form, jumlah: safe });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipe Transaksi</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.tipe_transaksi}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, tipe_transaksi: e.target.value as "masuk" | "keluar" })}
                >
                  <option value="masuk">Masuk</option>
                  <option value="keluar">Keluar</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={form.tanggal}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, tanggal: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button disabled={!canWrite} onClick={handleSubmit}>Simpan Transaksi</Button>
            </div>
          </Card>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Riwayat Transaksi Terbaru</h2>
            <Card className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Tanggal</th>
                    <th className="p-2">Barang</th>
                    <th className="p-2">Tipe</th>
                    <th className="p-2">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td className="p-3" colSpan={4}>Memuat...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td className="p-3" colSpan={4}>Belum ada transaksi</td></tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="border-b">
                        <td className="p-2">{new Date(h.tanggal || h.created_at).toLocaleDateString()}</td>
                        <td className="p-2">
                          {(() => {
                            const b = barangMap.get(String(h.id_barang))
                            return b ? `${b.kode} - ${b.nama}` : h.id_barang
                          })()}
                        </td>
                        <td className="p-2 capitalize">{h.tipe_transaksi}</td>
                        <td className="p-2">{h.jumlah}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-4">Memuat transaksi...</div>}>
      <TransactionsPageContent />
    </Suspense>
  )
}
