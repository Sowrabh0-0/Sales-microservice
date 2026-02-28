/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { apiFetch } from "@/lib/api"

/* ================= TYPES ================= */

type OrderItem = {
  product_name: string
  quantity: number
  unit_price: number
}

type Order = {
  id: number
  customer_id: number
  items: OrderItem[]
  total: number
}

/* ================= HELPERS ================= */

const TAX_RATE = 0.18

function round(value: number) {
  return Math.round(value * 100) / 100
}

/* ================= PAGE ================= */

export default function CreateInvoicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState<string>("")

  const [discountType, setDiscountType] =
    useState<"NONE" | "FLAT" | "PERCENT">("NONE")
  const [discountValue, setDiscountValue] = useState(0)
  const [saving, setSaving] = useState(false)

  /* ================= CALCULATIONS ================= */

  const subtotal = order
    ? order.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )
    : 0

  const tax = round(subtotal * TAX_RATE)

  let discountAmount = 0
  if (discountType === "FLAT") discountAmount = discountValue
  if (discountType === "PERCENT") {
    discountAmount = round((subtotal * discountValue) / 100)
  }
  if (discountAmount > subtotal) discountAmount = subtotal

  const total = round(subtotal + tax - discountAmount)

  /* ---------- reset discount value when NONE ---------- */
  useEffect(() => {
    if (discountType === "NONE") {
      setDiscountValue(0)
    }
  }, [discountType])

  /* ================= LOAD ORDER ================= */

  useEffect(() => {
    if (!id) return

    async function loadOrder() {
      try {
        setLoading(true)
        const orderData = await apiFetch<Order>(`/orders/${id}`)
        setOrder(orderData)
        const customerData = await apiFetch<{ id: number; name: string }>(
          `/customers/${orderData.customer_id}`
        )
        setCustomerName(customerData.name)
      } catch (err: any) {
        toast.error(err.message)
        router.push("/orders")
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [id, router])

  /* ================= CREATE INVOICE ================= */

  async function handleCreateInvoice() {
    if (!id) return

    try {
      setSaving(true)

      await apiFetch(`/invoices/orders/${id}`, {
        method: "POST",
        body: JSON.stringify({
          discount_type: discountType === "NONE" ? null : discountType,
          discount_value: discountValue,
        }),
      })

      toast.success("Invoice created successfully")
      router.push("/invoices")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* HEADER */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-semibold">Create Invoice</h1>
        <p className="text-muted-foreground">
          Order #{order.id} • {customerName}
        </p>
      </div>

      {/* INVOICE CARD */}
      <div className="rounded-xl border bg-background shadow-sm p-8 space-y-8">
        {/* ITEMS */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {item.unit_price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {(item.quantity * item.unit_price).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* DISCOUNT */}
        <div className="rounded-lg border p-6 space-y-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Discount
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="FLAT">Flat</SelectItem>
                  <SelectItem value="PERCENT">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Discount Value</Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(+e.target.value)}
                disabled={discountType === "NONE"}
                placeholder={
                  discountType === "PERCENT" ? "Percentage %" : "Amount"
                }
              />
            </div>
          </div>
        </div>

        {/* TOTALS (LIVE PREVIEW) */}
        <div className="ml-auto max-w-sm space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax (18%)</span>
            <span>{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>- {discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t pt-3">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.push("/orders")}>
            Cancel
          </Button>
          <Button onClick={handleCreateInvoice} disabled={saving}>
            {saving ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  )
}
