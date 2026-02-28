"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type Invoice = {
    id: number
    total: number
    status: string
}

type Payment = {
    id: number
    amount: number
    payment_method: string
    paid_at: string
}

/* ================= PAGE ================= */

export default function AddPaymentPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [amount, setAmount] = useState(0)
    const [method, setMethod] =
        useState<"CASH" | "CARD" | "UPI" | "BANK_TRANSFER">("CASH")

    /* ================= LOAD DATA ================= */

    useEffect(() => {
        async function load() {
            try {
                const inv = await apiFetch<Invoice>(`/invoices/${id}`)
                const pays = await apiFetch<Payment[]>(`/payments/invoice/${id}`)

                setInvoice(inv)
                setPayments(pays)
            } catch (err: any) {
                toast.error(err.message)
                router.push("/invoices")
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [id, router])

    /* ================= CALCULATIONS ================= */

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = invoice ? invoice.total - totalPaid : 0

    /* ================= CREATE PAYMENT ================= */

    async function handlePay() {
        if (!invoice) return

        try {
            setSaving(true)

            await apiFetch("/payments", {
                method: "POST",
                body: JSON.stringify({
                    invoice_id: invoice.id,
                    amount,
                    payment_method: method,
                }),
            })

            toast.success("Payment added")
            router.push(`/invoices/${invoice.id}`)
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

    if (!invoice) return null

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            {/* HEADER */}
            <div className="text-center">
                <h1 className="text-2xl font-semibold">
                    Add Payment
                </h1>
                <p className="text-muted-foreground">
                    Invoice #{invoice.id}
                </p>
            </div>

            {/* SUMMARY */}
            <div className="rounded-md border p-6 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Total</span>
                    <span>{invoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Paid</span>
                    <span>{totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Remaining</span>
                    <span>{remaining.toFixed(2)}</span>
                </div>
            </div>

            {/* EXISTING PAYMENTS */}
            {payments.length > 0 && (
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
                            {payments.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        {new Date(p.paid_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>{p.payment_method}</TableCell>
                                    <TableCell className="text-right">
                                        {p.amount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ADD PAYMENT */}
            <div className="rounded-md border p-6 space-y-6">
                <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={method} onValueChange={v => setMethod(v as any)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(+e.target.value)}
                        max={remaining}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/invoices`)}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handlePay}
                        disabled={saving || amount <= 0}
                    >
                        {saving ? "Processing..." : "Add Payment"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
