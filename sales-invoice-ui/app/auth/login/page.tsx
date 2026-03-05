"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {

  const router = useRouter()
  const { token, loading } = useAuth()

  useEffect(() => {

    if (!loading && token) {
      router.replace("/")
    }

  }, [token, loading, router])


  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }


  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">

        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Sales Inc.
        </a>

        <LoginForm />

      </div>
    </div>
  )
}