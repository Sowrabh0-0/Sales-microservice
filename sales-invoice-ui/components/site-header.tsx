"use client"

import { SidebarIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme_toggle"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const pathname = usePathname()

  /* ================= BREADCRUMB LOGIC ================= */


let parentLabel = "Dashboard"
let parentHref = "/"
let pageLabel = "Overview"

// Customers
if (pathname.startsWith("/customers")) {
  parentLabel = "Customers"
  parentHref = "/customers"
  pageLabel = "Manage Customers"
}

// Orders list
if (pathname === "/orders") {
  parentLabel = "Orders"
  parentHref = "/orders"
  pageLabel = "Manage Orders"
}

// Orders → Create Invoice
if (pathname.startsWith("/orders/create-invoice")) {
  const orderId = pathname.split("/")[2]

  parentLabel = "Orders"
  parentHref = "/orders"
  pageLabel = orderId
    ? `Create Invoice for Order #${orderId}`
    : "Create Invoice"
}

// Invoices list
if (pathname === "/invoices") {
  parentLabel = "Invoices"
  parentHref = "/invoices"
  pageLabel = "All Invoices"
}

// Invoice view page: /invoices/[id]
if (/^\/invoices\/\d+$/.test(pathname)) {
  const invoiceId = pathname.split("/")[2]

  parentLabel = "Invoices"
  parentHref = "/invoices"
  pageLabel = `Invoice #${invoiceId}`
}

// Invoice → Pay page: /invoices/[id]/pay
if (/^\/invoices\/\d+\/pay$/.test(pathname)) {
  const invoiceId = pathname.split("/")[2]

  parentLabel = "Invoices"
  parentHref = `/invoices/${invoiceId}`
  pageLabel = `Add Payment (Invoice #${invoiceId})`
}

  /* ==================================================== */

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-[var(--header-height)] w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>

        <Separator orientation="vertical" className="mr-2 h-4" />

        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={parentHref}>
                {parentLabel}
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
