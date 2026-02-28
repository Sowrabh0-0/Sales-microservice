/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import { apiFetch } from "@/lib/api"

/* ================= TYPES ================= */

type OrderItem = {
    product_name: string
    quantity: number
    unit_price: number
}

type Order = {
    id: number
    customer: {
        id: number
        name: string
    }
    items: OrderItem[]
}

type Invoice = {
    id: number
    order_id: number
    subtotal: number
    tax: number
    total: number
    status: string
    due_date: string
    discount_type?: string
    discount_value: number
    created_at: string
}

type Payment = {
    id: number
    invoice_id: number
    amount: number
    payment_method: string
    paid_at: string
    note?: string | null
}

/* ================= PAGE ================= */

export default function InvoiceViewPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [order, setOrder] = useState<Order | null>(null)
    const [payments, setPayments] = useState<Payment[]>([])

    const [loading, setLoading] = useState(true)
    const [loadingPayments, setLoadingPayments] = useState(true)
    const [canceling, setCanceling] = useState(false)

    /* ================= LOAD DATA ================= */

    useEffect(() => {
        async function load() {
            try {
                const inv = await apiFetch<Invoice>(`/invoices/${id}`)
                setInvoice(inv)

                const ord = await apiFetch<Order>(`/orders/${inv.order_id}`)
                setOrder(ord)

                const pay = await apiFetch<Payment[]>(
                    `/payments/invoice/${inv.id}`
                )
                setPayments(pay)
            } catch (err: any) {
                toast.error(err.message)
            } finally {
                setLoading(false)
                setLoadingPayments(false)
            }
        }

        load()
    }, [id])

    /* ================= ACTIONS ================= */

    async function cancelInvoice() {
        if (!invoice) return

        try {
            setCanceling(true)
            const updated = await apiFetch<Invoice>(
                `/invoices/${invoice.id}/cancel`,
                { method: "POST" }
            )
            setInvoice(updated)
            toast.success("Invoice cancelled")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setCanceling(false)
        }
    }

    /* ================= HELPERS ================= */

    function getInvoiceStatusClass(status: string) {
        switch (status) {
            case "PAID":
                return "bg-green-100 text-green-800"
            case "CANCELLED":
            case "REFUNDED":
                return "bg-red-100 text-red-800"
            default:
                return "bg-yellow-100 text-yellow-800"
        }
    }

    function getPaymentBadgeClass(method: string) {
        switch (method) {
            case "CASH":
                return "bg-gray-100 text-gray-800 border-gray-300"
            case "CARD":
                return "bg-blue-100 text-blue-800 border-blue-300"
            case "UPI":
                return "bg-green-100 text-green-800 border-green-300"
            case "BANK_TRANSFER":
                return "bg-purple-100 text-purple-800 border-purple-300"
            case "REFUND":
                return "bg-red-100 text-red-800 border-red-300"
            default:
                return "bg-muted text-muted-foreground"
        }
    }

    /* ================= LOADING ================= */

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (!invoice) return null

    /* ================= RENDER ================= */

    return (
        <div className="mx-auto max-w-6xl px-6 lg:px-8 space-y-10">

            {/* HEADER + STATUS */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Invoice #{invoice.id}
                    </h1>
                    <p className="text-muted-foreground">
                        Order #{invoice.order_id}
                        {order && ` • ${order.customer.name}`}
                    </p>
                </div>

                <Badge className={getInvoiceStatusClass(invoice.status)}>
                    {invoice.status}
                </Badge>
            </div>

            {/* META */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground">Created</p>
                    <p>{new Date(invoice.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p>{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p>
                        {invoice.discount_type
                            ? `${invoice.discount_type} (${invoice.discount_value})`
                            : "—"}
                    </p>
                </div>
            </div>

            {/* ITEMS */}
            <div className="rounded-md border">
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
                        {order?.items.map((item, i) => (
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
            </div>

            {/* SUMMARY */}
            <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{invoice.tax.toFixed(2)}</span>
                    </div>
                    {invoice.discount_type && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>Discount</span>
                            <span>-{invoice.discount_value}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total</span>
                        <span>{invoice.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* PAYMENTS */}
            <div className="space-y-2">
                <h2 className="text-lg font-semibold">Payment Transactions</h2>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingPayments && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-6 text-center">
                                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loadingPayments && payments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                        No payments recorded
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loadingPayments &&
                                payments.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            {new Date(p.paid_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`font-medium ${getPaymentBadgeClass(p.payment_method)}`}
                                            >
                                                {p.payment_method}
                                            </Badge>
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-medium ${p.amount < 0 ? "text-red-600" : "text-green-600"
                                                }`}
                                        >
                                            {p.amount < 0 ? "-" : ""}
                                            {Math.abs(p.amount).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.push("/invoices")}>
                    Back to Invoices
                </Button>

                {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                    <Button
                        variant="destructive"
                        onClick={cancelInvoice}
                        disabled={canceling}
                    >
                        {canceling ? "Cancelling..." : "Cancel Invoice"}
                    </Button>
                )}
            </div>
        </div>
    )
}
