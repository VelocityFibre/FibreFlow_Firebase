import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - Velocity Fibre",
  description: "Login to the Velocity Fibre Stock Management Portal",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
