"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { barangAPI } from "@/lib/api"
import Link from "next/link"
import { toast } from "sonner"

type Barang = { id: string | number; kode: string; nama: string; stok: number; lokasi_rak: string | null }

export default function LowStockPage() {
  const [items, setItems] = useState<Barang[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState<number>(10)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
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

  const lowStockItems = useMemo(() => items.filter((it) => Number(it.stok) <= threshold), [items, threshold])

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
                  <BreadcrumbPage>Stok Menipis</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Stok Menipis</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm">Batas stok</span>
              <Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value || "0", 10))} className="w-24" />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Lokasi Rak</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Memuat data...</TableCell>
                  </TableRow>
                ) : lowStockItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Tidak ada produk dengan stok di bawah batas</TableCell>
                  </TableRow>
                ) : (
                  lowStockItems.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.kode}</TableCell>
                      <TableCell className="font-medium">{product.nama}</TableCell>
                      <TableCell>{product.stok}</TableCell>
                      <TableCell>{product.lokasi_rak}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" asChild>
                          <Link href={`/transactions?id_barang=${product.id}&tipe=masuk`}>Tambah Stok</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
