"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle } from "lucide-react"
import { barangAPI } from "@/lib/api"

type Product = {
  id: string
  kode: string
  nama: string
  stok: number
  lokasi_rak?: string | null
  updated_at?: string | null
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const data = await barangAPI.getAll()
        if (mounted) setProducts(data as Product[])
      } catch (e) {
        console.error("Error memuat data dashboard:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const totalProduk = products.length
  const totalStok = useMemo(() => products.reduce((sum, p) => sum + (Number(p.stok) || 0), 0), [products])
  const lowStockCount = useMemo(() => products.filter((p) => (Number(p.stok) || 0) <= 10).length, [products])
  const outOfStockCount = useMemo(() => products.filter((p) => (Number(p.stok) || 0) === 0).length, [products])

  const recentUpdates = useMemo(() => {
    return [...products]
      .filter((p) => !!p.updated_at)
      .sort((a, b) => {
        const ta = new Date(a.updated_at || 0).getTime()
        const tb = new Date(b.updated_at || 0).getTime()
        return tb - ta
      })
      .slice(0, 5)
  }, [products])

  const topByStok = useMemo(() => {
    return [...products]
      .sort((a, b) => (Number(b.stok) || 0) - (Number(a.stok) || 0))
      .slice(0, 5)
  }, [products])

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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "-" : totalProduk}</div>
                <p className="text-xs text-muted-foreground">Jumlah item unik</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "-" : totalStok}</div>
                <p className="text-xs text-muted-foreground">Akumulasi unit stok</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stok Menipis (≤10)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "-" : lowStockCount}</div>
                <p className="text-xs text-muted-foreground">Perlu segera diisi ulang</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stok Habis</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "-" : outOfStockCount}</div>
                <p className="text-xs text-muted-foreground">Butuh restock</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Aktivitas Terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Memuat...</div>
                  ) : recentUpdates.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Belum ada aktivitas</div>
                  ) : (
                    recentUpdates.map((p) => (
                      <div key={p.id} className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-muted/50" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.nama}</p>
                          <p className="text-xs text-muted-foreground">
                            Kode {p.kode} • Stok {p.stok}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.updated_at ? new Date(p.updated_at).toLocaleString() : "-"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Stok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Memuat...</div>
                  ) : topByStok.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Tidak ada data</div>
                  ) : (
                    topByStok.map((p) => (
                      <div key={p.id} className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded bg-muted/50" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.nama}</p>
                          <p className="text-xs text-muted-foreground">Kode {p.kode}</p>
                        </div>
                        <div className="text-xs font-medium">{p.stok} unit</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}