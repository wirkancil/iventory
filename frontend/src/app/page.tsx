"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LuPackage } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Import supabase client secara dinamis untuk menghindari error SSR
      const { signInWithEmail } = await import("@/lib/supabase")

      // Login dengan Supabase dan simpan access_token
      const { session } = await signInWithEmail(email, password)
      const token = session?.access_token
      if (!token) {
        throw new Error("Login gagal, token tidak ditemukan")
      }
      localStorage.setItem("token", token)
      
      toast.success("Login berhasil")
      router.push("/dashboard")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("Login error:", err)
      toast.error(message || "Login gagal, cek email dan password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="flex justify-center">
            <LuPackage className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventori</h1>
          <p className="text-sm text-muted-foreground">
            Masuk ke akun Anda untuk mengelola inventori
          </p>
        </div>
        <Card>
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Masukkan email dan password Anda untuk melanjutkan
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nama@perusahaan.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link href="#" className="hover:text-brand underline underline-offset-4">
            Tidak punya akun? Hubungi administrator
          </Link>
        </p>
      </div>
    </div>
  )
}
