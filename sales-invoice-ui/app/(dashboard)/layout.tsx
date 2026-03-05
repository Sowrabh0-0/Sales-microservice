"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Spinner } from "@/components/ui/spinner"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const { token, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {

    if (!loading && !token) {
      router.replace("/auth/login")
    }

  }, [loading, token, router])


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (!token) return null


  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col min-h-screen">

        <SiteHeader />

        <div className="flex flex-1">

          <AppSidebar />

          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {children}
            </div>
          </SidebarInset>

        </div>

      </SidebarProvider>
    </div>
  )
}