"use client"

import type React from "react"

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simple authentication check
    if ((email === "admin" || email === "admin@velocity.com") && password === "admin") {
      // Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Store login state (in a real app, you'd use proper authentication)
      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("userEmail", email)

      // Redirect to dashboard
      router.push("/")
    } else {
      setError("Invalid credentials. Use admin/admin to login.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader className="flex flex-col items-center gap-2">
            <div className="relative w-full h-24 mb-4">
              <Image
                src="/images/velocity-logo.jpeg"
                alt="Velocity Fibre Logo"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
            <div className="grid gap-2">
              <Label htmlFor="email">Email or Username</Label>
              <Input
                id="email"
                type="text"
                placeholder="admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">Demo credentials: admin / admin</div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
