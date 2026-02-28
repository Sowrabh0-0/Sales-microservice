/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Filter } from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"


/* ================= TYPES ================= */

type Customer = {
    id: number
    name: string
}

type Invoice = {
    id: number
    order_id: number
    subtotal: number
    tax: number
    total: number
    status: string
    due_date: string
    created_at: string
}

/* ================= PAGE ================= */

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)

    /* pagination */
    const [page, setPage] = useState(1)
    const limit = 20

    /* refund */
    const [refundOpen, setRefundOpen] = useState(false)
    const [refundTarget, setRefundTarget] = useState<Invoice | null>(null)
    const [refundReason, setRefundReason] = useState("")
    const [refunding, setRefunding] = useState(false)



    /* filters */
    const [filterOpen, setFilterOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [customerFilter, setCustomerFilter] = useState<string | null>(null)
    const router = useRouter()


    /* ================= LOAD DATA ================= */

    async function loadInvoices(currentPage = page) {
        try {
            setLoading(true)

            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(limit),
            })

            if (statusFilter) params.append("status", statusFilter)
            if (customerFilter) params.append("customer_id", customerFilter)

            const [invoiceData, customerData] = await Promise.all([
                apiFetch<Invoice[]>(`/invoices?${params.toString()}`),
                apiFetch<Customer[]>("/customers"),
            ])

            setInvoices(invoiceData)
            setCustomers(customerData)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInvoices()
    }, [page, statusFilter, customerFilter])

    /* ================= CANCEL ================= */

    async function cancelInvoice(id: number) {
        try {
            const updated = await apiFetch<Invoice>(`/invoices/${id}/cancel`, {
                method: "POST",
            })

            setInvoices(prev =>
                prev.map(i => (i.id === updated.id ? updated : i))
            )

            toast.success("Invoice cancelled")
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    async function handleRefund() {
        if (!refundTarget) return

        try {
            setRefunding(true)

            await apiFetch(`/refunds/invoice/${refundTarget.id}`, {
                method: "POST",
                body: JSON.stringify({
                    amount: refundTarget.total, // 🔒 locked amount
                    reason: refundReason || null,
                }),
            })

            toast.success("Invoice refunded successfully")

            setInvoices((prev) =>
                prev.map((i) =>
                    i.id === refundTarget.id
                        ? { ...i, status: "REFUNDED" }
                        : i
                )
            )

            setRefundOpen(false)
            setRefundTarget(null)
            setRefundReason("")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setRefunding(false)
        }
    }

    /* ================= RENDER ================= */

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold">Invoices</h1>
                    <p className="text-muted-foreground">Manage invoices</p>
                </div>

                <Button variant="outline" onClick={() => setFilterOpen(true)}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                </Button>
            </div>

            {/* TABLE */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading &&
                            invoices.map(inv => (
                                <TableRow key={inv.id}>
                                    <TableCell>{inv.id}</TableCell>
                                    <TableCell>#{inv.order_id}</TableCell>
                                    <TableCell>{inv.total.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-medium
                        ${inv.status === "UNPAID"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : inv.status === "PAID"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {inv.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>{inv.due_date}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {/* VIEW INVOICE */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/invoices/${inv.id}`)}
                                        >
                                            View
                                        </Button>
                                        {(inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID") && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => router.push(`/invoices/${inv.id}/pay`)}
                                            >
                                                Add Payment
                                            </Button>
                                        )}
                                        {inv.status === "PAID" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setRefundTarget(inv)
                                                    setRefundOpen(true)
                                                }}
                                            >
                                                Refund
                                            </Button>
                                        )}
                                        {/* CANCEL INVOICE */}
                                        {inv.status === "UNPAID" && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => cancelInvoice(inv.id)}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </TableCell>

                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION */}
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={e => {
                                e.preventDefault()
                                if (page > 1) setPage(p => p - 1)
                            }}
                        />
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationLink href="#" isActive>
                            {page}
                        </PaginationLink>
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={e => {
                                e.preventDefault()
                                if (invoices.length === limit) {
                                    setPage(p => p + 1)
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

            {/* FILTER DIALOG */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Filters</DialogTitle>
                    </DialogHeader>

                    <Select
                        value={statusFilter ?? "ALL"}
                        onValueChange={v => setStatusFilter(v === "ALL" ? null : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="UNPAID">UNPAID</SelectItem>
                            <SelectItem value="PAID">PAID</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={customerFilter ?? "ALL"}
                        onValueChange={v => setCustomerFilter(v === "ALL" ? null : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Customer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        onClick={() => {
                            setStatusFilter(null)
                            setCustomerFilter(null)
                            setPage(1)
                            setFilterOpen(false)
                        }}
                    >
                        Clear Filters
                    </Button>
                </DialogContent>
            </Dialog>


            <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Refund Invoice</DialogTitle>
                    </DialogHeader>

                    {refundTarget && (
                        <div className="space-y-4">
                            {/* INFO */}
                            <div className="rounded-md border p-4 text-sm space-y-1">
                                <p>
                                    <strong>Invoice:</strong> #{refundTarget.id}
                                </p>
                                <p>
                                    <strong>Refund Amount:</strong>{" "}
                                    {refundTarget.total.toFixed(2)}
                                </p>
                            </div>

                            {/* REASON */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Refund Reason</label>
                                <textarea
                                    className="w-full rounded-md border p-2 text-sm"
                                    rows={3}
                                    placeholder="Optional reason for refund"
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                />
                            </div>

                            {/* ACTIONS */}
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setRefundOpen(false)
                                        setRefundTarget(null)
                                        setRefundReason("")
                                    }}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    variant="destructive"
                                    disabled={refunding}
                                    onClick={handleRefund}
                                >
                                    {refunding ? "Refunding..." : "Confirm Refund"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
