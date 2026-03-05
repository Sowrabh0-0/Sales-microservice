"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

import { Input } from "@/components/ui/input"


function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const router = useRouter()
  const { login } = useAuth()

  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)


  function handleOrgNameChange(value: string) {
    setOrgName(value)

    const slug = generateSlug(value)
    setOrgSlug(slug)
  }


  function handleSlugChange(value: string) {
    const normalized = generateSlug(value)
    setOrgSlug(normalized)
  }


  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault()

    setLoading(true)

    try {

      const res = await apiFetch<{ access_token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          organization_name: orgName,
          organization_slug: orgSlug,
          email,
          password,
        }),
      })

      login(res.access_token)

      router.push("/")

    } catch (err: any) {
      alert(err.message)
    }

    setLoading(false)
  }


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>

      <Card>

        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription>
            Start your organization workspace
          </CardDescription>
        </CardHeader>

        <CardContent>

          <form onSubmit={handleSubmit}>

            <FieldGroup>

              <Field>
                <FieldLabel htmlFor="orgName">Organization Name</FieldLabel>
                <Input
                  id="orgName"
                  placeholder="DevOps Team"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="orgSlug">Organization Slug</FieldLabel>
                <Input
                  id="orgSlug"
                  placeholder="devops-team"
                  value={orgSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                />
                <FieldDescription>
                  Used in login and URLs.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              <Field>

                <Button className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign up"}
                </Button>

                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <a
                    href="/auth/login"
                    className="underline underline-offset-4"
                  >
                    Login
                  </a>
                </FieldDescription>

              </Field>

            </FieldGroup>

          </form>

        </CardContent>

      </Card>

    </div>
  )
}