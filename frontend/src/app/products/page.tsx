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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react"
import { barangAPI, usersAPI } from "@/lib/api"
import { toast } from "sonner"

export default function ProductsPage() {
  type Product = {
    id: string | number
    kode: string
    nama: string
    stok: number
    lokasi_rak: string
  }

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<{
    kode: string
    nama: string
    stok: number
    lokasi_rak: string
  }>({
    kode: "",
    nama: "",
    stok: 0,
    lokasi_rak: ""
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const colCount = isAdmin ? 5 : 4
  const searchTermRef = useRef("")

  const fetchProducts = useCallback(async (term?: string) => {
    try {
      setLoading(true)
      const data = await barangAPI.getAll({ search: term ?? searchTermRef.current })
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Gagal memuat data produk")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch products
  useEffect(() => {
    const init = async () => {
      try {
        const me = await usersAPI.me()
        setIsAdmin(me?.role === "admin")
      } catch (e) {
        console.error(e)
        setIsAdmin(false)
      } finally {
        await fetchProducts()
      }
    }
    void init()
  }, [fetchProducts])

  // Handle search
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    searchTermRef.current = e.target.value
  }

  // Handle form input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'stok' ? parseInt(value) : value
    })
  }

  // Add product
  const handleAddProduct = async () => {
    try {
      if (!isAdmin) {
        toast.error("Akses ditolak: hanya admin yang dapat menambah produk")
        return
      }
      await barangAPI.create(formData)
      setIsAddDialogOpen(false)
      setFormData({ kode: "", nama: "", stok: 0, lokasi_rak: "" })
      toast.success("Produk berhasil ditambahkan")
      void fetchProducts()
    } catch (error) {
      console.error("Error adding product:", error)
      toast.error("Gagal menambahkan produk")
    }
  }

  // Edit product
  const handleEdit = (product: Product) => {
    if (!isAdmin) {
      toast.error("Akses ditolak: hanya admin yang dapat mengedit produk")
      return
    }
    setCurrentProduct(product)
    setFormData({
      kode: product.kode,
      nama: product.nama,
      stok: product.stok,
      lokasi_rak: product.lokasi_rak
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateProduct = async () => {
    try {
      if (!isAdmin) {
        toast.error("Akses ditolak: hanya admin yang dapat memperbarui produk")
        return
      }
      if (!currentProduct) {
        toast.error("Produk tidak ditemukan")
        return
      }
      await barangAPI.update(currentProduct.id, formData)
      setIsEditDialogOpen(false)
      toast.success("Produk berhasil diperbarui")
      void fetchProducts()
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Gagal memperbarui produk")
    }
  }

  // Delete product
  const handleDelete = (product: Product) => {
    if (!isAdmin) {
      toast.error("Akses ditolak: hanya admin yang dapat menghapus produk")
      return
    }
    setCurrentProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      if (!isAdmin) {
        toast.error("Akses ditolak: hanya admin yang dapat menghapus produk")
        return
      }
      if (!currentProduct) {
        toast.error("Produk tidak ditemukan")
        return
      }
      await barangAPI.delete(currentProduct.id)
      setIsDeleteDialogOpen(false)
      toast.success("Produk berhasil dihapus")
      void fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Gagal menghapus produk")
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
                  <BreadcrumbPage>Produk</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Daftar Produk</h1>
            {isAdmin && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <LuPlus className="mr-2 h-4 w-4" />
                Tambah Produk
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <LuSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void fetchProducts()
                  }
                }}
              />
            </div>
            <Button variant="outline" onClick={() => void fetchProducts()}>Cari</Button>
          </div>
          
          <Card>
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Lokasi Rak</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-4">Memuat data...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-4">Tidak ada data produk</TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.kode}</TableCell>
                    <TableCell className="font-medium">{product.nama}</TableCell>
                    <TableCell>{product.stok}</TableCell>
                    <TableCell>{product.lokasi_rak}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(product)}>Hapus</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </Card>
        </div>
      </SidebarInset>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kode" className="text-right">Kode</Label>
              <Input
                id="kode"
                name="kode"
                value={formData.kode}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nama" className="text-right">Nama</Label>
              <Input
                id="nama"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stok" className="text-right">Stok</Label>
              <Input
                id="stok"
                name="stok"
                type="number"
                value={formData.stok}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lokasi_rak" className="text-right">Lokasi Rak</Label>
              <Input
                id="lokasi_rak"
                name="lokasi_rak"
                value={formData.lokasi_rak}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAddProduct} disabled={!isAdmin}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-kode" className="text-right">Kode</Label>
              <Input
                id="edit-kode"
                name="kode"
                value={formData.kode}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nama" className="text-right">Nama</Label>
              <Input
                id="edit-nama"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stok" className="text-right">Stok</Label>
              <Input
                id="edit-stok"
                name="stok"
                type="number"
                value={formData.stok}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-lokasi_rak" className="text-right">Lokasi Rak</Label>
              <Input
                id="edit-lokasi_rak"
                name="lokasi_rak"
                value={formData.lokasi_rak}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateProduct} disabled={!isAdmin}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Apakah Anda yakin ingin menghapus produk &quot;{currentProduct?.nama}&quot;?</p>
            <p className="text-sm text-muted-foreground mt-2">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={!isAdmin}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
